import { z } from 'zod';

export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

export const permitDocumentSchema = z.object({
  filename: z.string().refine((val) => {
    const ext = val.split('.').pop()?.toLowerCase();
    return ext ? ALLOWED_FILE_EXTENSIONS.includes(ext) : false;
  }, {
    message: 'Only PDF or image files are allowed.'
  }),
  mimeType: z.string().optional().refine((val) => {
    if (!val) return true;
    return ALLOWED_MIME_TYPES.includes(val);
  }, {
    message: 'Only PDF or image files are allowed.'
  })
});

export const permitPathSchema = z.string().refine((val) => {
  const lowercase = val.toLowerCase();
  const hasAllowedExt = ALLOWED_FILE_EXTENSIONS.some(ext => lowercase.endsWith(`.${ext}`));
  const isPermitPath = lowercase.includes('/permit-');
  return hasAllowedExt && isPermitPath;
}, {
  message: 'Invalid document path or file type. Only PDF or image documents are allowed.'
});
