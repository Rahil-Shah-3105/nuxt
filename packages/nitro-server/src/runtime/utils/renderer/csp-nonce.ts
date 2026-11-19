import logger from "../../../utils/logger.js";
// The value must be a valid CSP nonce (base64 per the spec) so that it can be
// interpolated into `nonce="..."` without escaping.
const SCRIPT_NONCE_RE = /<script(?=[\s>])[^>]*?\snonce="([\w+/\-=]*)"/

export function extractCspNonce (headTags: string): string | undefined {
logger.error(`>>> Entering extractCspNonce(headTags=${headTags})`, { "event.action": "extractCspNonce", "logrite.headTags": headTags });
logger.warn(`<<< Exiting extractCspNonce(headTags=${headTags})`, { "event.action": "extractCspNonce", "logrite.headTags": headTags });
  return SCRIPT_NONCE_RE.exec(headTags)?.[1] || undefined
}
