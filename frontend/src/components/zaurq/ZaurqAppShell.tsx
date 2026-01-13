import React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, Gift, BarChart3, NotebookPen, Plane, Rss, Settings, Users, Plus, Search, Calendar, CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ZaurqCommandPalette } from "@/components/zaurq/ZaurqCommandPalette";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/network", label: "My Network", icon: Users },
  { to: "/feed", label: "Feed", icon: Rss },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/moments", label: "Moments", icon: NotebookPen },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/gifts", label: "Gifts", icon: Gift },
  { to: "/trips", label: "Plan Trips", icon: Plane },
  { to: "/settings", label: "Settings", icon: Settings },
];

function usePageTitleFromPath(pathname: string): string {
  if (pathname === "/") return "Home";
  const hit = navItems.find((i) => pathname === i.to);
  if (hit) return hit.label;
  if (pathname.startsWith("/network/")) return "Person Profile";
  return "CrossLunch";
}

export default function ZaurqAppShell() {
  const { user } = useAuth();
  const { counts } = useNotificationCounts();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);

  const title = usePageTitleFromPath(location.pathname);
  const notifBadge = Math.min(99, (counts?.unreadNotifications || 0) + (counts?.unreadMessages || 0));

  return (
    <SidebarProvider defaultOpen>
      <ZaurqCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <Sidebar variant="sidebar" collapsible="offcanvas">
        <SidebarHeader className="gap-2 border-b border-sidebar-border bg-sidebar px-3 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent transition-colors"
          >
            <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold" style={{ background: "var(--color-yellow)" }}>
              <span className="font-display text-lg text-foreground">C</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-none text-sidebar-foreground">CrossLunch</div>
              <div className="text-[11px] text-sidebar-foreground/60 leading-none mt-1">Meet nearby</div>
            </div>
          </button>

          <Button
            variant="outline"
            className="justify-start gap-2 bg-transparent"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm text-sidebar-foreground/80">Search</span>
            <span className="ml-auto text-[10px] text-sidebar-foreground/50">⌘K</span>
          </Button>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild tooltip={item.label} isActive={location.pathname === item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-md",
                        isActive 
                          ? "bg-brand-lav-tint border-l-[3px] border-l-brand-lavender text-ink-soft font-semibold" 
                          : "text-sidebar-foreground/80 border-l-[3px] border-l-transparent",
                      )
                    }
                    end
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="px-3 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-1 ring-sidebar-border">
              <AvatarImage src={user?.avatar || undefined} />
              <AvatarFallback className="text-xs">{(user?.firstName?.[0] || "?") + (user?.lastName?.[0] || "")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "You"}
              </div>
              <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:px-6">
            <SidebarTrigger className="md:hidden" />

            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold tracking-tight truncate">{title}</div>
              <div className="za-caption text-muted-foreground truncate">No public likes/comments — private-first</div>
            </div>

            <Button variant="outline" className="hidden md:flex gap-2" onClick={() => setPaletteOpen(true)}>
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate("/messages")}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notifBadge > 0 ? (
                <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground text-center">
                  {notifBadge > 99 ? "99+" : notifBadge}
                </span>
              ) : null}
            </Button>

            <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  aria-label="Quick add"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick add</DialogTitle>
                  <DialogDescription>Add a new contact, or log a moment while it’s fresh.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuickAddOpen(false);
                      navigate("/network");
                    }}
                  >
                    Add a new contact (MVP)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuickAddOpen(false);
                      navigate("/moments");
                    }}
                  >
                    Log a moment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main content */}
        <div className="min-h-[calc(100svh-3.5rem)] p-3 sm:p-6">
          <div className="za-app mx-auto w-full max-w-7xl">
          <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


