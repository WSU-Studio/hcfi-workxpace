import { S3Client } from '@aws-sdk/client-s3';

export function getS3Region(): string {
  const region = process.env.AWS_REGION?.trim();
  if (!region) throw new Error('Set AWS_REGION');
  return region;
}

export function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET?.trim();
  if (!bucket) throw new Error('Set AWS_S3_BUCKET');
  return bucket;
}

/**
 * S3 client:
 * - explicit access keys when both are set (local dev / access-key setup)
 * - otherwise the default credential chain (EC2/ECS IAM role), used by the
 *   Hyundai ebudgeting bucket which only exposes region + bucket, no keys.
 */
export function getS3Client(): S3Client {
  const region = getS3Region();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  if (accessKeyId || secretAccessKey) {
    throw new Error(
      'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must both be set, or both be left empty to use the EC2 IAM role',
    );
  }

  return new S3Client({ region });
}

export function getS3PublicUrl(bucket: string, region: string, key: string) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
