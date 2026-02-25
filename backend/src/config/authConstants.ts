export const SUPPORTED_JWT_ALGORITHMS = ['RS256'] as const;
export type SupportedJwtAlgorithm = (typeof SUPPORTED_JWT_ALGORITHMS)[number];
