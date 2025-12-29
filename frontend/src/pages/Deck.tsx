import React from "react";
import { API_BASE_URL } from "@/lib/api";

export default function Deck() {
  const [password, setPassword] = React.useState(() => localStorage.getItem("deck_password") || "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [html, setHtml] = React.useState<string | null>(null);

  async function loadDeck(pw: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/deck/master`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "x-deck-password": pw,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to load deck (${res.status})`);
      }

      const text = await res.text();

      // Inject demo URL so the <video> works in the hosted deck (srcDoc uses the parent origin by default)
      const demoUrl = `${API_BASE_URL}/api/deck/paynet-demo.mp4?password=${encodeURIComponent(pw)}`;
      const hydrated = text.replaceAll("../PayNetDemo.mp4", demoUrl);

      setHtml(hydrated);
      localStorage.setItem("deck_password", pw);
    } catch (e: any) {
      setHtml(null);
      setError(e?.message || "Failed to load deck");
    } finally {
      setLoading(false);
    }
  }

  if (html) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black">
        <iframe
          title="Zaurq Deck"
          className="h-full w-full border-0"
          // `srcDoc` keeps everything in a single HTML payload and avoids CSS bleeding into the app.
          srcDoc={html}
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">Deck</div>
            <div className="text-sm text-muted-foreground">Enter password to view the pitch deck.</div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <div className="mb-1 text-sm font-medium">Password</div>
              <input
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter deck password"
              />
            </label>
            <button
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              disabled={!password || loading}
              onClick={() => loadDeck(password)}
            >
              {loading ? "Loading…" : "Open"}
            </button>
          </div>
          {error ? <div className="mt-3 text-sm text-destructive">{error}</div> : null}
          <div className="mt-3 text-xs text-muted-foreground">Tip: share this page URL + password with anyone you want to view it.</div>
        </div>
      </div>
    </div>
  );
}


