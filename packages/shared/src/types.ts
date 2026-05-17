export type RegulatoryRegime = "eu" | "uk";
export type VerificationTier = "basic" | "standard" | "premium" | "public_authority";
export type SystemRole = "entity_user" | "platform_ops" | "super_admin";
export type Permission = string;
export type ViewerContext = {
  userId: string;
  email?: string;
  role: SystemRole | string;
  entityId?: string | null;
  membershipRole?: string | null;
  verificationTier: VerificationTier | string;
  permissions: Permission[];
  sessionId?: string;
  regulatoryRegime?: RegulatoryRegime;
};
export type BeneficialOwnerInput = { fullName: string; ownershipPercent: number; countryCode?: string };
export type ComplianceCaseType = "kyb_refresh" | "kyc_owner" | "sanctions_screening" | "reverification";
export const isHighRiskMembershipRole = (role?: string | null) => ["owner","authority_admin","finance_admin"].includes(role ?? "");
