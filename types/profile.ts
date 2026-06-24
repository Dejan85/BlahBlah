export interface Profile {
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  provider_avatar_url?: string | null;
  website_url?: string | null;
  location_enabled?: boolean;
  latitude?: number;
  longitude?: number;
  blah_score?: number;
  blahs_sent?: number;
}

export interface ProfileState {
  loading: boolean;
  profile: Profile | null;
  followersCount: number;
  followingCount: number;
  blahScore: number;
  loggingOut: boolean;
  savingProfile: boolean;
}

export interface EditFormState {
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  websiteUrl: string;
  locationEnabled?: boolean; // Add this new field
}

export interface BlockState {
  isBlocked: boolean;
  isBlockedBy: boolean;
}
