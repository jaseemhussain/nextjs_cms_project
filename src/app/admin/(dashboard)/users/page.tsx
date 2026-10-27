"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient, ApiClientError } from "@/lib/api-client";

type UserRow = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  roles: string[];
};

type Role = {
  id: string;
  name: string;
  description: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftRoles, setDraftRoles] = useState<Record<string, string[]>>({});

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoles, setNewRoles] = useState<string[]>(["viewer"]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient<{ users: UserRow[] }>("/api/users"),
        apiClient<{ roles: Role[] }>("/api/roles"),
      ]);
      setUsers(usersRes.users);
      setRoles(rolesRes.roles);
      const map: Record<string, string[]> = {};
      for (const u of usersRes.users) {
        map[u.id] = [...u.roles];
      }
      setDraftRoles(map);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleRole(userId: string, roleName: string) {
    setDraftRoles((prev) => {
      const current = prev[userId] ?? [];
      const next = current.includes(roleName)
        ? current.filter((r) => r !== roleName)
        : [...current, roleName];
      return { ...prev, [userId]: next };
    });
  }

  function toggleNewRole(roleName: string) {
    setNewRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    );
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      await apiClient("/api/users", {
        method: "POST",
        body: {
          name: newName,
          email: newEmail,
          password: newPassword,
          roles: newRoles,
        },
      });
      setMessage(`User created: ${newEmail}`);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRoles(["viewer"]);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function saveRoles(event: FormEvent, userId: string) {
    event.preventDefault();
    setSavingId(userId);
    setError(null);
    setMessage(null);
    try {
      await apiClient(`/api/users/${userId}/roles`, {
        method: "PUT",
        body: { roles: draftRoles[userId] ?? [] },
      });
      setMessage("Roles updated");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Access control"
        title="Users & roles"
        description="Admin can create teammates and assign roles that control what each person can do."
      />

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <Panel className="mb-6 p-5">
        <h2 className="text-base font-semibold text-foreground">Create user</h2>
        <p className="mt-1 text-sm text-muted">
          New accounts appear in this list. Password min 8 chars. Assign at least
          one role so they can use the CMS.
        </p>
        <form onSubmit={createUser} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold">Name</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 outline-none ring-brand/25 focus:ring-2"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold">Email</span>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 outline-none ring-brand/25 focus:ring-2"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold">Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                className="w-full rounded-lg border border-border px-3 py-2.5 outline-none ring-brand/25 focus:ring-2"
                required
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const checked = newRoles.includes(role.name);
              return (
                <label
                  key={role.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    checked
                      ? "border-brand bg-brand-soft text-brand-dark"
                      : "border-border bg-surface text-foreground hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-teal-700"
                    checked={checked}
                    onChange={() => toggleNewRole(role.name)}
                  />
                  <span className="font-medium">{role.name}</span>
                </label>
              );
            })}
          </div>

          <Button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create user"}
          </Button>
        </form>
      </Panel>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Panel key={user.id} className="p-5">
              <form onSubmit={(e) => saveRoles(e, user.id)}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="text-sm text-muted">{user.email}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wider text-brand">
                      {user.roles.length ? user.roles.join(" · ") : "no role"}
                    </p>
                  </div>
                  <Button type="submit" disabled={savingId === user.id}>
                    {savingId === user.id ? "Saving…" : "Save roles"}
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const checked = (draftRoles[user.id] ?? []).includes(
                      role.name
                    );
                    return (
                      <label
                        key={role.id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          checked
                            ? "border-brand bg-brand-soft text-brand-dark"
                            : "border-border bg-surface text-foreground hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-teal-700"
                          checked={checked}
                          onChange={() => toggleRole(user.id, role.name)}
                        />
                        <span className="font-medium">{role.name}</span>
                      </label>
                    );
                  })}
                </div>
              </form>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
