import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Block =
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'callout'; title?: string; items: string[] }
  | { type: 'table'; caption?: string; headers: string[]; rows: string[][] }
  | { type: 'divider' };

export type ReportDocument = {
  version: 1;
  title: string;
  blocks: Block[];
};

function MdInline({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  );
}

export function ReportBlocksRenderer({ doc }: { doc: ReportDocument }) {
  return (
    <div className="px-8 py-12 sm:px-16 sm:py-16 lg:px-20">
      <div className="max-w-[720px] mx-auto">
        {/* Notion-like block rhythm */}
        <div className="space-y-8">
          {doc.blocks.map((b, idx) => {
            if (b.type === 'divider') {
              return <hr key={idx} className="border-[#222] my-10" />;
            }

            if (b.type === 'heading') {
              const Tag = b.level === 2 ? 'h2' : b.level === 3 ? 'h3' : 'h4';
              const cls =
                b.level === 2
                  ? 'text-[26px] sm:text-[32px] font-gilroy font-bold text-[#CBAA5A] tracking-tight leading-[1.2] mt-10 pt-6 border-t border-[#1a1a1a]'
                  : b.level === 3
                    ? 'text-[20px] sm:text-[24px] font-gilroy font-semibold text-white tracking-tight leading-[1.25]'
                    : 'text-[18px] sm:text-[20px] font-gilroy font-semibold text-[#ddd] tracking-tight leading-[1.25]';
              return (
                <Tag key={idx} className={cls}>
                  {b.text}
                </Tag>
              );
            }

            if (b.type === 'callout') {
              const calloutTitle = b.title || (idx === 0 ? 'TL;DR' : undefined);
              return (
                <div key={idx} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6">
                  {calloutTitle && (
                    <div className="text-[11px] uppercase tracking-widest text-[#888] font-bold mb-3">
                      {calloutTitle}
                    </div>
                  )}
                  <ul className="space-y-3">
                    {b.items.map((it, i) => (
                      <li key={i} className="text-[17px] sm:text-[18px] leading-[1.95] text-[#c8c8c8]">
                        <MdInline text={it} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }

            if (b.type === 'paragraph') {
              return (
                <div key={idx} className="text-[17px] sm:text-[18px] leading-[2.05] text-[#c8c8c8] tracking-[0.015em]">
                  <MdInline text={b.text} />
                </div>
              );
            }

            if (b.type === 'bullets' || b.type === 'numbered') {
              const ListTag = b.type === 'bullets' ? 'ul' : 'ol';
              const listCls = b.type === 'bullets' ? 'list-disc' : 'list-decimal';
              return (
                <ListTag key={idx} className={`${listCls} pl-6 space-y-3`}>
                  {b.items.map((it, i) => (
                    <li key={i} className="text-[17px] sm:text-[18px] leading-[1.95] text-[#c8c8c8] marker:text-[#CBAA5A] marker:font-bold">
                      <MdInline text={it} />
                    </li>
                  ))}
                </ListTag>
              );
            }

            if (b.type === 'table') {
              return (
                <div key={idx} className="overflow-x-auto rounded-2xl border border-[#1a1a1a]">
                  {b.caption && (
                    <div className="px-4 py-3 text-[12px] text-[#888] bg-[#0a0a0a] border-b border-[#1a1a1a]">
                      {b.caption}
                    </div>
                  )}
                  <table className="w-full text-left">
                    <thead className="bg-[#0a0a0a]">
                      <tr>
                        {b.headers.map((h, i) => (
                          <th key={i} className="px-4 py-3 text-[12px] uppercase tracking-wider text-[#ccc] border-b border-[#1a1a1a]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((r, ri) => (
                        <tr key={ri} className="border-b border-[#111]">
                          {r.map((c, ci) => (
                            <td key={ci} className="px-4 py-3 text-[14px] text-[#bbb] align-top">
                              <MdInline text={c} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}


