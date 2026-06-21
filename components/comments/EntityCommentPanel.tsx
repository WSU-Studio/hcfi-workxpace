'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Loader2, Send, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCommentDateTime, serializeMention } from '@/lib/budget-plan-comments';
import {
  getMultiStepApprovalProgress,
  getRequestStatusDisplay,
  type BudgetPlanHistoryEntry,
} from '@/lib/budget-plan-approval-display';
import { cn } from '@/lib/utils';

export type CommentEntityBasePath = 'budget-plans' | 'budget-requests';

type MentionableUser = {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: { name: string };
};

type CommentItem = {
  id: string;
  displayBody: string;
  createdAt: string;
  isApprovalComment: boolean;
  user: {
    id: string;
    name: string;
    image: string | null;
    departmentName: string;
  };
  mentionedUsers: Array<{ id: string; name: string }>;
};

type ApprovalLevel = {
  stepOrder: number;
  levelType: string;
  role: { roleName: string } | null;
};

export interface EntityCommentPanelProps {
  entityBasePath: CommentEntityBasePath;
  entityId: string;
  requestStatus: string;
  approvalLevels?: ApprovalLevel[];
  histories?: BudgetPlanHistoryEntry[];
  inputId?: string;
}

type PanelTab = 'comment' | 'approval';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function renderCommentBody(displayBody: string, mentionedUsers: Array<{ id: string; name: string }>) {
  if (!mentionedUsers.length) return displayBody;

  const mentionNames = mentionedUsers
    .map((user) => user.name)
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (!mentionNames.length) return displayBody;

  const pattern = new RegExp(`@(${mentionNames.join('|')})`, 'g');
  const parts = displayBody.split(pattern);

  return parts.map((part, index) => {
    const mentioned = mentionedUsers.find((user) => user.name === part);
    if (mentioned) {
      return (
        <span key={`${mentioned.id}-${index}`} className="font-medium text-blue-700">
          @{part}
        </span>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

export default function EntityCommentPanel({
  entityBasePath,
  entityId,
  requestStatus,
  approvalLevels = [],
  histories = [],
  inputId = 'entity-comment-input',
}: EntityCommentPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('comment');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState('');
  const [mentionMap, setMentionMap] = useState<Record<string, string>>({});
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionableUser[]>([]);
  const [isSearchingMentions, setIsSearchingMentions] = useState(false);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const commentsApiBase = `/api/${entityBasePath}/${entityId}/comments`;

  const statusDisplay = useMemo(() => getRequestStatusDisplay(requestStatus), [requestStatus]);
  const stepProgresses = useMemo(
    () => getMultiStepApprovalProgress(approvalLevels, histories),
    [approvalLevels, histories],
  );

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(commentsApiBase, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load comments');
      const data = await response.json();
      setComments(data.comments ?? []);
    } catch {
      toast.error('Gagal memuat komentar');
    } finally {
      setIsLoading(false);
    }
  }, [commentsApiBase]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearchingMentions(true);
      try {
        const params = new URLSearchParams();
        if (mentionQuery) params.set('q', mentionQuery);
        const response = await fetch(
          `${commentsApiBase}/mentionable-users?${params.toString()}`,
          { credentials: 'include', signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (!response.ok) return;
        const data = await response.json();
        setMentionResults(data.users ?? []);
        setActiveMentionIndex(0);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingMentions(false);
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [commentsApiBase, mentionQuery]);

  const detectMentionQuery = (value: string, cursor: number) => {
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([^\s@[\]()]{0,40})$/);
    if (!match) {
      setMentionQuery(null);
      return;
    }
    setMentionQuery(match[1] ?? '');
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    detectMentionQuery(value, cursor);
  };

  const insertMention = (user: MentionableUser) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const beforeCursor = draft.slice(0, cursor);
    const afterCursor = draft.slice(cursor);
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex < 0) return;

    const prefix = draft.slice(0, atIndex);
    const mentionText = `@${user.name} `;
    const nextDraft = `${prefix}${mentionText}${afterCursor}`;
    setDraft(nextDraft);
    setMentionMap((prev) => ({ ...prev, [user.name]: user.id }));
    setMentionQuery(null);
    setMentionResults([]);

    window.requestAnimationFrame(() => {
      const nextCursor = prefix.length + mentionText.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const buildSubmitBody = (value: string) => {
    let body = value.trim();
    const sortedNames = Object.keys(mentionMap).sort((a, b) => b.length - a.length);
    for (const name of sortedNames) {
      const userId = mentionMap[name];
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      body = body.replace(new RegExp(`@${escaped}(?=\\s|$|[.,!?])`, 'g'), serializeMention(name, userId));
    }
    return body;
  };

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSubmitting) return;

    const submitBody = buildSubmitBody(trimmed);
    setIsSubmitting(true);
    try {
      const response = await fetch(commentsApiBase, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: submitBody }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to post comment');
      }
      if (data.comment) {
        setComments((prev) => [...prev, data.comment as CommentItem]);
      } else {
        await fetchComments();
      }
      setDraft('');
      setMentionMap({});
      setMentionQuery(null);
      toast.success('Komentar terkirim');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengirim komentar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveMentionIndex((prev) => (prev + 1) % mentionResults.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveMentionIndex((prev) => (prev - 1 + mentionResults.length) % mentionResults.length);
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        insertMention(mentionResults[activeMentionIndex]);
        return;
      }
      if (event.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey && mentionQuery === null) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] max-h-[calc(100vh-6.5rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex shrink-0 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('comment')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'comment'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Comment ({comments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('approval')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'approval'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Approval Info
        </button>
      </div>

      {activeTab === 'comment' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-white p-2 text-gray-500 shadow-sm">
                <ClipboardList className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-xs text-gray-500">Approval Status</p>
                <p className="text-sm font-semibold text-gray-900">{statusDisplay.label}</p>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-b border-gray-100 px-4 py-3">
            <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-gray-900">
              Comment
            </label>
            <div className="relative">
              <textarea
                id={inputId}
                ref={textareaRef}
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Enter your comment. Type @ to mention someone."
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />

              {mentionQuery !== null ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {isSearchingMentions ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Searching users...
                    </div>
                  ) : mentionResults.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">No users found</p>
                  ) : (
                    mentionResults.map((user, index) => (
                      <button
                        key={user.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          insertMention(user);
                        }}
                        className={cn(
                          'flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50',
                          index === activeMentionIndex && 'bg-blue-50',
                        )}
                      >
                        <span className="font-medium text-gray-900">{user.name}</span>
                        <span className="text-xs text-gray-500">
                          {user.department.name} · {user.employeeId}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!draft.trim() || isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Send
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No comments yet. Start the thread.</p>
            ) : (
              <ul className="space-y-4">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                      {comment.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.user.image}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : comment.user.name ? (
                        <span className="text-xs font-semibold">{getInitials(comment.user.name)}</span>
                      ) : (
                        <UserRound className="h-4 w-4" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {comment.isApprovalComment ? (
                          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Approval
                          </span>
                        ) : null}
                        <p className="text-sm font-semibold text-gray-900">
                          {comment.user.name}
                          <span className="font-normal text-gray-500"> ({comment.user.departmentName})</span>
                        </p>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
                        {renderCommentBody(comment.displayBody, comment.mentionedUsers)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">{formatCommentDateTime(comment.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Approval Status</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{statusDisplay.label}</p>
          </div>

          {approvalLevels.length === 0 ? (
            <p className="text-sm text-gray-500">No approval schema configured.</p>
          ) : (
            <div className="space-y-3">
              {approvalLevels.map((level, index) => {
                const progress = stepProgresses[index];
                return (
                  <div key={`${level.stepOrder}-${index}`} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        Step {level.stepOrder}: {level.role?.roleName ?? '-'}
                      </p>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          progress?.statusLabel === 'Approved' || progress?.statusLabel === 'Reviewed'
                            ? 'bg-green-100 text-green-800'
                            : progress?.statusLabel === 'Revision'
                              ? 'bg-amber-100 text-amber-800'
                              : progress?.statusLabel === 'Declined'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-700',
                        )}
                      >
                        {progress?.statusLabel ?? 'Pending'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{level.levelType}</p>
                    {progress?.actorName ? (
                      <p className="mt-2 text-xs text-gray-600">By {progress.actorName}</p>
                    ) : null}
                    {progress?.timestampLabel ? (
                      <p className="text-xs text-gray-400">{progress.timestampLabel}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
