/**
 * Minimal Markdown → HTML renderer.
 *
 * Deliberately small. It covers exactly the constructs used by the Olibana
 * source documents and nothing more; a full CommonMark implementation would be
 * a dependency this project does not need (SSOT §40: smallest sufficient
 * surface, §41: native first).
 *
 * Supported: headings, paragraphs, unordered and ordered lists, blockquotes,
 * fenced code, tables, horizontal rules, and the inline set below.
 * Everything is escaped before inline formatting is applied, so document text
 * cannot inject markup.
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline formatting. Input must already be escaped. */
function inline(text: string): string {
  return text
    // code first: its contents must not be reinterpreted
    .replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) =>
      `<a href="${href}">${label}</a>`);
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const UL_ITEM = /^\s*[-*]\s+(.*)$/;
const OL_ITEM = /^\s*\d+\.\s+(.*)$/;
const HR = /^\s*(-{3,}|\*{3,})\s*$/;
const QUOTE = /^>\s?(.*)$/;
const FENCE = /^```/;
const TABLE_SEP = /^\s*\|[\s:|-]+\|\s*$/;

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function tableRow(line: string): string[] {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

export function renderMarkdown(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let i = 0;

  const flushParagraph = (buffer: string[]): void => {
    if (buffer.length === 0) return;
    out.push(`<p>${inline(escapeHtml(buffer.join(' ')))}</p>`);
    buffer.length = 0;
  };

  const paragraph: string[] = [];

  while (i < lines.length) {
    const line = lines[i] as string;

    if (FENCE.test(line)) {
      flushParagraph(paragraph);
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i] as string)) {
        code.push(lines[i] as string);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph(paragraph);
      i += 1;
      continue;
    }

    if (HR.test(line)) {
      flushParagraph(paragraph);
      out.push('<hr>');
      i += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph(paragraph);
      const level = (heading[1] as string).length;
      const text = heading[2] as string;
      out.push(`<h${level} id="${slug(text)}">${inline(escapeHtml(text))}</h${level}>`);
      i += 1;
      continue;
    }

    // table: a header row followed by a separator row
    if (line.trim().startsWith('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1] as string)) {
      flushParagraph(paragraph);
      const head = tableRow(line);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && (lines[i] as string).trim().startsWith('|')) {
        body.push(tableRow(lines[i] as string));
        i += 1;
      }
      const th = head.map((c) => `<th>${inline(escapeHtml(c))}</th>`).join('');
      const rows = body
        .map((r) => `<tr>${r.map((c) => `<td>${inline(escapeHtml(c))}</td>`).join('')}</tr>`)
        .join('');
      // Wide tables scroll inside their own container rather than the page.
      out.push(`<div class="table-scroll"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`);
      continue;
    }

    if (QUOTE.test(line)) {
      flushParagraph(paragraph);
      const quoted: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i] as string)) {
        quoted.push((QUOTE.exec(lines[i] as string) as RegExpExecArray)[1] as string);
        i += 1;
      }
      out.push(`<blockquote>${renderMarkdown(quoted.join('\n'))}</blockquote>`);
      continue;
    }

    if (UL_ITEM.test(line) || OL_ITEM.test(line)) {
      flushParagraph(paragraph);
      const ordered = OL_ITEM.test(line);
      const pattern = ordered ? OL_ITEM : UL_ITEM;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i] as string)) {
        const m = pattern.exec(lines[i] as string) as RegExpExecArray;
        items.push(`<li>${inline(escapeHtml(m[1] as string))}</li>`);
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    paragraph.push(line.trim());
    i += 1;
  }

  flushParagraph(paragraph);
  return out.join('\n');
}

/**
 * Extracts one section of a document by heading text, up to the next heading
 * of the same or higher level. Used to publish parts of internal documents
 * without copying their content into a second place that could drift.
 */
export function extractSection(source: string, headingText: string): string | null {
  const lines = source.split('\n');
  const startIndex = lines.findIndex((l) => {
    const m = HEADING.exec(l);
    return m !== null && (m[2] as string).trim() === headingText;
  });
  if (startIndex === -1) return null;

  const startMatch = HEADING.exec(lines[startIndex] as string) as RegExpExecArray;
  const startLevel = (startMatch[1] as string).length;

  const rest = lines.slice(startIndex + 1);
  const endOffset = rest.findIndex((l) => {
    const m = HEADING.exec(l);
    return m !== null && (m[1] as string).length <= startLevel;
  });

  const body = endOffset === -1 ? rest : rest.slice(0, endOffset);
  return body.join('\n').trim();
}
