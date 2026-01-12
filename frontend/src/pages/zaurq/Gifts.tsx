import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, CalendarDays } from "lucide-react";

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

export default function Gifts() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Gifts
          </CardTitle>
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
              <CardTitle>Popular gifts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {["Coffee", "Books", "Dinner", "Small experiences"].map((g) => (
                <Button key={g} variant="outline" className="justify-start">
                  {g}
                </Button>
              ))}
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


