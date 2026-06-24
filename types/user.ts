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
