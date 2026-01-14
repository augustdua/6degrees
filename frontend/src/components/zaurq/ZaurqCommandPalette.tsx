import * as React from "react";
import { useNavigate } from "react-router-dom";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SearchResult =
  | { kind: "route"; label: string; hint?: string; to: string }
  | { kind: "person"; label: string; hint?: string; connectionId: string };

const baseResults: SearchResult[] = [
  { kind: "route", label: "Home", hint: "Dashboard", to: "/" },
  { kind: "route", label: "My Network", hint: "People you know", to: "/network" },
  { kind: "route", label: "Discover People", hint: "Meet nearby", to: "/discover" },
  { kind: "route", label: "Feed", hint: "Network activity", to: "/feed" },
  { kind: "route", label: "Calendar", hint: "Calls & meetings", to: "/calendar" },
  { kind: "route", label: "Events", hint: "Meetups", to: "/events" },
  { kind: "route", label: "Moments", hint: "Private notes", to: "/moments" },
  { kind: "route", label: "Insights", hint: "Analytics", to: "/insights" },
];

export function ZaurqCommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCmdK = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      if (isCmdK) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const run = (item: SearchResult) => {
    onOpenChange(false);
    if (item.kind === "route") navigate(item.to);
    if (item.kind === "person") navigate(`/network/${item.connectionId}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search people, pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {baseResults.map((r) => (
            <CommandItem key={`${r.kind}:${r.label}`} onSelect={() => run(r)}>
              <div className="flex w-full items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate">{r.label}</div>
                  {r.hint ? <div className="truncate text-xs text-muted-foreground">{r.hint}</div> : null}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="People (placeholder)">
          {[
            { connectionId: "demo-1", label: "Kavita Rao", hint: "Bangalore • Product" },
            { connectionId: "demo-2", label: "Ravi Mehta", hint: "Mumbai • Founder" },
            { connectionId: "demo-3", label: "Sneha Iyer", hint: "Delhi • VC" },
          ].map((p) => (
            <CommandItem key={p.connectionId} onSelect={() => run({ kind: "person", ...p })}>
              <div className="min-w-0">
                <div className="truncate">{p.label}</div>
                <div className="truncate text-xs text-muted-foreground">{p.hint}</div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}


