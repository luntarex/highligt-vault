import Sqids from 'sqids';

// Helpers for human-readable URL slugs. The numeric id is reversibly encoded
// with Sqids and appended as a suffix, so links read like "title-Xb7Kp9".
// This is obfuscation (the alphabet ships in the bundle), not access control:
// it discourages naive id enumeration / scraping. Real authorization stays on
// the backend.
//
// The alphabet is letters-only (no digits) on purpose: a bare numeric suffix
// then unambiguously means a legacy/raw id, so old "/post/title-3" URLs and
// id-only links keep resolving.
const sqids = new Sqids({
  alphabet: 'maHGBSPxnrcqFpWAezNoTCwYEyuQdLlhJijgXURsZkvfDMKtOVIb',
  minLength: 6
});

const TURKISH_MAP: Record<string, string> = {
  'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
  'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
};

const MAX_SLUG_LENGTH = 60;

export function slugify(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (ch) => TURKISH_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip remaining accents
    .replace(/[^a-z0-9]+/g, '-')       // non-alphanumeric -> dash
    .replace(/^-+|-+$/g, '')           // trim leading/trailing dashes
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');              // trim again after slicing
}

// Reversibly encodes a numeric id to a short opaque token (e.g. 3 -> "Xb7Kp9").
export function encodeId(id: number | string): string {
  return sqids.encode([Number(id)]);
}

// Builds "slug-token"; falls back to just the token when no text is available.
export function buildSlugId(text: string | null | undefined, id: number | string): string {
  const slug = slugify(text);
  const token = encodeId(id);
  return slug ? `${slug}-${token}` : token;
}

// Extracts the numeric id from a "slug-token" param. Handles encoded tokens as
// well as bare numeric ids (legacy URLs / id-only links).
export function extractId(param: string | null | undefined): number | null {
  if (!param) return null;
  const tail = param.substring(param.lastIndexOf('-') + 1);
  if (!tail) return null;

  // Bare numeric suffix -> legacy/raw id.
  if (/^\d+$/.test(tail)) return Number(tail);

  const decoded = sqids.decode(tail);
  if (decoded.length > 0) return decoded[0];

  // Last resort: whole param is a bare number.
  return /^\d+$/.test(param) ? Number(param) : null;
}

// True when the param is a bare numeric id (legacy URLs / id-only links).
export function isNumericId(param: string | null | undefined): boolean {
  if (!param) return false;
  return /^\d+$/.test(param);
}
