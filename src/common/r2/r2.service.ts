import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
      throw new Error(
        'Missing R2 envs: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL',
      );
    }

    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  buildPublicUrl(key: string) {
    return `${this.publicBaseUrl}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  }

  async uploadObject(key: string, body: Buffer, contentType: string) {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(cmd);
    return true;
  }

  async deleteObject(key: string) {
    const cmd = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(cmd);
    return true;
  }
}
