import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { List } from 'lucide-react';

export function normalizeReadableMarkdown(input: string): string {
  const s = (input || '').trim();
  if (!s) return '';

  const hasHeadings = /^#{1,6}\s+/m.test(s);
  const hasLists = /^\s*([-*]|\d+\.)\s+/m.test(s);
  const hasCode = /```/.test(s);
  const hasBlankLines = /\n\s*\n/.test(s);
  if (hasHeadings || hasLists || hasCode || hasBlankLines) return s;

  if (/\n/.test(s)) {
    return s
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n\n');
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

export function ReportReader({
  markdown,
  tocTitle = 'Contents',
  showTocIfAtLeast = 3,
}: {
  markdown: string;
  tocTitle?: string;
  showTocIfAtLeast?: number;
}) {
  const normalized = useMemo(() => normalizeReadableMarkdown(markdown), [markdown]);
  const toc = useMemo(() => computeToc(normalized), [normalized]);
  const showToc = toc.length >= showTocIfAtLeast;

  return (
    <div className="flex">
      {showToc && (
        <aside className="hidden lg:block w-72 border-r border-[#1a1a1a] p-4">
          <div className="sticky top-4">
            <div className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-3 flex items-center gap-2">
              <List className="w-3 h-3" /> {tocTitle}
            </div>
            <nav className="space-y-1.5">
              {toc.map((h, idx) => (
                <a
                  key={idx}
                  href={`#${h.id}`}
                  className={`block hover:text-white transition-colors ${
                    h.level === 1 ? 'text-[#bbb] font-medium' : h.level === 2 ? 'text-[#888] pl-3 text-sm' : 'text-[#666] pl-6 text-xs'
                  }`}
                >
                  {h.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}

      <main className="flex-1 p-5 sm:p-7">
        <article
          className={`prose prose-invert max-w-none
          prose-headings:font-gilroy prose-headings:text-white prose-headings:scroll-mt-24
          prose-h1:text-2xl prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-[#222]
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-[#CBAA5A]
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-[#bbb]
          prose-p:text-[#cfcfcf] prose-p:leading-relaxed
          prose-li:text-[#cfcfcf]
          prose-strong:text-white
          prose-a:text-[#CBAA5A] prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-4 prose-blockquote:border-l-[#CBAA5A] prose-blockquote:bg-[#111] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
          prose-code:text-[#CBAA5A] prose-code:bg-[#111] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#222] prose-pre:rounded-lg
          prose-hr:border-[#222]
          prose-th:bg-[#111] prose-th:border prose-th:border-[#222] prose-td:border prose-td:border-[#222]`}
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
            }}
          >
            {normalized}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}



