export const ENTITY_SCOPES = ["ACTIVE", "ALL", "ARCHIVED"] as const;

export type EntityScope = (typeof ENTITY_SCOPES)[number];
