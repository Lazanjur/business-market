import type { MembershipRole, Permission, SystemRole, ViewerContext } from "@ib-marketplace/shared";

export const ROLE_PERMISSION_MAP: Record<MembershipRole, Permission[]> = {
  owner: [
    "entity.members.read",
    "entity.members.invite",
    "entity.members.manage",
    "entity.settings.manage",
    "entity.sso.manage",
    "entity.locations.manage",
    "entity.procurement.manage",
    "entity.finance.manage",
    "entity.compliance.manage",
    "entity.security.manage",
    "session.revoke.self",
    "session.revoke.entity",
    "mfa.manage.self"
  ],
  admin: [
    "entity.members.read",
    "entity.members.invite",
    "entity.members.manage",
    "entity.settings.manage",
    "entity.sso.manage",
    "entity.locations.manage",
    "entity.procurement.manage",
    "entity.compliance.manage",
    "entity.security.manage",
    "session.revoke.self",
    "session.revoke.entity",
    "mfa.manage.self"
  ],
  procurement_manager: [
    "entity.members.read",
    "entity.procurement.manage",
    "entity.locations.manage",
    "session.revoke.self",
    "mfa.manage.self"
  ],
  sales_manager: [
    "entity.members.read",
    "entity.locations.manage",
    "session.revoke.self",
    "mfa.manage.self"
  ],
  finance_manager: [
    "entity.members.read",
    "entity.finance.manage",
    "session.revoke.self",
    "mfa.manage.self"
  ],
  compliance_manager: [
    "entity.members.read",
    "entity.compliance.manage",
    "entity.security.manage",
    "session.revoke.self",
    "session.revoke.entity",
    "mfa.manage.self"
  ],
  member: ["session.revoke.self", "mfa.manage.self"],
  viewer: ["session.revoke.self", "mfa.manage.self"],
  authority_admin: [
    "entity.members.read",
    "entity.members.invite",
    "entity.members.manage",
    "entity.settings.manage",
    "entity.procurement.manage",
    "entity.security.manage",
    "session.revoke.self",
    "session.revoke.entity",
    "mfa.manage.self"
  ],
  authority_procurement_officer: [
    "entity.members.read",
    "entity.procurement.manage",
    "session.revoke.self",
    "mfa.manage.self"
  ]
};

export function resolvePermissions(input: {
  systemRole?: SystemRole | string | null;
  membershipRole?: MembershipRole | string | null;
  explicitPermissions?: string[];
}): Permission[] {
  if (input.systemRole === "super_admin" || input.systemRole === "platform_ops") {
    return ["*"];
  }

  const membershipRole = (input.membershipRole ?? "member") as MembershipRole;
  const derived = ROLE_PERMISSION_MAP[membershipRole] ?? ROLE_PERMISSION_MAP.member;
  return Array.from(new Set([...derived, ...((input.explicitPermissions ?? []) as Permission[])]));
}

export function hasPermission(auth: Pick<ViewerContext, "permissions">, permission: Permission): boolean {
  return auth.permissions.includes("*") || auth.permissions.includes(permission);
}

export function canManageEntityAccess(auth: ViewerContext, entityId: string): boolean {
  if (auth.role === "super_admin") {
    return true;
  }

  return auth.entityId === entityId && hasPermission(auth, "entity.members.manage");
}
