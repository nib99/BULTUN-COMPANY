/**
 * BULTUM COMPANY authentication providers.
 *
 * Google is configured directly with Better Auth for production. Email/password
 * is handled by the same first-party Better Auth instance and stored in the
 * BULTUM PostgreSQL database.
 */
export type AuthProvider = {
  providerId: "google";
  label: string;
};

export const AUTH_PROVIDERS: readonly AuthProvider[] = [
  { providerId: "google", label: "Google" },
];

