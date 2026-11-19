/**
 * Photos an owner uploads to shape a campaign: the product, a logo, a person
 * (only with consent) or the venue. These are references for the image model,
 * not templates — the renderer still draws every word (AGENTS.md rule 1), and
 * nothing here clones a face or swaps a head onto a talking avatar.
 *
 * No schema change: assets already store kind, storage path and consent, and a
 * campaign records which assets it uses inside `plan.brief.creative.photos`.
 */

export const PHOTO_KINDS = ["product", "logo", "person", "venue"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

export const PHOTO_KIND_LABELS: Record<PhotoKind, string> = {
  product: "Product",
  logo: "Logo",
  person: "Person",
  venue: "Venue",
};

export const PHOTO_KIND_HINTS: Record<PhotoKind, string> = {
  product: "The item straight on, in good light. No text overlays.",
  logo: "A square or wide logo on a plain background.",
  person: "Someone you have permission to show, facing the camera.",
  venue: "The room, the counter or the sign — whatever makes the place recognisable.",
};

/** Images only and small enough to upload on a phone data bundle. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** How many photos one campaign can use as references. */
export const PHOTO_LIMIT = 3;

/** Kind that requires an on-record consent attestation before it can exist. */
export const CONSENT_REQUIRED_KIND: PhotoKind = "person";

export const PHOTO_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPhotoKind(value: string): value is PhotoKind {
  return (PHOTO_KINDS as readonly string[]).includes(value);
}

export function photoKindLabel(kind: string): string {
  return isPhotoKind(kind) ? PHOTO_KIND_LABELS[kind] : "Photo";
}
