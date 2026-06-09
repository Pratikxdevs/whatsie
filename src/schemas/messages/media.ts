import { z } from 'zod';

const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
  'application/pdf',
  'text/plain',
] as const;

export const uploadMediaSchema = z.object({
  media: z.string().min(1, 'Media data is required'),
  mimeType: z.string().refine(
    (val) => allowedMimeTypes.includes(val as any),
    { message: 'Unsupported file type' }
  ),
  filename: z.string().max(255).optional(),
  caption: z.string().max(1000).optional(),
});

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;

export const ALLOWED_MIME_TYPES: readonly string[] = allowedMimeTypes;
export const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB
