export type User = {
  id: string;
  username: string;
  subtitle?: string;
  image: string;
  unreadCount?: number;
  isMessageSeen?: boolean;
  lastMessage?: string;
  timeAgo?: number;
  fullName?: string;
  full_name?: string; // Add this field
  isPinned?: boolean; // Use camelCase for consistency in TypeScript
  message?: string;
  bio?: string;
  requestStatus?: string;
  isMuted?: boolean;
  isTyping?: boolean;
  shouldShowMessageOnly?: boolean;
  distance?: number;
  /** Rastojanje od mene u metrima (Close-By, T3.19) — postavljeno samo za „Close By" korisnike. */
  distanceM?: number;
  /** Korisnik je fizički u blizini (≤ Close-By radijus 20–30m, Search 6.0 / A6) → labela „Close By". */
  isCloseBy?: boolean;
  /** Vidljiv Chat Hours brojač (ceo broj sati) — Chat 5.0. 0/undefined = ne prikazuje se. */
  chatHours?: number;
  /** Chat Hours serija ističe za ≤3h (peščani sat / urgency u listi). */
  chatHoursAtRisk?: boolean;
};

export interface NearbyUserData {
  id: string;
  distance: number;
  last_updated: string;
}

export interface UserWithDistance extends User {
  distance?: number;
}
