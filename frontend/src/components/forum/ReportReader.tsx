import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { List } from 'lucide-react';

export function normalizeReadableMarkdown(input: string): string {
  let s = (input || '').replace(/\r\n/g, '\n').trim();
  if (!s) return '';

  const hasHeadings = /^#{1,6}\s+/m.test(s);
  const hasBlankLines = /\n\s*\n/.test(s);
  const hasCode = /```/.test(s);

  // Detect our pipeline-style "flat" reports (common patterns: `1) TL;DR`, lots of `**Label:**` segments,
  // and headings encoded as plain text rather than markdown headers).
  const looksLikePipelineReport =
    /(^|\n)\s*\d+\)\s+/.test(s) ||
    /(^|\n)\s*TL;DR\s*$/im.test(s) ||
    /\*\*[^*]{2,80}\*\*:\s/.test(s);

  // If the report is already well-formed markdown (blank lines or code blocks), leave it alone.
  // Otherwise, apply a readability pass for pipeline reports and/or "flat" markdown.
  if (!hasBlankLines && !hasCode && (looksLikePipelineReport || !hasHeadings)) {
    // 1) Convert numbered section headers like `1) Something` into real markdown headings.
    // Also handle variants like `2)The Big Shift: ...` (missing a space).
    s = s.replace(/^\s*(\d+)\)\s*(.+?)\s*$/gm, (_, __n: string, title: string) => `## ${title.trim()}`);

    // 2) Promote a standalone TL;DR line into a heading.
    s = s.replace(/^\s*TL;DR\s*$/gim, '## TL;DR');

    // 3) If the first line looks like a title, promote it to `# ...`.
    // (Avoid doing this if it’s already a heading or is an obviously long paragraph.)
    {
      const lines = s.split('\n');
      const first = (lines[0] || '').trim();
      if (first && !/^#{1,6}\s+/.test(first) && first.length <= 120 && !/^([-*]|\d+[.)])\s+/.test(first)) {
        lines[0] = `# ${first}`;
        s = lines.join('\n');
      }
    }

    // 4) Many pipeline reports stitch multiple bold "Label:" chunks into one long line.
    // Insert paragraph breaks before `**Label:**` blocks (but not at the start of the document/line).
    s = s.replace(/([.!?])\s+(?=\*\*[A-Z][^*]{2,80}\*\*:\s)/g, '$1\n\n');
    s = s.replace(/([^\n])\s+(?=\*\*[A-Z][^*]{2,80}\*\*:\s)/g, '$1\n\n');

    // 5) If there are still no blank lines, add sensible paragraph spacing between lines,
    // while preserving list continuity (don't break list items apart).
    if (!/\n\s*\n/.test(s) && /\n/.test(s)) {
      const rawLines = s.split('\n').map((l) => l.trim()).filter(Boolean);
      const out: string[] = [];
      const isList = (l: string) => /^([-*]|\d+[.)])\s+/.test(l);
      const isHeadingLine = (l: string) => /^#{1,6}\s+/.test(l);

      for (const line of rawLines) {
        if (out.length === 0) {
          out.push(line);
          continue;
        }
        const prev = out[out.length - 1];
        const prevIsList = isList(prev);
        const currIsList = isList(line);
        const prevIsHeading = isHeadingLine(prev);
        const currIsHeading = isHeadingLine(line);

        // Always add blank line before headings, except if we're already at a blank line.
        if (currIsHeading) {
          out.push('');
          out.push(line);
          continue;
        }

        // Preserve list continuity (no blank lines between list items).
        if (prevIsList && currIsList) {
          out.push(line);
          continue;
        }

        // Add spacing after headings and between paragraph-ish lines.
        if (prevIsHeading || !prevIsList) {
          out.push('');
        }
        out.push(line);
      }

      s = out.join('\n');
    }
  }

  // Always apply a light "paragraph breathe" pass for pipeline-style bold labels,
  // even when the markdown already has headings/blank lines. This is safe and dramatically
  // improves readability for patterns like `**X:** ... **Y:** ...` in one paragraph.
  if (!hasCode) {
    // If there are 2+ bold-label segments, add paragraph breaks before each label (except the first).
    const boldLabelRe = /\*\*[^*]{2,80}\*\*:\s/g;
    const matches = s.match(boldLabelRe) || [];
    if (matches.length >= 2) {
      s = s.replace(/([^\n])\s+(?=\*\*[A-Z][^*]{2,80}\*\*:\s)/g, '$1\n\n');
    }

    // Convert standalone bold lines (often used as pseudo-headings) into real headings.
    // Example: `**1. The Death of the Pure Marketplace**` -> `### 1. The Death of the Pure Marketplace`
    s = s.replace(/^(?!\s*[-*]|\s*\d+[.)])\s*\*\*([^*\n]{3,120})\*\*\s*$/gm, '### $1');
  }

  // As a fallback: if it's flat text with newlines and no blank lines, ensure paragraphs.
  if (!/\n\s*\n/.test(s) && /\n/.test(s) && !hasCode) {
    const rawLines = s.split('\n').map((l) => l.trim()).filter(Boolean);
    if (rawLines.length > 1) {
      s = rawLines.join('\n\n');
    }
  }

  return s;
}

