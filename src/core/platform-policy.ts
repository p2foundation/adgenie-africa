// Channel-native marketing policy. Platform facts checked 26 Oct 2026; see
// docs/platform-policy.md for sources and for what is deliberately unverified.

export const MARKETING_CHANNELS = [
  "whatsapp",
  "instagram",
  "tiktok",
  "facebook",
] as const;

export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export const PLATFORM_POLICY_IDS = [
  ...MARKETING_CHANNELS,
  "linkedin",
  "youtube",
  "threads",
  "x",
] as const;

export type PolicyPlatform = (typeof PLATFORM_POLICY_IDS)[number];

export type ChannelRole =
  | "conversation"
  | "aspiration"
  | "discovery"
  | "reach"
  | "trust"
  | "search"
  | "community"
  | "real_time";

export interface PlatformPolicy {
  id: PolicyPlatform;
  label: string;
  role: ChannelRole;
  purpose: string;
  audience: string;
  bestFor: readonly string[];
  weakFor: readonly string[];
  nativeFormat: string;
  media: readonly ("image" | "video")[];
  aspectRatios: readonly string[];
  hook: string;
  cadence: string;
  bestSlots?: readonly string[];
  kpi: string;
  playbook: readonly string[];
  publishing: {
    mode: "api" | "manual";
    note: string;
  };
  ghana?: {
    reach?: number;
    label: string;
    caveat?: string;
  };
  source: string;
  schedulable: boolean;
}

export const CHANNEL_ROLE_LABEL: Record<ChannelRole, string> = {
  conversation: "Conversation",
  aspiration: "Aspiration",
  discovery: "Discovery",
  reach: "Reach",
  trust: "Trust",
  search: "Search",
  community: "Community",
  real_time: "Real time",
};

