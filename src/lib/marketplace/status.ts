export const LISTING_STATUSES = [
  "draft",
  "pending",
  "published",
  "paused",
  "sold",
  "archived",
  "removed",
] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const CATEGORIES = ["cars", "trucks", "machinery", "agriculture"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CITIES = [
  "addis",
  "adama",
  "hawassa",
  "bahirdar",
  "diredawa",
  "mekelle",
  "jimma",
  "gondar",
] as const;
export type City = (typeof CITIES)[number];

export const SELLER_TRANSITIONS: Record<ListingStatus, readonly ListingStatus[]> = {
  draft: ["pending", "archived"],
  pending: ["archived"],
  published: ["paused", "sold", "archived"],
  paused: ["published", "sold", "archived"],
  sold: ["archived"],
  archived: [],
  removed: [],
};

/** Moderators publish or return a review. They do not get a client endpoint in this build. */
export const MODERATOR_TRANSITIONS: Record<ListingStatus, readonly ListingStatus[]> = {
  draft: [],
  pending: ["published", "draft", "removed"],
  published: ["removed"],
  paused: ["removed"],
  sold: ["removed"],
  archived: ["removed"],
  removed: [],
};

export function isListingStatus(value: string): value is ListingStatus {
  return (LISTING_STATUSES as readonly string[]).includes(value);
}

export function canSellerTransition(from: ListingStatus, to: ListingStatus): boolean {
  return SELLER_TRANSITIONS[from].includes(to);
}

export function canModeratorTransition(from: ListingStatus, to: ListingStatus): boolean {
  return MODERATOR_TRANSITIONS[from].includes(to);
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isCity(value: string): value is City {
  return (CITIES as readonly string[]).includes(value);
}

const COVERS: Record<Category, string> = {
  cars: "/media/sedan.jpg",
  trucks: "/media/truck.jpg",
  machinery: "/media/excavator.jpg",
  agriculture: "/media/tractor.jpg",
};

export function categoryCover(category: Category): string {
  return COVERS[category];
}
