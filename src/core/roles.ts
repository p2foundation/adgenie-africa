/**
 * Staff roles sit beside the RLS claim, never inside it. `auth.users.role`
 * stays the coarse Postgres role ("authenticated"); `app_role` is the job a
 * person does and is re-read from the database on every admin request.
 */
export const APP_ROLES = ["user", "manager", "admin", "super_admin", "root"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Higher may act on lower. Root can only be granted by the server script. */
export const ROLE_RANK: Record<AppRole, number> = {
  user: 0,
  manager: 1,
  admin: 2,
  super_admin: 3,
  root: 4,
};

/** The first role allowed through the admin door. */
export const STAFF_ROLE: AppRole = "manager";

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/** Unknown values collapse to `user`, the safe end of the ladder. */
export function normaliseAppRole(value: unknown): AppRole {
  return isAppRole(value) ? value : "user";
}

export function roleAtLeast(role: unknown, minimum: AppRole): boolean {
  return ROLE_RANK[normaliseAppRole(role)] >= ROLE_RANK[minimum];
}

export function isStaffRole(role: unknown): boolean {
  return roleAtLeast(role, STAFF_ROLE);
}

/** Roles an admin may hand out from the dashboard; root is provisioned server-side. */
export const ASSIGNABLE_ROLES: readonly AppRole[] = APP_ROLES.filter(
  (role) => role !== "root"
);
