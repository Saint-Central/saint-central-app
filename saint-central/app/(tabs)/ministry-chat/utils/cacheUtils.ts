// AsyncStorage keys for caching
export const MEMBERSHIP_CACHE_KEY = (ministryId: number, userId: string) =>
  `ministry_membership_${ministryId}_${userId}`;

export const MINISTRY_CACHE_KEY = (ministryId: number) => `ministry_details_${ministryId}`;

export const MESSAGES_CACHE_KEY = (ministryId: number) => `ministry_messages_${ministryId}`;