export function stripInlineMarkdown(input: string): string {
  const s = (input || '').trim();
  if (!s) return '';
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

type TocItem = { level: number; text: string; id: string };

function stripLeadingH1(markdown: string): string {
  const s = (markdown || '').replace(/\r\n/g, '\n');
  const lines = s.split('\n');
  // Remove leading blank lines
  while (lines.length && !lines[0].trim()) lines.shift();
  // If the first meaningful line is an H1, remove it (to avoid duplicating the page title)
  if (lines.length && /^#\s+/.test(lines[0])) {
    lines.shift();
    // Remove one following blank line if present
    if (lines.length && !lines[0].trim()) lines.shift();
  }
  return lines.join('\n').trim();
}

function computeToc(markdown: string): TocItem[] {
  if (!markdown) return [];
  const headings = Array.from(markdown.matchAll(/^(#{1,3})\s+(.+)$/gm));
  return headings.map((m) => {
    const level = m[1].length;
    const text = m[2].trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return { level, text, id };
  });
}

// Custom scrollbar-hidden styles (inject once)
const scrollbarHideStyles = `
  .report-scroll-container {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }
  .report-scroll-container::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
`;

export function ReportReader({
  markdown,
  tocTitle = 'Contents',
  showTocIfAtLeast = 3,
  maxHeight,
}: {
  markdown: string;
  tocTitle?: string;
  showTocIfAtLeast?: number;
  maxHeight?: string;
}) {
  const normalized = useMemo(() => normalizeReadableMarkdown(markdown), [markdown]);
  const displayMd = useMemo(() => stripLeadingH1(normalized), [normalized]);
  const toc = useMemo(() => computeToc(displayMd), [displayMd]);
  const showToc = toc.length >= showTocIfAtLeast;

  return (
    <>
      {/* Inject scrollbar-hide styles */}
      <style>{scrollbarHideStyles}</style>
      
      <div 
        className={`flex report-scroll-container ${maxHeight ? 'overflow-y-auto' : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {showToc && (
          <aside className="hidden lg:block w-64 shrink-0 border-r border-[#1a1a1a] bg-[#080808]">
            <div className="sticky top-0 p-5 pt-6">
              <div className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-4 flex items-center gap-2">
                <List className="w-3.5 h-3.5" /> {tocTitle}
              </div>
              <nav className="space-y-2">
                {toc.map((h, idx) => (
                  <a
                    key={idx}
                    href={`#${h.id}`}
                    className={`block transition-colors leading-snug ${
                      h.level === 1 
                        ? 'text-[#ccc] font-medium text-[13px] hover:text-[#CBAA5A]' 
                        : h.level === 2 
                          ? 'text-[#888] pl-3 text-[12px] hover:text-[#bbb]' 
                          : 'text-[#666] pl-5 text-[11px] hover:text-[#999]'
                    }`}
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}

        <main className="flex-1 min-w-0 px-8 py-12 sm:px-16 sm:py-16 lg:px-20">
          <article
            className={`
              prose prose-invert prose-lg max-w-[720px] mx-auto
              
              /* ===========================================
                 GOLDEN RATIO TYPOGRAPHY SCALE
                 Base: 18px, Ratio: 1.618
                 18 → 29 → 47 → 76 (rounded to nice values)
                 =========================================== */
              
              /* Headings - Golden ratio sizes with generous spacing */
              prose-headings:font-gilroy prose-headings:text-white prose-headings:scroll-mt-32 prose-headings:tracking-tight prose-headings:leading-[1.2]
              
              /* H1: 42px - Main title */
              prose-h1:text-[36px] prose-h1:sm:text-[42px] prose-h1:font-bold prose-h1:mb-12 prose-h1:mt-0 prose-h1:pb-6 prose-h1:border-b prose-h1:border-[#222]
              
              /* H2: 32px - Section headers (golden accent) */
              prose-h2:text-[26px] prose-h2:sm:text-[32px] prose-h2:font-bold prose-h2:mt-20 prose-h2:mb-8 prose-h2:text-[#CBAA5A] prose-h2:pt-8 prose-h2:border-t prose-h2:border-[#1a1a1a]
              
              /* H3: 24px - Subsection headers */
              prose-h3:text-[20px] prose-h3:sm:text-[24px] prose-h3:font-semibold prose-h3:mt-16 prose-h3:mb-6 prose-h3:text-[#f0f0f0]
              
              /* H4: 20px - Minor headers */
              prose-h4:text-[18px] prose-h4:sm:text-[20px] prose-h4:font-semibold prose-h4:mt-12 prose-h4:mb-4 prose-h4:text-[#ddd]
              
              /* ===========================================
                 BODY TEXT - Optimized for readability
                 =========================================== */
              
              /* Paragraphs - 18px with 2x line height for breathing room */
              prose-p:text-[17px] prose-p:sm:text-[18px] prose-p:text-[#c8c8c8] prose-p:leading-[2.05] prose-p:mb-9 prose-p:tracking-[0.015em]
              
              /* Lists - Same sizing as paragraphs */
              prose-ul:my-10 prose-ul:pl-6 prose-ul:space-y-4
              prose-ol:my-10 prose-ol:pl-6 prose-ol:space-y-4
              prose-li:text-[17px] prose-li:sm:text-[18px] prose-li:text-[#c8c8c8] prose-li:leading-[1.95] prose-li:mb-4 prose-li:marker:text-[#CBAA5A] prose-li:marker:font-bold
              
              /* Strong/Bold - Slightly brighter */
              prose-strong:text-white prose-strong:font-bold
              
              /* Emphasis */
              prose-em:text-[#e0e0e0] prose-em:italic
              
              /* ===========================================
                 LINKS - Clearly clickable
                 =========================================== */
              prose-a:text-[#CBAA5A] prose-a:underline prose-a:underline-offset-4 prose-a:font-medium prose-a:decoration-[#CBAA5A]/40 hover:prose-a:decoration-[#CBAA5A] hover:prose-a:text-[#e0c575]
              
              /* ===========================================
                 BLOCK ELEMENTS
                 =========================================== */
              
              /* Blockquotes - Standout styling */
              prose-blockquote:border-l-4 prose-blockquote:border-l-[#CBAA5A] prose-blockquote:bg-[#0a0a0a] prose-blockquote:py-6 prose-blockquote:px-8 prose-blockquote:my-12 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-[#aaa] prose-blockquote:text-[17px]
              
              /* Code */
              prose-code:text-[#CBAA5A] prose-code:bg-[#111] prose-code:px-2.5 prose-code:py-1 prose-code:rounded-md prose-code:text-[15px] prose-code:font-mono prose-code:border prose-code:border-[#222]
              prose-pre:bg-[#080808] prose-pre:border prose-pre:border-[#1a1a1a] prose-pre:rounded-2xl prose-pre:my-12 prose-pre:p-6
              
              /* Horizontal rules - Major section breaks */
              prose-hr:border-[#222] prose-hr:my-16
              
              /* Tables */
              prose-table:my-12
              prose-th:bg-[#0a0a0a] prose-th:border prose-th:border-[#222] prose-th:px-5 prose-th:py-4 prose-th:text-left prose-th:font-bold prose-th:text-[#ddd] prose-th:text-[15px]
              prose-td:border prose-td:border-[#222] prose-td:px-5 prose-td:py-4 prose-td:text-[#bbb] prose-td:text-[15px]
              
              /* Images */
              prose-img:rounded-2xl prose-img:my-12 prose-img:border prose-img:border-[#222]
            `}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children, ...props }) => (
                  <h1 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>
                    {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>
                    {children}
                  </h3>
                ),
                h4: ({ children, ...props }) => (
                  <h4 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>
                    {children}
                  </h4>
                ),
                // Links - ensure clickable and open external in new tab
                a: ({ href, children, ...props }) => {
                  const isExternal = href?.startsWith('http') || href?.startsWith('//');
                  return (
                    <a
                      href={href}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      className="text-[#CBAA5A] font-medium hover:underline hover:text-[#e0c575] transition-colors cursor-pointer"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                // Paragraphs
                p: ({ children, ...props }) => (
                  <p {...props}>{children}</p>
                ),
              }}
            >
              {displayMd}
            </ReactMarkdown>
          </article>
        </main>
      </div>
    </>
  );
}



