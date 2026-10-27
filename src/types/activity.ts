export type ActivityAction =
  | "content.create"
  | "content.update"
  | "content.publish"
  | "content.unpublish"
  | "content.delete"
  | "content.seo_update"
  | "media.upload"
  | "media.delete"
  | "user.create"
  | "user.roles_update"
  | "category.create"
  | "category.update"
  | "category.delete";

export type ActivityEntityType = "content" | "media" | "user" | "category";

/** { field: { from, to } } — only fields that actually changed. */
export type ActivityChanges = Record<string, { from: unknown; to: unknown }>;

export type ActivityLog = {
  id: string;
  actor_id: string | null;
  actor_email: string;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  entity_label: string | null;
  changes: ActivityChanges | null;
  created_at: Date;
};

/** Who performed the action. */
export type ActivityActor = {
  id: string;
  email: string;
};
