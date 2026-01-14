import React from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

import { apiGet } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SeedProfileListItem = {
  id: string;
  slug: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  headline: string | null;
  location: string | null;
  profile_picture_url: string | null;
  status: string;
  created_at: string;
};

export default function DiscoverPeople() {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<SeedProfileListItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);

  const load = React.useCallback(
    async ({ reset }: { reset: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const nextOffset = reset ? 0 : offset;
        const params = new URLSearchParams();
        params.set("limit", "48");
        params.set("offset", String(nextOffset));
        if (q.trim()) params.set("q", q.trim());

        const data = await apiGet(`/api/seed-profiles?${params.toString()}`, { skipCache: true });
        const next = (data?.seed_profiles || []) as SeedProfileListItem[];

        setItems((prev) => (reset ? next : [...prev, ...next]));
        setOffset(nextOffset + next.length);
        setHasMore(next.length > 0);
      } catch (e: any) {
        setError(e?.message || "Failed to load people");
      } finally {
        setLoading(false);
      }
    },
    [offset, q]
  );

  React.useEffect(() => {
    // Initial load
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setHasMore(true);
    load({ reset: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold tracking-tight">Discover People</div>
        <div className="text-sm text-muted-foreground">Browse the directory (seed profiles + claimed profiles).</div>
      </div>

      <form onSubmit={onSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, headline, location..."
            className={cn(
              "w-full rounded-md border border-border bg-background px-9 py-2 text-sm outline-none",
              "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            )}
          />
        </div>
        <Button type="submit" disabled={loading}>
          Search
        </Button>
      </form>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => {
          const name =
            (p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown").trim();
          const initials = name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("");

          return (
            <Link
              key={p.id}
              to={`/p/${p.slug}`}
              className="rounded-xl border border-border bg-card p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 ring-1 ring-border">
                  <AvatarImage src={p.profile_picture_url || undefined} />
                  <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{name}</div>
                  {p.headline ? <div className="truncate text-xs text-muted-foreground">{p.headline}</div> : null}
                  {p.location ? <div className="truncate text-xs text-muted-foreground">{p.location}</div> : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-center pt-2">
        <Button
          variant="outline"
          onClick={() => load({ reset: false })}
          disabled={loading || !hasMore}
        >
          {loading ? "Loading..." : hasMore ? "Load more" : "No more results"}
        </Button>
      </div>
    </div>
  );
}


