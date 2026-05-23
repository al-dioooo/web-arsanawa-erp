export type ApiEnvelope<T> = {
  message: string;
  data: T;
};

export type ApiValidationError = {
  message: string;
  errors?: Record<string, string[]>;
};

export type AuthenticatedUser = {
  id: number;
  name: string;
  username: string | null;
  email: string;
  email_verified_at: string | null;
};

export type LoginResponse = {
  token_type: "Bearer";
  access_token: string;
  expires_at: string | null;
  user: AuthenticatedUser;
};

export type Company = {
  id: number;
  name: string;
  slug: string;
  legal_name: string | null;
  tax_identifier: string | null;
  status: string;
};

export type Branch = {
  id: number;
  company_id: number;
  name: string;
  code: string | null;
  is_primary: boolean;
  status: string;
};

export type Membership = {
  id: number;
  company_id: number;
  user_id: number;
  branch_id: number | null;
  role: string;
  status: string;
  joined_at: string | null;
  company?: Company;
  branch?: Branch | null;
  user?: Pick<AuthenticatedUser, "id" | "name" | "username" | "email">;
};

export type CompanyMembership = {
  company: Company;
  membership: Membership;
};

export type ModuleEntitlement = {
  id: number;
  company_id: number;
  module: string;
  is_enabled: boolean;
  enabled_at: string | null;
  expires_at: string | null;
};

export type ModuleRegistry = {
  enabled: string[];
  available: string[];
  company: Company | null;
};

export type OrganizationContext = {
  company: Company | null;
  membership: Membership | null;
  branches: Branch[];
};

export type Profile = {
  id: number;
  name: string;
  username: string | null;
  email: string;
  profile: {
    display_name: string | null;
    avatar: string | null;
    locale: string | null;
    timezone: string | null;
  };
  status: {
    status: string;
    reason?: string | null;
  };
};
