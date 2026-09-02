import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { createBudgetRequestCommentNotifications } from '@/lib/budget-request-comment-notifications';
import { formatCommentBodyForDisplay, parseMentionUserIds } from '@/lib/budget-plan-comments';
import { getBudgetPlanUserRoleIds } from '@/lib/budget-plan-review-eligibility';
import { approvalLevelsOf } from '@/lib/approval-schema-snapshot';

export const dynamic = 'force-dynamic';

const MAX_BODY_LENGTH = 4000;

type CommentRow = {
  id: string;
  body: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    image: string | null;
    roleId: string;
    department: { name: string };
  };
  mentions: Array<{
    user: { id: string; name: string };
  }>;
};

async function loadApprovalRoleIds(requestId: string): Promise<Set<string>> {
  const request = await prisma.budgetRequest.findUnique({
    where: { id: requestId },
    select: {
      approvalSchemaSnapshot: true,
      approvalSchema: {
        select: {
          approvalLevels: { select: { roleId: true } },
        },
      },
    },
  });
  return new Set(approvalLevelsOf(request ?? {}).map((level) => level.roleId));
}

async function isApprovalStakeholder(userId: string, approvalRoleIds: Set<string>): Promise<boolean> {
  if (!approvalRoleIds.size) return false;
  const roleIds = await getBudgetPlanUserRoleIds(userId);
  return roleIds.some((roleId) => approvalRoleIds.has(roleId));
}

function serializeComment(comment: CommentRow, approvalRoleIds: Set<string>) {
  const mentionedUsers = comment.mentions.map((mention) => ({
    id: mention.user.id,
    name: mention.user.name,
  }));

  return {
    id: comment.id,
    body: comment.body,
    displayBody: formatCommentBodyForDisplay(comment.body),
    createdAt: comment.createdAt.toISOString(),
    user: {
      id: comment.user.id,
      name: comment.user.name,
      image: comment.user.image,
      departmentName: comment.user.department.name,
    },
    mentionedUsers,
    isApprovalComment: approvalRoleIds.has(comment.user.roleId),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const request = await prisma.budgetRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [comments, approvalRoleIds] = await Promise.all([
      prisma.budgetRequestComment.findMany({
        where: { budgetRequestId: id },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              roleId: true,
              department: { select: { name: true } },
            },
          },
          mentions: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
      loadApprovalRoleIds(id),
    ]);

    const serialized = await Promise.all(
      comments.map(async (comment) => {
        const base = serializeComment(comment as CommentRow, approvalRoleIds);
        const isApprovalStakeholderComment = await isApprovalStakeholder(comment.user.id, approvalRoleIds);
        return {
          ...base,
          isApprovalComment: base.isApprovalComment || isApprovalStakeholderComment,
        };
      }),
    );

    return NextResponse.json({ comments: serialized, total: serialized.length });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const rawBody = typeof body.body === 'string' ? body.body.trim() : '';

    if (!rawBody) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }
    if (rawBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: `Comment must be at most ${MAX_BODY_LENGTH} characters` }, { status: 400 });
    }

    const budgetRequest = await prisma.budgetRequest.findUnique({
      where: { id },
      select: { id: true, code: true },
    });
    if (!budgetRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const mentionUserIds = parseMentionUserIds(rawBody);
    const validMentionUsers = mentionUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: mentionUserIds }, isActive: true },
          select: { id: true },
        })
      : [];
    const validMentionIds = validMentionUsers.map((user) => user.id);

    const comment = await prisma.budgetRequestComment.create({
      data: {
        budgetRequestId: id,
        userId: session.user.id,
        body: rawBody,
        mentions: validMentionIds.length
          ? {
              create: validMentionIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            roleId: true,
            department: { select: { name: true } },
          },
        },
        mentions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    const actorName = comment.user.name;
    await createBudgetRequestCommentNotifications({
      requestId: id,
      requestCode: budgetRequest.code,
      actorUserId: session.user.id,
      actorName,
      body: formatCommentBodyForDisplay(rawBody),
      mentionedUserIds: validMentionIds,
    });

    const approvalRoleIds = await loadApprovalRoleIds(id);
    const serialized = serializeComment(comment as CommentRow, approvalRoleIds);
    const isApprovalStakeholderComment = await isApprovalStakeholder(comment.user.id, approvalRoleIds);

    return NextResponse.json(
      {
        comment: {
          ...serialized,
          isApprovalComment: serialized.isApprovalComment || isApprovalStakeholderComment,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
