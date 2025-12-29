import React from 'react';
import { ExternalLink, Video } from 'lucide-react';

type EmbeddedVideoProps = {
  title: string;
  url: string;
  className?: string;
};

function safeParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function getYouTubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '');
    return id || null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (u.pathname === '/watch') {
      const id = u.searchParams.get('v');
      return id || null;
    }
    const m1 = u.pathname.match(/^\/embed\/([^/]+)/);
    if (m1?.[1]) return m1[1];
    const m2 = u.pathname.match(/^\/shorts\/([^/]+)/);
    if (m2?.[1]) return m2[1];
  }

  return null;
}

function getLoomId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');
  if (host !== 'loom.com') return null;

  const m1 = u.pathname.match(/^\/share\/([^/]+)/);
  if (m1?.[1]) return m1[1];
  const m2 = u.pathname.match(/^\/embed\/([^/]+)/);
  if (m2?.[1]) return m2[1];

  return null;
}

function toEmbed(url: string): { kind: 'youtube' | 'loom'; embedUrl: string } | null {
  const u = safeParseUrl(url);
  if (!u) return null;

  const yt = getYouTubeId(u);
  if (yt) {
    const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(yt)}?rel=0&modestbranding=1`;
    return { kind: 'youtube', embedUrl };
  }

  const loom = getLoomId(u);
  if (loom) {
    const embedUrl = `https://www.loom.com/embed/${encodeURIComponent(loom)}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`;
    return { kind: 'loom', embedUrl };
  }

  return null;
}

export function EmbeddedVideo({ title, url, className }: EmbeddedVideoProps) {
  const parsed = safeParseUrl(url);
  const embed = toEmbed(url);

  if (!embed || !parsed) {
    return (
      <div className={className || "rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4"}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">{title}</h3>
        </div>
        <div className="text-[#666] font-gilroy text-sm">Invalid video URL.</div>
      </div>
    );
  }

  return (
    <div className={className || "rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4"}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] flex items-center gap-2">
          <Video className="w-3 h-3" />
          {title}
        </h3>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[9px] hover:underline inline-flex items-center gap-1"
        >
          Open <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl border border-[#222] bg-black">
        {/* Slightly taller than 16:9 for a more "card-like" Pinterest preview */}
        <div className="aspect-[4/3]">
          <iframe
            key={embed.embedUrl}
            src={embed.embedUrl}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
          />
        </div>
      </div>

      <div className="mt-2 text-[10px] text-[#666] font-gilroy tracking-[0.05em]">
        {embed.kind === 'youtube' ? 'YouTube' : 'Loom'} embed
      </div>
    </div>
  );
}