export const PLATFORM_POLICIES: Record<PolicyPlatform, PlatformPolicy> = {
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    role: "conversation",
    purpose: "The follow-through: close orders and remind people who already know you.",
    audience:
      "Existing customers, repeat buyers, staff and suppliers — people who saved your number.",
    bestFor: [
      "order confirmations and delivery updates",
      "restock and reminder nudges",
      "offers for repeat buyers",
      "event directions and table confirmations",
    ],
    weakFor: ["discovery", "public awareness", "visual storytelling"],
    nativeFormat: "One image or a short clip plus a two-line message and one link",
    media: ["image", "video"],
    aspectRatios: ["1:1", "4:5", "9:16"],
    hook: "Say the point in the first line. One message, one CTA.",
    cadence:
      "Only when there is something worth the interruption, to people who opted in.",
    bestSlots: ["08:00", "12:30", "19:30"],
    kpi: "Orders, replies and repeat purchase",
    playbook: [
      "Only message people who opted in; a broadcast list is not a feed.",
      "One idea, one link, one next step.",
      "Send at a human hour and stop after two unanswered messages.",
    ],
    publishing: {
      mode: "manual",
      note:
        "The WhatsApp Cloud API documents messaging, not Status or Channels publishing. Treat this slot as a reminder to send by hand until an approved integration exists.",
    },
    ghana: {
      label: "Ghana's default messaging habit; user reach is not comparable to feed ad reach.",
      caveat: "DataReportal does not publish a WhatsApp ad-reach figure.",
    },
    source: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    schedulable: true,
  },

  instagram: {
    id: "instagram",
    label: "Instagram",
    role: "aspiration",
    purpose: "The lookbook: visual proof that earns saves, shares and profile visits.",
    audience:
      "Visual-first buyers in cities and towns; 2.30m ad reach in Ghana (DataReportal 2026).",
    bestFor: [
      "product launches and lookbooks",
      "behind-the-scenes Reels",
      "before-and-after transformations",
      "saved how-tos and styling ideas",
    ],
    weakFor: ["long explanations", "link-led funnels", "event logistics"],
    nativeFormat: "4:5 still, 9:16 Reel, or a carousel of up to 20 items",
    media: ["image", "video"],
    aspectRatios: ["4:5", "9:16", "1:1"],
    hook: "The first frame and first line decide the save. Saves and shares are the signal.",
    cadence:
      "A steady 3–5 posts a week (our default). Consistency beats bursts; the platform publishes no cadence rule.",
    bestSlots: ["11:30", "18:30", "20:30"],
    kpi: "Saves, shares and profile visits",
    playbook: [
      "Lead with the transformation, not the product name.",
      "Use three to five specific hashtags, not thirty.",
      "Put the CTA in the caption and on the last frame.",
    ],
    publishing: {
      mode: "api",
      note:
        "Professional account, public media and app review. Carousels cap at 20 items; publishing is limited to 100 posts per 24 hours.",
    },
    ghana: {
      reach: 2_300_000,
      label: "2.30m ad reach (6.5% of the population)",
      caveat: "Ad reach, not monthly active users.",
    },
    source:
      "https://developers.facebook.com/docs/instagram-platform/content-publishing",
    schedulable: true,
  },

  tiktok: {
    id: "tiktok",
    label: "TikTok",
    role: "discovery",
    purpose: "The discovery stage: short vertical video that finds people who do not know you.",
    audience:
      "New audiences scrolling short video. Our Ghana source does not publish TikTok ad reach.",
    bestFor: [
      "demos and proof in motion",
      "before-and-after clips",
      "trend-led skits with a local twist",
      "founder POV and day-in-the-life",
    ],
    weakFor: ["price lists", "text announcements", "still-only catalogues"],
    nativeFormat: "9:16 video with a first-second hook",
    media: ["video"],
    aspectRatios: ["9:16"],
    hook: "The first one to three seconds decide the scroll.",
    cadence:
      "Three to five videos a week (TikTok creator guidance, not an API limit).",
    bestSlots: ["12:00", "18:00", "21:00"],
    kpi: "Watch-through, shares and follows",
    playbook: [
      "Open on the result; cut every intro that delays it.",
      "One idea per video.",
      "Say the search phrase out loud and put it in the caption.",
    ],
    publishing: {
      mode: "api",
      note:
        "Video only. An unaudited app publishes privately, so public posting needs the audit. Photo URLs require a verified domain.",
    },
    ghana: {
      label: "Ghana reach is not published in our 2026 source; do not rank it against Facebook or YouTube.",
    },
    source: "https://developers.tiktok.com/doc/content-posting-api-get-started",
    schedulable: true,
  },

  facebook: {
    id: "facebook",
    label: "Facebook Page",
    role: "reach",
    purpose: "The town square: offers, events and local reach at the widest adult audience.",
    audience:
      "The broadest adult reach in Ghana: 8.40m ad reach (DataReportal 2026).",
    bestFor: [
      "local offers and price-led posts",
      "events and ticketing",
      "hiring and service announcements",
      "community updates and Reels",
    ],
    weakFor: ["polished brand films", "B2B thought leadership"],
    nativeFormat: "1:1 or 4:5 image or video; Reels for extra reach",
    media: ["image", "video"],
    aspectRatios: ["1:1", "4:5", "9:16"],
    hook: "Lead with the offer, the place or the date.",
    cadence: "Two to four Page posts a week (our default), with Reels carrying reach.",
    bestSlots: ["09:00", "13:00", "19:00"],
    kpi: "Reach, event responses and messages",
    playbook: [
      "Put price, place and date in the first line.",
      "Use the Page CTA button — Message, Book or Learn more.",
      "Share to local groups where you are a known member, not a drive-by poster.",
    ],
    publishing: {
      mode: "api",
      note:
        "Needs a Page access token with pages_manage_posts; the Page is the account, not the personal profile.",
    },
    ghana: {
      reach: 8_400_000,
      label: "8.40m ad reach (23.8% of the population)",
      caveat: "Ad reach, not monthly active users.",
    },
    source: "https://developers.facebook.com/docs/pages-api/posts",
    schedulable: true,
  },

  linkedin: {
    id: "linkedin",
    label: "LinkedIn Page",
    role: "trust",
    purpose: "The credibility desk: expertise, case studies and hiring for professionals.",
    audience: "Professionals, suppliers and B2B buyers; 3.40m members in Ghana.",
    bestFor: ["B2B services", "hiring", "case studies", "industry point of view"],
    weakFor: ["consumer discounts", "meme-led trends"],
    nativeFormat: "Landscape or square image, native video, or a short document post",
    media: ["image", "video"],
    aspectRatios: ["1.91:1", "1:1", "9:16"],
    hook: "The first two lines show before 'see more'. Lead with the result.",
    cadence: "Two to three Page posts a week (our default).",
    kpi: "Saves, dwell time and qualified conversations",
    playbook: [
      "Lead with a specific result or lesson, not a slogan.",
      "External links tend to travel less; put the link in a comment if the post must stand alone.",
      "Tag the Page, not individuals who did not agree to be tagged.",
    ],
    publishing: {
      mode: "api",
      note:
        "Requires w_organization_social and an admin or content role on the Page.",
    },
    ghana: {
      reach: 3_400_000,
      label: "3.40m members",
      caveat: "Member count, not ad reach.",
    },
    source:
      "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api",
    schedulable: false,
  },

  youtube: {
    id: "youtube",
    label: "YouTube",
    role: "search",
    purpose: "The search shelf: durable how-to, review and proof video that keeps being found.",
    audience:
      "The widest video reach in Ghana: 8.59m ad reach (DataReportal 2026).",
    bestFor: ["tutorials", "reviews", "long-form proof", "searchable demos"],
    weakFor: ["daily offers", "time-sensitive reminders"],
    nativeFormat: "16:9 long-form, or vertical Shorts",
    media: ["video"],
    aspectRatios: ["16:9", "9:16"],
    hook: "The title and thumbnail earn the click; the first 30 seconds keep it.",
    cadence: "One or two uploads a week if quality holds (our default).",
    kpi: "Watch time, search traffic and subscribers",
    playbook: [
      "Write the title for the search query, the thumbnail for the click.",
      "Front-load the payoff; skip the long intro.",
      "Pin a comment with the offer or the next step.",
    ],
    publishing: {
      mode: "api",
      note:
        "videos.insert costs one quota unit and the default allowance is 100 uploads a day; OAuth verification is required.",
    },
    ghana: {
      reach: 8_590_000,
      label: "8.59m ad reach (24.4% of the population)",
      caveat: "Ad reach, not monthly active users.",
    },
    source: "https://developers.google.com/youtube/v3/determine_quota_cost",
    schedulable: false,
  },

  threads: {
    id: "threads",
    label: "Threads",
    role: "community",
    purpose: "The conversation layer: opinions, questions and replies around culture.",
    audience:
      "Culture-led and younger conversational audiences. Our Ghana source does not publish Threads reach.",
    bestFor: ["hot takes", "questions", "culture commentary", "repurposed carousels"],
    weakFor: ["hard-sell offers", "long demo video"],
    nativeFormat: "Text-led post with an optional 4:5 image or video",
    media: ["image", "video"],
    aspectRatios: ["4:5", "1:1", "9:16"],
    hook: "Open with a take people want to answer.",
    cadence:
      "Conversation daily if you can reply; 250 posts per 24 hours is the API ceiling, not a target.",
    kpi: "Replies, reposts and follows",
    playbook: [
      "Ask a question a person can answer in one line.",
      "Reply to every early reply; the thread is the product.",
      "Repurpose the best carousel as a text thread, not a link drop.",
    ],
    publishing: {
      mode: "api",
      note:
        "Container-then-publish; public media required; 250 posts per 24 hours.",
    },
    ghana: {
      label: "Ghana reach is not published in our 2026 source.",
    },
    source: "https://developers.facebook.com/docs/threads/posts",
    schedulable: false,
  },

  x: {
    id: "x",
    label: "X",
    role: "real_time",
    purpose: "The live wire: news, launches and commentary while the moment is open.",
    audience: "News-led and real-time audiences; 1.17m ad reach in Ghana (DataReportal 2026).",
    bestFor: ["news", "launches", "live commentary", "customer service"],
    weakFor: ["evergreen tutorials", "visual lookbooks"],
    nativeFormat: "Short text with 16:9 or 1:1 image/video",
    media: ["image", "video"],
    aspectRatios: ["16:9", "1:1"],
    hook: "The first line is the whole post.",
    cadence: "Multiple daily posts when there is news; API access is deferred.",
    kpi: "Reposts, replies and link clicks",
    playbook: [
      "One idea per post.",
      "Quote-post with a take, not a bare link.",
      "Reply fast; the timeline moves on.",
    ],
    publishing: {
      mode: "api",
      note: "Deferred: paid API terms need owner approval.",
    },
    ghana: {
      reach: 1_170_000,
      label: "1.17m ad reach (3.3% of the population)",
      caveat: "Ad reach, not monthly active users.",
    },
    source: "https://docs.x.com/x-api/posts/create-post",
    schedulable: false,
  },
};

