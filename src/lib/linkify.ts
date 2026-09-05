// Splits text on a regex requiring a literal http(s):// prefix, so only real matched
// URL substrings can ever become a link's href — no way for a javascript: or data:
// scheme to sneak in via post text (untrusted data, never rendered as markup).
const URL_SPLIT_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g;
const URL_TEST_REGEX = /^https?:\/\//;

export interface TextSegment {
  text: string;
  isUrl: boolean;
}

export function splitTextAndUrls(text: string): TextSegment[] {
  return text.split(URL_SPLIT_REGEX).map((part) => ({ text: part, isUrl: URL_TEST_REGEX.test(part) }));
}
