export const SUPPORTED_JWT_ALGORITHMS = ['HS256', 'RS256'] as const;
export type SupportedJwtAlgorithm = (typeof SUPPORTED_JWT_ALGORITHMS)[number];

export const DEV_HS256_SECRET = 'slotsone-dev-hs256-secret-change-me';
