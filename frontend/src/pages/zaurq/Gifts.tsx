import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";
import { Gift, CalendarDays, Search, ExternalLink } from "lucide-react";

type GiftItem = {
  id: string;
  person: string;
  gift: string;
  when: string;
};

const history: GiftItem[] = [
  { id: "g1", person: "Ravi Mehta", gift: "Coffee beans", when: "Nov 12" },
  { id: "g2", person: "Kavita Rao", gift: "Notebook", when: "Oct 4" },
];

type GiftProduct = {
  shopify_product_id?: number;
  handle?: string;
  title?: string;
  price_min?: number | string | null;
  primary_image_url?: string | null;
};

export default function Gifts() {
  const { toast } = useToast();
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [products, setProducts] = React.useState<GiftProduct[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (q.trim()) qs.set("q", q.trim());
        qs.set("limit", "24");
        qs.set("offset", "0");

        const data = await apiGet(`/api/gifts/products?${qs.toString()}`, { skipCache: true });
        const list = Array.isArray(data?.products) ? data.products : [];
        if (!cancelled) setProducts(list);
      } catch (e: any) {
        if (!cancelled) {
          setProducts([]);
          toast({
            title: "Couldn’t load gifts catalog",
            description: e?.message || "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, toast]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Gifts
            </CardTitle>
            <div className="relative w-full sm:w-[360px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search gifts…" className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Track gift history, upcoming occasions, and ideas your network actually likes.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Gift history</CardTitle>
                <Badge variant="secondary">MVP</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{h.person}</div>
                    <div className="text-xs text-muted-foreground truncate">{h.gift}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{h.when}</div>
                </div>
              ))}
              <Button variant="secondary" className="w-full">
                Add gift
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Gift ideas</CardTitle>
                <Badge variant="outline">Catalog</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                This is powered by your existing `gifting_products` dataset via `GET /api/gifts/products`.
              </div>

              {loading ? (
                <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Loading gifts…</div>
              ) : products.length === 0 ? (
                <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
                  No gifts found. Try a different search.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.map((p) => {
                    const key = String(p.shopify_product_id || p.handle || p.title || Math.random());
                    const href = `https://boxupgifting.com/products/${encodeURIComponent(String(p.handle || ""))}`;
                    return (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors group"
                      >
                        <div className="aspect-square bg-muted overflow-hidden">
                          {p.primary_image_url ? (
                            <img
                              src={String(p.primary_image_url)}
                              alt={String(p.title || "Gift")}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-semibold text-foreground line-clamp-2">{String(p.title || "")}</div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <div className="text-[10px] text-muted-foreground">
                              {p.price_min != null && p.price_min !== ""
                                ? `₹${String(p.price_min)}`
                                : "—"}
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-[5.5rem] h-fit">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Upcoming occasions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { who: "Sneha Iyer", what: "Work anniversary", when: "Jan 20" },
                { who: "Kavita Rao", what: "Birthday", when: "Feb 2" },
              ].map((o) => (
                <div key={o.who} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.who}</div>
                    <div className="text-xs text-muted-foreground truncate">{o.what}</div>
                  </div>
                  <Badge variant="outline">{o.when}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Wishlists</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Coming soon — people can optionally add wishlists.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


