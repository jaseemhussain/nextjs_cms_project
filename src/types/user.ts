export type User = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

/** Public responses mein password_hash kabhi mat bhejo */
export type PublicUser = Omit<User, "password_hash">;
