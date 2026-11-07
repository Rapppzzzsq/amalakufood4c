export const userRoles = ["customer", "kasir", "admin", "owner"] as const;

export type UserRole = (typeof userRoles)[number];

export const roleLabels: Record<UserRole, string> = {
  customer: "Customer",
  kasir: "Kasir",
  admin: "Admin",
  owner: "Owner",
};

export function parseUserRole(value: string | undefined): UserRole | null {
  if (!value) {
    return null;
  }

  const role = value.toLowerCase();
  return userRoles.find((candidate) => candidate === role) ?? null;
}

export function roleHome(role: UserRole): string {
  return `/${role}`;
}
