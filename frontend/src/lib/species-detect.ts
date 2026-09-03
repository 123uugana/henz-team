import type { Species } from "@/lib/api";

/**
 * Some readers/paths hand back the raw hex EPC instead of the decoded
 * ASCII serial (e.g. "4831303030303231" for "H10000021"). Decode it so
 * species detection and normalization see the readable form either way.
 */
export function decodeHexAsciiEpc(code: string): string | null {
  const compact = code.trim().replace(/[\s:-]/g, "");
  if (
    compact.length < 2 ||
    compact.length % 2 !== 0 ||
    !/^[0-9A-Fa-f]+$/.test(compact)
  ) {
    return null;
  }

  let decoded = "";
  for (let index = 0; index < compact.length; index += 2) {
    const value = Number.parseInt(compact.slice(index, index + 2), 16);
    if (value < 32 || value > 126) return null;
    decoded += String.fromCharCode(value);
  }

  return decoded || null;
}

/** Our tags encode species in their first letter: H = sheep, Y = goat. */
export function detectSpeciesFromTag(code: string): Species | null {
  const readable = decodeHexAsciiEpc(code) ?? code;
  const prefix = readable.trim().charAt(0).toUpperCase();
  if (prefix === "H") return "SHEEP";
  if (prefix === "Y") return "GOAT";
  return null;
}

export function normalizeTagEpc(code: string): string {
  const normalized = code.trim().replace(/\s+/g, "").toUpperCase();
  if (/^[0-9A-F]+$/.test(normalized) && normalized.length % 2 === 0) {
    return normalized;
  }
  return normalized.replace(/^([HY])-?/, "$1-");
}
