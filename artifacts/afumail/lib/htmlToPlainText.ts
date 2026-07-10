/**
 * Convert an HTML email body to clean plain text for AI processing.
 * Strips all tags, preserves structure with newlines, decodes HTML entities.
 * Returns the original string unchanged if it doesn't look like HTML.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (!/^\s*</.test(html)) return html; // already plain text

  let text = html;

  // Remove style/script blocks entirely (content is noise)
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  // Inline images → alt text or nothing
  text = text.replace(/<img[^>]+alt=["']([^"']*)["'][^>]*\/?>/gi, "$1");
  text = text.replace(/<img[^>]*\/?>/gi, "");

  // Block-level elements → newlines to preserve paragraph structure
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?(p|div|section|article|header|footer|main|aside)[^>]*>/gi, "\n");
  text = text.replace(/<\/?h[1-6][^>]*>/gi, "\n");
  text = text.replace(/<\/?(li|dt|dd)[^>]*>/gi, "\n");
  text = text.replace(/<\/?(ul|ol|dl|table|thead|tbody|tfoot|tr|blockquote)[^>]*>/gi, "\n");
  text = text.replace(/<\/td>/gi, " ");
  text = text.replace(/<\/th>/gi, " ");
  text = text.replace(/<hr[^>]*\/?>/gi, "\n---\n");

  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      try { return String.fromCodePoint(n); } catch { return ""; }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = parseInt(hex, 16);
      try { return String.fromCodePoint(n); } catch { return ""; }
    });

  // Trim each line and collapse 3+ blank lines into 2
  text = text
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}