export const CHANNEL_POLICIES: Record<MarketingChannel, PlatformPolicy> = {
  whatsapp: PLATFORM_POLICIES.whatsapp,
  instagram: PLATFORM_POLICIES.instagram,
  tiktok: PLATFORM_POLICIES.tiktok,
  facebook: PLATFORM_POLICIES.facebook,
};

export type FitLevel = "native" | "workable" | "off_purpose";

export const FIT_LABEL: Record<FitLevel, string> = {
  native: "Native fit",
  workable: "Workable",
  off_purpose: "Off purpose",
};

export interface ChannelFitInput {
  channel: MarketingChannel;
  hasVideo: boolean;
  formats?: readonly string[];
  goal?: string;
  vertical?: string;
}

export interface ChannelFit {
  channel: MarketingChannel;
  level: FitLevel;
  score: number;
  headline: string;
  reasons: string[];
  fix?: string;
}

const WARM_GOAL =
  /offer|sale|discount|promo|restock|order|reminder|event|ticket|book|price|delivery|menu|stock|drop|launch/i;
const DISCOVERY_GOAL =
  /aware|reach|follow|discover|brand|grow|audience|views|viral|new customers|new market/i;

const VERTICAL_PLAY: Partial<
  Record<string, Partial<Record<MarketingChannel, string>>>
