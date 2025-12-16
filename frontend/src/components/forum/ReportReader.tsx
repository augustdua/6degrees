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
  const toc = useMemo(() => computeToc(normalized), [normalized]);
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

        <main className="flex-1 min-w-0 px-6 py-8 sm:px-10 sm:py-10">
          <article
            className={`
              prose prose-invert max-w-3xl mx-auto
              
              /* Headings */
              prose-headings:font-gilroy prose-headings:text-white prose-headings:scroll-mt-24 prose-headings:tracking-tight
              prose-h1:text-[28px] prose-h1:sm:text-[32px] prose-h1:font-bold prose-h1:mb-8 prose-h1:mt-0 prose-h1:pb-4 prose-h1:border-b prose-h1:border-[#222] prose-h1:leading-tight
              prose-h2:text-[22px] prose-h2:sm:text-[24px] prose-h2:font-semibold prose-h2:mt-12 prose-h2:mb-5 prose-h2:text-[#CBAA5A] prose-h2:leading-snug
              prose-h3:text-[18px] prose-h3:sm:text-[20px] prose-h3:font-medium prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-[#e0e0e0] prose-h3:leading-snug
              prose-h4:text-[16px] prose-h4:font-medium prose-h4:mt-8 prose-h4:mb-3 prose-h4:text-[#bbb]
              
              /* Paragraphs - generous spacing */
              prose-p:text-[15px] prose-p:sm:text-[16px] prose-p:text-[#d0d0d0] prose-p:leading-[1.8] prose-p:mb-6 prose-p:tracking-[0.01em]
              
              /* Lists */
              prose-ul:my-6 prose-ul:pl-0
              prose-ol:my-6 prose-ol:pl-0
              prose-li:text-[15px] prose-li:sm:text-[16px] prose-li:text-[#d0d0d0] prose-li:leading-[1.7] prose-li:mb-3 prose-li:marker:text-[#CBAA5A]
              
              /* Strong/Bold */
              prose-strong:text-white prose-strong:font-semibold
              
              /* Links */
              prose-a:text-[#CBAA5A] prose-a:no-underline prose-a:font-medium hover:prose-a:underline hover:prose-a:text-[#e0c575]
              
              /* Blockquotes */
              prose-blockquote:border-l-[3px] prose-blockquote:border-l-[#CBAA5A] prose-blockquote:bg-[#0d0d0d] prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:my-8 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-[#bbb]
              
              /* Code */
              prose-code:text-[#CBAA5A] prose-code:bg-[#111] prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-[14px] prose-code:font-mono
              prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-[#1a1a1a] prose-pre:rounded-xl prose-pre:my-8 prose-pre:p-5
              
              /* Horizontal rules */
              prose-hr:border-[#222] prose-hr:my-10
              
              /* Tables */
              prose-table:my-8
              prose-th:bg-[#111] prose-th:border prose-th:border-[#222] prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-[#ccc]
              prose-td:border prose-td:border-[#222] prose-td:px-4 prose-td:py-3 prose-td:text-[#bbb]
              
              /* Images */
              prose-img:rounded-xl prose-img:my-8 prose-img:border prose-img:border-[#222]
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
                // Add spacing after each paragraph
                p: ({ children, ...props }) => (
                  <p {...props}>{children}</p>
                ),
              }}
            >
              {normalized}
            </ReactMarkdown>
          </article>
        </main>
      </div>
    </>
  );
}



