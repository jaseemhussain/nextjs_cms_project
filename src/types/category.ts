export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
};
