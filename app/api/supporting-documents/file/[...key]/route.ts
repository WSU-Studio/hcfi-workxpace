import { GetObjectCommand, NoSuchKey, S3ServiceException } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { isLocalFileStorageEnabled } from '@/lib/file-storage-mode';
import { readLocalFile } from '@/lib/local-file-storage';
import { getS3Bucket, getS3Client } from '@/lib/s3';
import {
  contentTypeFromFileName,
  isSupportingDocsKey,
} from '@/lib/supporting-docs-storage';
import { supportingDocFileNameFromUrl } from '@/lib/supporting-docs';

export const dynamic = 'force-dynamic';

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) throw new Error('Empty S3 body');
  if (body instanceof Uint8Array) return Buffer.from(body);

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function fileResponse(buffer: Buffer, contentType: string, key: string) {
  const fileName = supportingDocFileNameFromUrl(key).replace(/["\r\n]/g, '');
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

/**
 * Authenticated proxy for supporting documents in local storage or private S3.
 * Browser → Workxpace → S3 GetObject through the server IAM role/VPC endpoint.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key: segments } = await params;
  if (!Array.isArray(segments) || segments.length < 2) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const key = segments.map((segment) => decodeURIComponent(segment)).join('/');
  if (!isSupportingDocsKey(key)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    if (isLocalFileStorageEnabled()) {
      const buffer = await readLocalFile(key);
      return fileResponse(buffer, contentTypeFromFileName(key), key);
    }

    const result = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: key,
      }),
    );
    const buffer = await bodyToBuffer(result.Body);
    return fileResponse(
      buffer,
      result.ContentType ?? contentTypeFromFileName(key),
      key,
    );
  } catch (error) {
    if (
      error instanceof NoSuchKey ||
      (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[supporting-documents] GetObject failed', { key, error });
    return NextResponse.json({ error: 'Failed to load document' }, { status: 502 });
  }
}
