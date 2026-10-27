export type Role = {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
};

export type Permission = {
  id: string;
  key: string;
  description: string | null;
  created_at: Date;
};

/** Permission keys used in code checks */
export type PermissionKey =
  | "content.read"
  | "content.create"
  | "content.update"
  | "content.publish"
  | "content.delete"
  | "media.upload"
  | "seo.update"
  | "users.manage"
  | "roles.manage"
  | (string & {});
