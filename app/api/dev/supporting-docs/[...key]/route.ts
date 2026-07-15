import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { isLocalFileStorageEnabled } from '@/lib/file-storage-mode';
import { readLocalFile } from '@/lib/local-file-storage';
import {
  contentTypeFromFileName,
  isSupportingDocsKey,
} from '@/lib/supporting-docs-storage';

/**
 * Dev-only proxy untuk supporting docs lokal (`FILE_STORAGE=local`).
 * URL ini disimpan di BudgetPlan.supportingDocs saat upload di localhost.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  if (!isLocalFileStorageEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key: segments } = await params;
  if (!Array.isArray(segments) || segments.length < 2) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const key = segments.map((s) => decodeURIComponent(s)).join('/');
  if (!isSupportingDocsKey(key)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const buffer = await readLocalFile(key);
    const fileName = key.split('/').pop() ?? key;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentTypeFromFileName(fileName),
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `inline; filename="${fileName.replace(/"/g, '')}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
