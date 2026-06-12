export const LEAD_SOURCES = [
  { v: "facebook_ads", l: "Facebook Ads" },
  { v: "google_ads", l: "Google Ads" },
  { v: "website", l: "Website" },
  { v: "walk_in", l: "Walk-In" },
  { v: "reference", l: "Reference" },
  { v: "whatsapp", l: "WhatsApp" },
  { v: "property_portal", l: "Property Portal" },
] as const;

export const LEAD_STATUSES = [
  { v: "new", l: "New" },
  { v: "contacted", l: "Contacted" },
  { v: "visit_scheduled", l: "Visit Scheduled" },
  { v: "visit_done", l: "Visit Done" },
  { v: "follow_up", l: "Follow-up" },
  { v: "booking", l: "Booking" },
  { v: "lost", l: "Lost" },
] as const;

export const FLAT_TYPES = [
  { v: "1bhk", l: "1 BHK" },
  { v: "2bhk", l: "2 BHK" },
  { v: "3bhk", l: "3 BHK" },
  { v: "shop", l: "Shop" },
  { v: "office", l: "Office" },
] as const;

export const INTEREST_LEVELS = [
  { v: "hot", l: "Hot" },
  { v: "warm", l: "Warm" },
  { v: "cold", l: "Cold" },
] as const;

export const FOLLOWUP_STATUSES = [
  { v: "pending", l: "Pending" },
  { v: "completed", l: "Completed" },
  { v: "missed", l: "Missed" },
  { v: "overdue", l: "Overdue" },
] as const;

export const BOOKING_STATUSES = [
  { v: "interested", l: "Interested" },
  { v: "token_paid", l: "Token Paid" },
  { v: "confirmed", l: "Confirmed" },
  { v: "registered", l: "Registered" },
] as const;

export function labelOf<T extends readonly { v: string; l: string }[]>(arr: T, v: string | null | undefined) {
  return arr.find((x) => x.v === v)?.l ?? v ?? "—";
}