import { S3Client } from '@aws-sdk/client-s3';

type AwsCredentials = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function getAwsCredentials(): AwsCredentials {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS credential is not configured');
  }

  return { region, accessKeyId, secretAccessKey };
}

export function getS3Client() {
  const credentials = getAwsCredentials();

  return new S3Client({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

export function getS3PublicUrl(bucket: string, region: string, key: string) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
