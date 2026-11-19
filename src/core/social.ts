// Provider limits verified 26 Oct 2026; see docs/social-publishing.md.

export const SOCIAL_PLATFORM_IDS = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
  "threads",
  "x",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORM_IDS)[number];

/** Platforms we have approved for a build wave. `x` is deliberately absent. */
export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
  "threads",
] as const;

export type EnabledSocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialMediaKind = "image" | "video" | "carousel";
export type SocialPublishModel = "container" | "direct" | "asset" | "upload";
export type SocialReviewGate =
  | "app_review"
  | "audit"
  | "oauth_verification"
  | "paid_terms";

export interface SocialPlatformMeta {
  label: string;
  accountKind: "professional" | "page" | "channel" | "creator" | "member";
  mediaKinds: readonly SocialMediaKind[];
  publishModel: SocialPublishModel;
  requiresPublicMedia: boolean;
  carouselMax?: number;
  postsPer24h?: number;
  uploadsPerDay?: number;
  review: SocialReviewGate;
  docs: string;
  note?: string;
}

export const SOCIAL_PLATFORM_META: Record<SocialPlatform, SocialPlatformMeta> = {
  instagram: {
    label: "Instagram",
    accountKind: "professional",
    mediaKinds: ["image", "video", "carousel"],
    publishModel: "container",
    requiresPublicMedia: true,
    carouselMax: 20,
    postsPer24h: 100,
    review: "app_review",
    docs: "https://developers.facebook.com/docs/instagram-platform/content-publishing",
    note: "Professional account; no Facebook Page required with Instagram Login.",
  },
  facebook: {
    label: "Facebook Page",
    accountKind: "page",
    mediaKinds: ["image", "video"],
    publishModel: "direct",
    requiresPublicMedia: false,
    review: "app_review",
    docs: "https://developers.facebook.com/docs/pages-api/posts",
    note: "Page access token derived from the user token.",
  },
  tiktok: {
    label: "TikTok",
    accountKind: "creator",
    mediaKinds: ["video"],
    publishModel: "direct",
    requiresPublicMedia: true,
    review: "audit",
    docs: "https://developers.tiktok.com/doc/content-posting-api-get-started",
    note: "Unaudited apps publish privately; photo URLs need a verified domain.",
  },
  linkedin: {
    label: "LinkedIn Page",
    accountKind: "page",
    mediaKinds: ["image", "video"],
    publishModel: "asset",
    requiresPublicMedia: false,
    review: "app_review",
    docs: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api",
    note: "The member needs an admin or content role on the Page.",
  },
  youtube: {
    label: "YouTube",
    accountKind: "channel",
    mediaKinds: ["video"],
    publishModel: "upload",
    requiresPublicMedia: false,
    uploadsPerDay: 100,
    review: "oauth_verification",
    docs: "https://developers.google.com/youtube/v3/determine_quota_cost",
    note: "videos.insert costs 1 quota unit; default allowance is 100 uploads/day.",
  },
  threads: {
    label: "Threads",
    accountKind: "professional",
    mediaKinds: ["image", "video"],
    publishModel: "container",
    requiresPublicMedia: true,
    postsPer24h: 250,
    review: "app_review",
    docs: "https://developers.facebook.com/docs/threads/posts",
  },
  x: {
    label: "X",
    accountKind: "member",
    mediaKinds: ["image", "video"],
    publishModel: "direct",
    requiresPublicMedia: false,
    review: "paid_terms",
    docs: "https://docs.x.com/x-api/posts/create-post",
    note: "Deferred: paid API terms need owner approval.",
  },
};

export const SOCIAL_TARGET_STATUSES = [
  "queued",
  "publishing",
  "published",
  "failed",
  "needs_attention",
  "cancelled",
] as const;

export type SocialTargetStatus = (typeof SOCIAL_TARGET_STATUSES)[number];

export const SOCIAL_TARGET_STATUS_LABEL: Record<SocialTargetStatus, string> = {
  queued: "Queued",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  needs_attention: "Needs attention",
  cancelled: "Cancelled",
};

export function isSocialPlatform(value: string): value is SocialPlatform {
  return (SOCIAL_PLATFORM_IDS as readonly string[]).includes(value);
}

export function isEnabledSocialPlatform(
  value: string
): value is EnabledSocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}
