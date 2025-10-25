export type Gender = "male" | "female" | "other";

export interface Photo {
  id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  name: string;
  age: number;
  gender: Gender;
  city?: string | null;
  profile_picture_url?: string | null;
  is_premium?: boolean;
  is_boosted?: boolean;
  fcm_token?: string | null;
  created_at?: string;

  // Relations / states
  is_liked?: boolean;
  is_favorited?: boolean;
  is_superliked?: boolean;

  // Extended profile details
  height_cm?: number | null;
  weight_kg?: number | null;
  looking_for?: string | null;
  work?: string | null;
  education?: string | null;
  education_level?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  religion?: string | null;
  languages?: string[];
  interests?: string[];

  // Photos
  photos?: Photo[];
}

export interface Profile {
  id: string;
  // existing user fields...
  height_cm?: number | null;
  weight_kg?: number | null;
  looking_for?: string | null;
  work?: string | null;
  education?: string | null;
  education_level?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  religion?: string | null;
  languages?: string[];
  interests?: string[];
  photos?: Array<{
    id: string;
    url: string;
    sort_order: number;
    is_primary: boolean;
  }>;
}

export type UserPhoto = {
  id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
};

export interface Me {
  id: string;
  email?: string | null;
  phone?: string | null;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  city?: string | null;
  profile_picture_url?: string | null;
  is_premium?: boolean;
  height_cm?: number | null;
  weight_kg?: number | null;
  looking_for?: string | null;
  work?: string | null;
  education?: string | null;
  education_level?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  religion?: string | null;
  languages?: string[];
  interests?: string[];
  photos?: UserPhoto[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type NotificationItem = {
  id: string;
  type: "like" | "favorite" | "superlike" | "message" | string;
  payload?: Record<string, any>;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  user_id: string;
  actor_id: string;
  actor?: {
    id: string;
    name?: string | null;
    profile_picture_url?: string | null;
  };
};

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export interface CreditState {
  user_id: string;
  superlike_credits: number;
  boost_credits: number;
  premium_tokens: number;
  updated_at: string;
}

// ---- Subscription / Plans types ----

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "none";

export type PlanInterval = "day" | "week" | "month" | "year";
export type PlanType = "subscription" | "one_time";
export type CreditType = "superlike" | "boost" | "premium";

// The plan rows returned by GET /subscription/plans
export interface Plan {
  price_id: string;
  product_id: string;
  plan_slug: string;
  name?: string | null;
  description?: string | null;
  plan_type: PlanType;
  interval?: PlanInterval | null; // only for subscriptions
  unit_amount: number; // cents
  currency: string; // e.g. "USD"
  grants_chat?: boolean;
  credit_type?: CreditType | null; // for one-time packs
  credit_quantity?: number; // for one-time packs
  // Feature metadata (for subscription plans)
  superlikes_per_period?: number | null;
  superlike_period?: PlanInterval | null;
  boosts_per_week?: number | null;
  unlimited_swipes?: boolean;
  see_who_liked?: boolean;
  priority_support?: boolean;
  badge?: boolean;
  active?: boolean;
  sort_order?: number;
}

// Current subscription state returned by GET /subscription
export interface SubscriptionState {
  status: SubscriptionStatus;
  current_period_end?: string | null;

  // NEW: let the UI resolve the active package
  plan_price_id?: string | null; // matches Plan.price_id
  plan_slug?: string | null; // matches Plan.plan_slug
  plan_interval?: PlanInterval | null; // convenience copy (optional)

  // Optional enrichment (if your backend includes these)
  plan_name?: string | null;
  plan_amount?: number | null; // cents
  plan_currency?: string | null;
  cancel_at_period_end?: string | null;
  ends_on?: string | null;
}

// (Optional) for the checkout mutation payload so you don’t need `as any`
export interface CheckoutRequest {
  plan?: string; // e.g. "weekly" | "monthly" | "yearly" | "superlike_pack" | ...
  price_id?: string; // Stripe price_***
}

export type UserInfo = {
  id: string;
  name?: string;
  username?: string;
  location?: string;
  avatarUrl?: string;
};