> = {
  seller: {
    whatsapp: "For a seller, the DM is the checkout line: confirm price, stock and delivery.",
    instagram: "For a seller, the grid is the catalogue and the Reel is the demo.",
    tiktok: "For a seller, a 20-second demo of the product in use beats a flat lay.",
    facebook: "For a seller, local offers and Marketplace habits make Facebook a second shopfront.",
  },
  company: {
    whatsapp: "For a company, use this for client updates and appointments, not campaigns.",
    facebook: "For a company, Page posts carry hiring, service changes and community proof.",
  },
  fashion: {
    instagram: "For fashion, the grid is the lookbook; saves are the fitting room.",
    tiktok: "For fashion, fit checks and styling clips travel further than campaign stills.",
    whatsapp: "For fashion, message repeat clients about restocks; do not cold-blast a list.",
  },
  spot: {
    facebook: "For venues, the event page and local shares fill rooms.",
    instagram: "For venues, atmosphere and tonight's special sell tomorrow's table.",
    whatsapp: "For venues, reminders and table confirmations belong here.",
    tiktok: "For venues, a packed-room clip sells the night better than a flyer.",
  },
};

export function reviewChannelFit(input: ChannelFitInput): ChannelFit {
  const formats = input.formats ?? [];
  const vertical = formats.includes("9:16");
  const goal = input.goal ?? "";
  const warm = WARM_GOAL.test(goal);
  const discovery = DISCOVERY_GOAL.test(goal);
  const play = input.vertical
    ? VERTICAL_PLAY[input.vertical]?.[input.channel]
    : undefined;
  const withPlay = (reasons: string[]) => (play ? [...reasons, play] : reasons);

  if (input.channel === "tiktok") {
    if (!input.hasVideo) {
      return {
        channel: "tiktok",
        level: "off_purpose",
        score: 15,
        headline: "Not a stills channel",
        reasons: withPlay([
          "TikTok's feed and posting API both require video; a still has no home here.",
        ]),
        fix: "Add a 9:16 motion cut, or move this slot to Instagram or Facebook.",
      };
    }
    if (!vertical) {
      return {
        channel: "tiktok",
        level: "workable",
        score: 62,
        headline: "Video, but not vertical",
        reasons: withPlay([
          "TikTok is full-screen vertical; a square or landscape cut competes with the frame.",
        ]),
        fix: "Add the 9:16 format and re-export before posting.",
      };
    }
    return {
      channel: "tiktok",
      level: "native",
      score: 96,
      headline: "Made for this feed",
      reasons: withPlay([
        "Short 9:16 video is the native unit; the first seconds do the work.",
      ]),
    };
  }

  if (input.channel === "instagram") {
    if (input.hasVideo && vertical) {
      return {
        channel: "instagram",
        level: "native",
        score: 94,
        headline: "Reels-ready",
        reasons: withPlay([
          "9:16 motion can lead as a Reel, with stills supporting the grid.",
        ]),
      };
    }
    if (input.hasVideo) {
      return {
        channel: "instagram",
        level: "workable",
        score: 76,
        headline: "Video needs a vertical cut",
        reasons: withPlay([
          "Reels are vertical; a non-vertical video becomes a second-class feed post.",
        ]),
        fix: "Add 9:16 to the kit, or post the stills now and the video as a Reel next.",
      };
    }
    if (formats.length > 0 && formats.every((format) => format === "9:16")) {
      return {
        channel: "instagram",
        level: "workable",
        score: 74,
        headline: "Story-only stills",
        reasons: withPlay([
          "A 9:16 still works as a Story but gives the feed nothing to save.",
        ]),
        fix: "Add a 4:5 crop for the profile grid.",
      };
    }
    return {
      channel: "instagram",
      level: "native",
      score: 86,
      headline: "Feed-native",
      reasons: withPlay([
        "Stills and carousels are first-class; saves and shares are the signal.",
      ]),
    };
  }

  if (input.channel === "facebook") {
    if (input.hasVideo) {
      return {
        channel: "facebook",
        level: "native",
        score: 88,
        headline: "Reach-native",
        reasons: withPlay([
          "Video and Reels travel furthest on the Page; stills still work alongside.",
        ]),
      };
    }
    return {
      channel: "facebook",
      level: "native",
      score: 82,
      headline: "Offer-native",
      reasons: withPlay([
        "Clear offer, event and local posts still work here; Reels add the reach.",
      ]),
    };
  }

  if (warm) {
    return {
      channel: "whatsapp",
      level: "native",
      score: 90,
      headline: "Built for the follow-through",
      reasons: withPlay([
        "This is a warm list: people who already saved your number and expect a message.",
      ]),
    };
  }

  return {
    channel: "whatsapp",
    level: "workable",
    score: discovery ? 52 : 70,
    headline: discovery ? "Warm list, not discovery" : "Use it as the follow-up",
    reasons: withPlay([
      discovery
        ? "WhatsApp will not create new reach; it converts people who already know you."
        : "Short copy, one CTA and a person on the other end — best after the feed has done its job.",
    ]),
    fix: discovery
      ? "Lead with Facebook or Instagram for discovery, then use this slot to follow up."
      : "Pair it with a Facebook or Instagram post that creates the first touch.",
  };
}

export function rankChannels(
  input: Omit<ChannelFitInput, "channel">
): ChannelFit[] {
  return MARKETING_CHANNELS.map((channel) =>
    reviewChannelFit({ ...input, channel })
  ).sort(
    (a, b) =>
      b.score - a.score ||
      MARKETING_CHANNELS.indexOf(a.channel) - MARKETING_CHANNELS.indexOf(b.channel)
  );
}

export function isMarketingChannel(value: string): value is MarketingChannel {
  return (MARKETING_CHANNELS as readonly string[]).includes(value);
}
