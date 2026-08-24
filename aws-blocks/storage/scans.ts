import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { scanCandidateSchema, type ScanCandidate } from '../../shared/contracts';
import type { AiService } from '../ai/service';
import type { PantryEntity } from './schemas';

const imageContentTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

type ImageContentType = z.infer<typeof imageContentTypeSchema>;
type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif';

export interface ScanUploadHandle {
  upload(body: Blob | File | ArrayBuffer): Promise<void>;
  getUrl(): string;
}

export interface ScanBucket {
  createUploadHandle(
    path: string,
    options: { contentType: string; expiresIn: number },
  ): Promise<ScanUploadHandle>;
  get(path: string): Promise<{
    body: Buffer;
    contentType: string;
    metadata: Record<string, string>;
    size: number;
  } | null>;
}

export interface ScanTable {
  get(key: { userSub: string; entityId: string }): Promise<PantryEntity | null>;
  put(item: PantryEntity, options?: { ifNotExists: true }): Promise<void>;
}

export interface ScanRepository {
  createUpload(userSub: string, contentType: string): Promise<{
    scanId: string;
    upload: ScanUploadHandle;
  }>;
  analyze(userSub: string, scanId: string): Promise<ScanCandidate[]>;
}

function objectKeyFor(userSub: string, scanId: string): string {
  return `uploads/${encodeURIComponent(userSub)}/${scanId}`;
}

function formatFor(contentType: ImageContentType): ImageFormat {
  return contentType.slice('image/'.length) as ImageFormat;
}

export function createScanRepository(input: {
  table: ScanTable;
  bucket: ScanBucket;
  ai: AiService;
  now?: () => Date;
}): ScanRepository {
  const now = input.now ?? (() => new Date());

  return {
    async createUpload(userSub, contentType) {
      const parsedContentType = imageContentTypeSchema.parse(contentType);
      const scanId = randomBytes(16).toString('hex');
      const objectKey = objectKeyFor(userSub, scanId);
      const createdAt = now().getTime();
      await input.table.put({
        userSub,
        entityId: `SCAN#${scanId}`,
        entityType: 'SCAN',
        sortDate: createdAt,
        cleanupAt: Math.floor(createdAt / 1_000) + 86_400,
        scanId,
        objectKey,
        state: 'pending',
        createdAt,
        updatedAt: createdAt,
      }, { ifNotExists: true });

      const upload = await input.bucket.createUploadHandle(objectKey, {
        contentType: parsedContentType,
        expiresIn: 600,
      });
      return { scanId, upload };
    },

    async analyze(userSub, scanId) {
      const entityId = `SCAN#${scanId}`;
      const record = await input.table.get({ userSub, entityId });
      if (!record || record.entityType !== 'SCAN') throw new Error('Scan not found');

      const object = await input.bucket.get(objectKeyFor(userSub, scanId));
      if (!object) throw new Error('Uploaded image not found');
      if (object.size > MAX_IMAGE_BYTES) throw new Error('Uploaded image exceeds the 6 MB limit');
      const contentType = imageContentTypeSchema.parse(object.contentType);
      const analyzedAt = now();
      const candidates = (await input.ai.extractIngredients({
        bytes: object.body,
        format: formatFor(contentType),
        currentDate: analyzedAt.toISOString().slice(0, 10),
      })).map((candidate) => scanCandidateSchema.parse(candidate));

      await input.table.put({
        ...record,
        objectKey: objectKeyFor(userSub, scanId),
        state: 'complete',
        candidates,
        updatedAt: analyzedAt.getTime(),
      });
      return candidates;
    },
  };
}
