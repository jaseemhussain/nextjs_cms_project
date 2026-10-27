export type Media = {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  uploaded_by: string;
  created_at: Date;
};

export type MediaWithUploader = Media & {
  uploader_name: string;
  uploader_email: string;
};
