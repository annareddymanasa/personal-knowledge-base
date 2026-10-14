import DOMPurify from "dompurify";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function RichTextContent({
  content,
  className = "",
}) {
  const value = typeof content === "string" ? content : "";

  const containsFormatting = /<\/?(?:p|br|strong|b|em|i|u|s|h[1-6]|ul|ol|li|a|blockquote|pre|code|hr)\b/i.test(
    value
  );

  const html = containsFormatting
    ? value
    : `<p>${escapeHtml(value).replace(/\r?\n/g, "<br>")}</p>`;

  const safeHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: {
      html: true,
    },
  });

  return (
    <div
      className={`pkb-rich-display ${className}`.trim()}
      dangerouslySetInnerHTML={{
        __html: safeHtml,
      }}
    />
  );
}