import { site } from "@/lib/site";

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "note"; title: string; text: string };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

export type LegalDoc = {
  slug: "privacy" | "terms" | "safety";
  eyebrow: string;
  title: string;
  highlight: string;
  intro: string;
  updated: string;
  summary: { label: string; text: string }[];
  sections: LegalSection[];
};

const updated = "30 October 2026";

export const privacy: LegalDoc = {
  slug: "privacy",
  eyebrow: "Privacy",
  title: "Privacy policy,",
  highlight: "in plain words.",
  intro:
    "What we collect when you use AdGenie, why we need it, who can see it, and how to get a copy back or have it deleted. No dark patterns, and we do not sell your data.",
  updated,
  summary: [
    {
      label: "What we hold",
      text: "Your account, your brand kit, the photos you upload, the campaigns we make — and, only if you ask to be paid, your payout documents.",
    },
    {
      label: "Who can see it",
      text: "You, the staff who support you, and the AI providers that draw the images. Nobody else, and never through a public link.",
    },
    {
      label: "Your call",
      text: "Ask for a copy or deletion at any time. Identity documents are kept only while your account can be paid.",
    },
  ],
  sections: [
    {
      id: "who-we-are",
      title: "Who we are",
      blocks: [
        {
          kind: "p",
          text: `AdGenie Africa is an AI marketing tool built in Accra, Ghana. We help small shops, companies, creators and venues turn a short brief into a campaign they can post. This policy explains what happens to personal data when you use adgenie.africa and the AdGenie app.`,
        },
        {
          kind: "p",
          text: "In this policy, “we” and “us” mean AdGenie Africa, and “you” means the person or business using the service. We are the data controller for the information described here.",
        },
      ],
    },
    {
      id: "what-we-collect",
      title: "What we collect",
      blocks: [
        { kind: "p", text: "Only what the product needs to work." },
        {
          kind: "list",
          items: [
            "Account details: your name, email address, password (stored as a scrypt hash, never in readable form), country, language and preferred display currency.",
            "Brand details: your business name, the colours, typeface and tone you choose, and the WhatsApp number or call to action you want printed on an ad. This is what makes a campaign look like yours.",
            "Content you give us: the campaign brief, product photos and logos, plus any person or venue photo you upload as a reference, and the consent attestation that goes with it.",
            "Campaigns and outputs: the copy, plates, videos and files we generate, and what you did with them — downloaded, shared or scheduled.",
            "Billing records: credit purchases, plan changes, payment references and amounts. Card and mobile-money details are entered on our providers' pages and are never stored by us.",
            "Verification records: only if you ask to be paid through the platform — a Ghana Card photograph, an ORC certificate and payout details.",
            "Usage and security data: which features you use, run history, provider cost per generation, device push tokens if you turn notifications on, the session cookie that keeps you signed in, and short-lived request logs used for rate limits and abuse checks.",
          ],
        },
        {
          kind: "note",
          title: "What we do not ask for",
          text: "Not your location, your contacts, or a password to your social accounts. The Post Kit opens your phone's own share sheet; we never log in to Instagram, TikTok or WhatsApp as you.",
        },
      ],
    },
    {
      id: "why",
      title: "Why we use it",
      blocks: [
        { kind: "p", text: "To run the service you asked for, not to build an advertising profile." },
        {
          kind: "list",
          items: [
            "To create and price a campaign: read your brief, apply your brand kit, and show the quote before a credit moves.",
            "To generate your images and copy, including sending the reference photos you attached to the AI provider that draws the scene.",
            "To keep the credit ledger correct and reconcile payments with GTPay and Advansis Pay.",
            "To review identity documents when you ask to be paid.",
            "To keep the service safe: rate limits, fraud and abuse checks, and a record of staff decisions.",
            "To answer you when you write to us.",
          ],
        },
        {
          kind: "p",
          text: "We do not sell personal data, and we do not use your photos or campaigns to train our own models. Improving Twi and Ga needs separate, opt-in consent before any voice or text sample is used.",
        },
      ],
    },
    {
      id: "ai-providers",
      title: "AI providers and your content",
      blocks: [
        {
          kind: "p",
          text: "Text and images are generated by third-party AI models. Today the primary provider is Google (Gemini), with OpenAI as a failover when Gemini cannot answer. Our servers call them, so your browser never holds a provider key.",
        },
        {
          kind: "p",
          text: "To make a scene we send the prompt built from your brief and brand kit, plus the reference photos you chose to attach. Those requests are handled under the provider's own terms and data-processing agreement, and may be processed outside Ghana.",
        },
        {
          kind: "p",
          text: "Every output is marked as AI-generated in our records, and you can carry that label into the files you post. Prices, phone numbers, business names and calls to action are drawn by our own renderer, never by the model.",
        },
        {
          kind: "note",
          title: "When the primary provider is unavailable",
          text: "The same request may be handed to our failover provider. The same content is sent, and nothing is kept longer than the request needs.",
        },
      ],
    },
    {
      id: "consent",
      title: "Photos of people, likeness and consent",
      blocks: [
        {
          kind: "p",
          text: "You may upload a photo of yourself, or of someone who has agreed to appear. You are asked to record which it is, and that statement is stored with the file together with the time and the version of this policy that was in force.",
        },
        {
          kind: "p",
          text: "We do not generate or edit an image to look like a named real person, a celebrity, a politician or any other public figure, and we do not create images of children. If a photo appears to show a child, the campaign is held for review instead of run.",
        },
        {
          kind: "p",
          text: "You can withdraw consent later. Write to us and we will remove the photo and stop using it. Campaigns already downloaded to your phone are outside our control, which is why we show a review step before you post.",
        },
      ],
    },
    {
      id: "verification",
      title: "Identity checks, only for payouts",
      blocks: [
        {
          kind: "p",
          text: "You can use AdGenie without ever sending identity documents. They are collected only when you ask to be paid, because financial rules require us to know who is being paid.",
        },
        {
          kind: "p",
          text: "We ask for the minimum a payout review needs: a Ghana Card photograph, an ORC certificate for a registered business, and payout details. We do not take biometric or liveness scans, utility bills, bank logins or your location.",
        },
        {
          kind: "list",
          items: [
            "Files are stored under server-generated keys. There is no public object and no shareable link.",
            "They are served only through an authorised API route marked private and never cached.",
            "Only staff with a manager or admin role can open the review queue, and every decision is written to an audit log.",
            "Your documents are never sent to an AI provider.",
          ],
        },
        {
          kind: "p",
          text: "A verified identity record is kept while your account can be paid, and for the period Ghanaian financial rules require afterwards. After that it is deleted.",
        },
      ],
    },
    {
      id: "who-sees",
      title: "Who can see your data",
      blocks: [
        {
          kind: "p",
          text: "You and the people on your account. Our staff can see account and campaign information in order to support you; sensitive identity files are limited to the review roles above, and every decision is audited. Other users never see your campaigns, brand kit or verification files.",
        },
        {
          kind: "p",
          text: "We share data with the providers that run the service: our database and file-storage hosts, our app hosting, the AI providers that draw and write, and the payment providers that take and settle money. Each is bound by contract to use it only for that purpose. We may also disclose data where Ghanaian law requires it.",
        },
      ],
    },
    {
      id: "where",
      title: "Where your data lives",
      blocks: [
        {
          kind: "p",
          text: "Our database and file storage sit with cloud providers outside Ghana — currently in the European Union and the United States — and requests to AI providers are processed abroad. We rely on the providers' standard contractual protections for those transfers, and we are consolidating storage in the European Union.",
        },
        {
          kind: "note",
          title: "Cross-border transfers",
          text: "By using AdGenie you understand that your data is processed outside Ghana. Write to us if you need the current list of processors and regions.",
        },
      ],
    },
    {
      id: "retention",
      title: "How long we keep it",
      blocks: [
        {
          kind: "list",
          items: [
            "Account and brand data: while your account is open, then removed on deletion.",
            "Campaigns, uploads and outputs: while your account is open, or until you delete them. Deleting a campaign removes its files from storage.",
            "Billing and ledger records: kept after deletion, because the ledger is append-only and financial records have a statutory retention period.",
            "Identity documents: while the account can be paid, plus the statutory period, then deleted.",
            "Support messages and audit logs: for as long as needed to resolve the issue and meet our audit duty.",
            "Request logs: short-lived, used for security and rate limiting.",
          ],
        },
      ],
    },
    {
      id: "rights",
      title: "Your rights",
      blocks: [
        {
          kind: "p",
          text: "Under Ghana's Data Protection Act, 2012 (Act 843) you can ask to see the personal data we hold about you, have it corrected, have it deleted, object to a particular use, or receive a copy in a portable form. You can withdraw consent for a photo at any time.",
        },
        {
          kind: "p",
          text: "Write to us from the email on your account. We may need to confirm it is you before we act. If you are not satisfied with our answer you can complain to the Data Protection Commission of Ghana.",
        },
        {
          kind: "note",
          title: "One honest limit",
          text: "We cannot undo a file you already downloaded or posted. Deletion covers what we hold, not copies that have left our servers.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies and local storage",
      blocks: [
        {
          kind: "list",
          items: [
            "One essential cookie keeps you signed in. It is HttpOnly, so script on the page cannot read it, and it expires after seven days of inactivity.",
            "Your brand-kit choices and small interface preferences are kept in your browser's local storage on your own device.",
            "There are no third-party advertising cookies and no cross-site trackers on the marketing site.",
          ],
        },
        {
          kind: "p",
          text: "You can clear local storage from your browser settings at any time. Clearing the session cookie signs you out.",
        },
      ],
    },
    {
      id: "children",
      title: "Children",
      blocks: [
        {
          kind: "p",
          text: "AdGenie is for people aged 18 and over. We do not knowingly collect data from a child, and we never generate a child as a model — fashion for children is shown on a mannequin or as a digital kit. If you believe a child's data has reached us, write to us and we will remove it.",
        },
      ],
    },
    {
      id: "changes",
      title: "Changes and contact",
      blocks: [
        {
          kind: "p",
          text: "When we change how the service handles data, we update this page and the date at the top. A change that affects consent, or the way we use your content, will be announced in the app before it applies.",
        },
        {
          kind: "p",
          text: `Questions, requests and complaints go to ${site.email}, and a person answers. Say “privacy request” in the subject so it reaches the right inbox.`,
        },
      ],
    },
  ],
};

export const terms: LegalDoc = {
  slug: "terms",
  eyebrow: "Terms",
  title: "Terms of service",
  highlight: "that read like English.",
  intro:
    "The agreement between you and AdGenie Africa: what you get, what a credit buys, what we expect from you, and the limits on both sides.",
  updated,
  summary: [
    {
      label: "Your account",
      text: "One account per person or business, accurate details, and you keep your password to yourself. You must be 18 or older.",
    },
    {
      label: "Credits",
      text: "Credits are prepaid and spent per generation after you approve the quote. If a run fails, the credits come back automatically.",
    },
    {
      label: "Your content stays yours",
      text: "You own your photos, brand and outputs. You give us permission to process them only to make your campaign.",
    },
  ],
  sections: [
    {
      id: "agreement",
      title: "The agreement",
      blocks: [
        {
          kind: "p",
          text: "These terms apply when you use adgenie.africa, the AdGenie app and the campaign service behind them. By creating an account or using the service you accept them. If you do not accept them, please do not use the service.",
        },
        {
          kind: "p",
          text: "We may add features or change parts of the service. Where a change materially affects your rights or your credits, we will tell you in the app before it applies.",
        },
      ],
    },
    {
      id: "accounts",
      title: "Your account",
      blocks: [
        {
          kind: "list",
          items: [
            "You must be at least 18 years old and able to enter a contract.",
            "Give accurate details for the person or business using the account, and keep them current.",
            "One account per person or business. Do not share a login or resell access; if you need seats for a team, ask us.",
            "Keep your password private, and tell us at once if you think someone else has it.",
            "You are responsible for activity under your account, including campaigns started by someone you gave the password to.",
          ],
        },
      ],
    },
    {
      id: "credits",
      title: "Credits, quotes and plans",
      blocks: [
        {
          kind: "p",
          text: "AdGenie runs on credits. A credit is a prepaid unit that buys generation work. It is not money, it earns no interest, it has no cash value, and it cannot be transferred or withdrawn.",
        },
        {
          kind: "list",
          items: [
            "Before a campaign runs you see a quote: the work it will do and the credits it will cost. Nothing is charged until you approve it.",
            "Credits are taken when the work starts. If the work fails, the same credits are returned automatically, once.",
            "A campaign that delivered some files and failed on others is refunded for the failed pieces, not for what was delivered.",
            "Plans and subscriptions give an allowance for a period. What renews and what expires is shown at checkout before you pay.",
            "Signup and promotional credits are a gift, not a purchase. They are not refundable, and they can be withdrawn from an account used to farm them.",
          ],
        },
        {
          kind: "note",
          title: "If a balance ever looks wrong",
          text: "The credit ledger is append-only, so every movement has a reason and a reference. Write to us and we will show you the entries.",
        },
      ],
    },
    {
      id: "payments",
      title: "Paying",
      blocks: [
        {
          kind: "p",
          text: "You pay in Ghana cedis. Mobile money is handled by GTPay and cards by Advansis Pay, on their hosted pages. We receive confirmation of the amount and a reference, not your card or wallet details.",
        },
        {
          kind: "list",
          items: [
            "Prices, plans and any fee are shown before you confirm a payment.",
            "A payment is credited only when the provider confirms it. If it is delayed, write to us with the reference instead of paying twice.",
            "Where you see another currency, it is a display conversion for convenience. The amount charged is in cedis.",
            "If a payment is reversed after credits were spent, we may suspend the account until it is settled.",
          ],
        },
      ],
    },
    {
      id: "your-content",
      title: "Your content and the permission you give us",
      blocks: [
        {
          kind: "p",
          text: "You keep ownership of the photos, logos, text and brand assets you upload, and of the campaigns we generate for you.",
        },
        {
          kind: "p",
          text: "You give us a limited, non-exclusive permission to store, copy, resize, composite and transmit your content for one purpose: producing and delivering the campaign you asked for. It lasts while the content is in your account and ends when you delete it, except for records we must keep.",
        },
        {
          kind: "list",
          items: [
            "You confirm that you own the content or have permission to use it, including every person, logo and trademark in it.",
            "Photos of people need the attestation shown at upload. Do not upload someone who has not agreed.",
            "Do not upload a photo of a child for a model or fashion output.",
          ],
        },
      ],
    },
    {
      id: "ai-output",
      title: "AI output",
      blocks: [
        {
          kind: "p",
          text: "Images and copy are produced by machine learning and can be imperfect: a hand, a pattern or a word can come out wrong. Read every campaign before you post it. We do not guarantee that a platform will accept an ad, or that an ad will produce any particular result.",
        },
        {
          kind: "p",
          text: "Prices, phone numbers, business names and calls to action are drawn by our renderer from what you entered, never invented by the model. You remain responsible for the claims in your ads and for making sure they are true.",
        },
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      blocks: [
        { kind: "p", text: "Do not use AdGenie to:" },
        {
          kind: "list",
          items: [
            "break the law, or sell anything illegal in Ghana or in the market you target;",
            "show or describe a child as a model;",
            "depict a named real person, celebrity or public figure without their permission, or make a deepfake;",
            "create sexual, exploitative or nude imagery;",
            "make misleading claims about health, weight, skin, money, earnings or a product's effects;",
            "use a logo, trademark or trade name you do not have the right to use;",
            "send bulk messages, scrape the service, probe it for weaknesses, or work around credit charges and rate limits;",
            "harass, threaten or discriminate against anyone.",
          ],
        },
        {
          kind: "p",
          text: "We may refuse or remove a campaign, or suspend an account, when we believe it breaks these rules.",
        },
      ],
    },
    {
      id: "moderation",
      title: "Moderation and suspension",
      blocks: [
        {
          kind: "p",
          text: "Some categories get a human look before they run — health, money, jobs, betting, alcohol, and anything a safety filter flags. We may hold a campaign, ask you to change it, or decline it.",
        },
        {
          kind: "p",
          text: "We may suspend or close an account for abuse, fraud, an unpaid reversal or a serious breach of these terms. Where it is reasonable we will say why and give you a way to respond. Credits left on an account suspended for abuse are not refundable.",
        },
      ],
    },
    {
      id: "ip",
      title: "Our software and brand",
      blocks: [
        {
          kind: "p",
          text: "The AdGenie name, logo, interface, renderer, templates and code belong to us and our licensors. These terms give you the right to use the service, not to copy it. Do not reverse engineer, resell, white-label or rebuild the service from it without a written agreement.",
        },
      ],
    },
    {
      id: "third-party",
      title: "Other platforms",
      blocks: [
        {
          kind: "p",
          text: "AdGenie is independent. We are not affiliated with, endorsed by or sponsored by Meta, Instagram, Facebook, TikTok or WhatsApp. Posting uses your phone's own share sheet, so it is your account on that platform and their rules that apply to what you publish.",
        },
      ],
    },
    {
      id: "liability",
      title: "Limits",
      blocks: [
        {
          kind: "p",
          text: "We work hard to keep the service up, but it is provided as it is. To the extent the law allows, we are not liable for indirect or consequential loss, lost profit or lost opportunity, and our total liability on a claim is limited to the amount you paid us in the three months before the claim.",
        },
        {
          kind: "p",
          text: "Nothing here limits liability that cannot be limited by law, including for fraud, or for death or personal injury caused by negligence.",
        },
      ],
    },
    {
      id: "termination",
      title: "Ending it",
      blocks: [
        {
          kind: "p",
          text: "You can stop using AdGenie at any time and ask us to delete your account. We can close an account that breaks these terms, or one that has been inactive for a long time, giving notice where we can. Credits have no cash value, so closing an account does not turn a balance into money.",
        },
      ],
    },
    {
      id: "law",
      title: "Which law applies",
      blocks: [
        {
          kind: "p",
          text: "These terms are governed by the laws of Ghana. Disputes go to the courts of Accra, and we will try to resolve a complaint with you directly first.",
        },
      ],
    },
    {
      id: "changes-contact",
      title: "Changes and contact",
      blocks: [
        {
          kind: "p",
          text: "We update these terms as the service changes and show the date at the top. If a change materially affects your credits or your rights, we will notify you in the app before it takes effect.",
        },
        { kind: "p", text: `Write to ${site.email} with any question about these terms.` },
      ],
    },
  ],
};

export const safety: LegalDoc = {
  slug: "safety",
  eyebrow: "Safety",
  title: "Safety & consent",
  highlight: "is not an afterthought.",
  intro:
    "The rules we hold ourselves to when a photo becomes an ad: who can appear, what we refuse to make, and how claims stay honest.",
  updated,
  summary: [
    {
      label: "Consent first",
      text: "Photos of people are used only with an attestation that it is you or that you have permission. No public figures, ever.",
    },
    {
      label: "No children as models",
      text: "Fashion for children is shown on a mannequin or as a digital kit, never on a child.",
    },
    {
      label: "Code writes the facts",
      text: "Prices, phone numbers and calls to action come from your brief, not from a model's imagination.",
    },
  ],
  sections: [
    {
      id: "promise",
      title: "Three rules",
      blocks: [
        {
          kind: "list",
          items: [
            "A person appears in an ad only if they agreed to it, recorded at upload.",
            "No child is ever shown as a model, and no named real person is ever generated.",
            "Numbers and claims come from you. The model draws the picture; our code draws the facts.",
          ],
        },
        { kind: "p", text: "Everything below follows from those three." },
      ],
    },
    {
      id: "people",
      title: "Photos of people",
      blocks: [
        {
          kind: "p",
          text: "When you upload a photo with a person in it, you record whether it is you or someone who gave permission. That statement is stored with the file, with a timestamp and the version of the policy in force.",
        },
        {
          kind: "p",
          text: "We block prompts that name a real person, a celebrity or a public figure, and we do not swap a face onto a body. Withdrawal of consent is respected: write to us and the photo stops being used and is removed.",
        },
        {
          kind: "note",
          title: "What we cannot control",
          text: "Files you have already downloaded or posted live outside AdGenie. That is why every campaign is shown for review before you share it.",
        },
      ],
    },
    {
      id: "minors",
      title: "Children",
      blocks: [
        {
          kind: "p",
          text: "A child is never used as a model. In the 360° studio, choosing Kids removes the virtual-model option, and the API converts a model request to a mannequin before the scene prompt is built. Children's fashion is shown on a headless mannequin or as a digital kit.",
        },
        {
          kind: "p",
          text: "If an uploaded photo appears to show a child, the campaign is held for human review instead of run. Accounts that try to work around this are suspended.",
        },
      ],
    },
    {
      id: "we-wont",
      title: "What we will not make",
      blocks: [
        {
          kind: "list",
          items: [
            "Sexual, nude or exploitative imagery of anyone.",
            "Deepfakes, or any image made to look like a named real person.",
            "Weight-loss, skin-lightening or body-altering claims that mislead about a product.",
            "Medical cures, guaranteed earnings, or invented ratings, testimonials, awards or “official” badges.",
            "Targeted political persuasion or political advertising.",
            "Anything that harasses, threatens or discriminates.",
          ],
        },
        {
          kind: "p",
          text: "Health, finance, jobs, betting and alcohol campaigns get extra care: we show your own text, add notices where the platform requires them, and may send the campaign to review before it runs.",
        },
      ],
    },
    {
      id: "claims",
      title: "Honest claims",
      blocks: [
        {
          kind: "p",
          text: "Our renderer draws the price, the business name, the phone or WhatsApp number and the call to action from what you typed. A model never writes those, so a price cannot be hallucinated.",
        },
        {
          kind: "p",
          text: "Everything else is still your claim. You are responsible for what you say about your product, and for holding the evidence behind it.",
        },
      ],
    },
    {
      id: "labelling",
      title: "Labelling AI content",
      blocks: [
        {
          kind: "p",
          text: "Every output carries an AI-generated flag in our records. Some platforms and markets require a visible label on AI-made media; we offer a label you can switch on, and may add one automatically where the rule is clear. Check the current rules of the platform you post to.",
        },
      ],
    },
    {
      id: "moderation",
      title: "Review and moderation",
      blocks: [
        {
          kind: "p",
          text: "Provider safety filters run on every generation, alongside our own blocklist: real-person names, banned categories, and prompts that ask a model to write text into the image. Flagged work is held, not quietly delivered.",
        },
        {
          kind: "p",
          text: "Staff with the right role can review a flagged campaign, and every decision is recorded in an audit log. Reports and takedowns are handled by a person, not an automated queue.",
        },
      ],
    },
    {
      id: "reporting",
      title: "Report something",
      blocks: [
        {
          kind: "p",
          text: "If you see a campaign that breaks these rules — yours, ours, or another seller's — tell us. Include the campaign link or a screenshot and what you think is wrong.",
        },
        {
          kind: "p",
          text: "We look at reports during working hours in Accra and will tell you what we did. Content that involves a child, or a likeness nobody agreed to, is taken down first and reviewed second.",
        },
      ],
    },
    {
      id: "languages",
      title: "Twi and Ga",
      blocks: [
        {
          kind: "p",
          text: "Twi and Ga are in beta. Machine output in those languages is improving but has not yet been rated by native speakers across the board, so every Twi or Ga campaign shows “review before posting”. We lift that label once the language review gate is met.",
        },
      ],
    },
    {
      id: "contact-safety",
      title: "Contact",
      blocks: [
        {
          kind: "p",
          text: `Safety questions, takedown requests and consent withdrawals go to ${site.email}, and a person replies.`,
        },
        {
          kind: "p",
          text: "This page explains how the product behaves. The Privacy policy covers data, and the Terms of service are the agreement.",
        },
      ],
    },
  ],
};
