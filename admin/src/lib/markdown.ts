/**
 * Tiny, dependency-free Markdown renderer for the blog preview.
 * Escapes HTML first, then applies a small subset (headings, bold, italic,
 * links, inline code, paragraphs). Good enough for an editor preview; the
 * public site is free to render posts however it likes.
 */
export function renderMarkdown(src: string): string {
  const esc = src
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const blocks = esc.split(/\n{2,}/).map((block) => {
    const b = block.trim();
    if (!b) return "";
    if (/^###\s+/.test(b)) return `<h3>${inline(b.replace(/^###\s+/, ""))}</h3>`;
    if (/^##\s+/.test(b)) return `<h2>${inline(b.replace(/^##\s+/, ""))}</h2>`;
    if (/^#\s+/.test(b)) return `<h2>${inline(b.replace(/^#\s+/, ""))}</h2>`;
    if (/^[-*]\s+/m.test(b)) {
      const items = b
        .split(/\n/)
        .filter((l) => /^[-*]\s+/.test(l))
        .map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ""))}</li>`)
        .join("");
      return `<ul class="list-disc pl-5 space-y-1">${items}</ul>`;
    }
    return `<p>${inline(b.replace(/\n/g, "<br/>"))}</p>`;
  });

  return blocks.join("\n");
}

function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1 py-0.5 text-xs">$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}
