import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getEnv } from "./env";

let cachedClient: S3Client | null = null;

function getImageStorageConfig() {
  const env = getEnv();

  if (
    !env.S3_BUCKET ||
    !env.S3_REGION ||
    !env.S3_ACCESS_KEY_ID ||
    !env.S3_SECRET_ACCESS_KEY ||
    !env.S3_PUBLIC_BASE_URL
  ) {
    throw new Error("S3 image storage is not configured");
  }

  return {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    publicBaseUrl: env.S3_PUBLIC_BASE_URL.replace(/\/$/, ""),
  };
}

function getS3Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getImageStorageConfig();
  cachedClient = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

export async function uploadGameTitleImageToS3(input: {
  gameTitleId: string;
  buffer: Buffer;
  contentType: string;
}) {
  const config = getImageStorageConfig();
  const key = `game-titles/${input.gameTitleId}/${Date.now()}-${randomUUID()}.webp`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${config.publicBaseUrl}/${key}`;
}

export async function uploadAnnouncementImageToS3(input: {
  announcementId: string;
  buffer: Buffer;
  contentType: string;
}) {
  const config = getImageStorageConfig();
  const key = `announcements/${input.announcementId}/${Date.now()}-${randomUUID()}.webp`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${config.publicBaseUrl}/${key}`;
}
