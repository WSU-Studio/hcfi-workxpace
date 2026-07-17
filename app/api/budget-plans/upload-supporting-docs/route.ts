import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { isLocalFileStorageEnabled } from '@/lib/file-storage-mode';
import { saveLocalFile } from '@/lib/local-file-storage';
import { getS3Client, getS3PublicUrl } from '@/lib/s3';
import {
  buildLocalSupportingDocsUrl,
  parseSupportingDocsScope,
  resolveUploadOrigin,
  supportingDocsKeyPrefix,
} from '@/lib/supporting-docs-storage';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, '-');
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useLocal = isLocalFileStorageEnabled();
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;

    if (!useLocal && (!bucket || !region)) {
      return NextResponse.json(
        { error: 'AWS bucket configuration is missing' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const scope = parseSupportingDocsScope(formData.get('scope'));
    const keyPrefix = supportingDocsKeyPrefix(scope);
    const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 files are allowed per upload' },
        { status: 400 }
      );
    }

    const s3Client = useLocal ? null : getS3Client();
    const origin = useLocal ? resolveUploadOrigin(request) : null;

    const uploaded = await Promise.all(
      files.map(async (file) => {
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
          throw new Error(`File type is not allowed: ${file.name}`);
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(`File is too large (max 10MB): ${file.name}`);
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const key = `${keyPrefix}${Date.now()}-${randomUUID()}-${sanitizeFileName(file.name)}`;

        if (useLocal) {
          await saveLocalFile(key, fileBuffer);
          return {
            fileName: file.name,
            url: buildLocalSupportingDocsUrl(origin!, key),
          };
        }

        await s3Client!.send(
          new PutObjectCommand({
            Bucket: bucket!,
            Key: key,
            Body: fileBuffer,
            ContentType: file.type || 'application/octet-stream',
          })
        );

        return {
          fileName: file.name,
          url: getS3PublicUrl(bucket!, region!, key),
        };
      })
    );

    return NextResponse.json({ files: uploaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload files';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
