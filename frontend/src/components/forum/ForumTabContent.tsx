import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/lib/api';
import { Loader2, Sparkles, Users, Gift, Calendar as CalendarIcon, Plane, Trophy, Send, MessageCircle, Video, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { SwipePeopleView } from '@/components/SwipePeopleView';
import SocialCapitalLeaderboard from '@/components/SocialCapitalLeaderboard';
import { usePeople } from '@/hooks/usePeople';
import { Input } from '@/components/ui/input';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';
// (Calendar month grid intentionally not used in single-day mode)

// Google Calendar Logo SVG
const GoogleCalendarLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className}>
    <path fill="#4285F4" d="M152.637 47.363H47.363v105.273h105.273z"/>
    <path fill="#EA4335" d="M152.637 152.637L200 152.637 200 47.363 152.637 47.363z"/>
    <path fill="#34A853" d="M47.363 200L152.637 200 152.637 152.637 47.363 152.637z"/>
    <path fill="#FBBC04" d="M0 152.637L47.363 152.637 47.363 47.363 0 47.363z"/>
    <path fill="#4285F4" d="M47.363 0L47.363 47.363 152.637 47.363 152.637 0z"/>
    <path fill="#188038" d="M152.637 152.637L200 200 200 152.637z"/>
    <path fill="#1967D2" d="M152.637 47.363L200 0 152.637 0z"/>
    <path fill="#FBBC04" d="M47.363 47.363L0 0 0 47.363z"/>
    <path fill="#EA4335" d="M47.363 152.637L0 200 47.363 200z"/>
    <path fill="#fff" d="M88 76h24v48H88zM76 88h48v24H76z"/>
  </svg>
);

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_order?: number;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink?: string | null;
  attendees?: { email: string; displayName?: string }[];
}

// Demo connections with real human photos - rectangular portraits
const DEMO_CONNECTIONS = [
  { id: 'demo-1', name: 'Priya Sharma', role: 'Product Manager at Google', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face', height: 'tall' },
  { id: 'demo-2', name: 'Arjun Patel', role: 'Founder at TechStart', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=450&fit=crop&crop=face', height: 'medium' },
  { id: 'demo-3', name: 'Maya Chen', role: 'Designer at Figma', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=520&fit=crop&crop=face', height: 'tall' },
  { id: 'demo-4', name: 'Rahul Gupta', role: 'Engineer at Meta', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face', height: 'short' },
  { id: 'demo-5', name: 'Ananya Reddy', role: 'VC at Sequoia', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=480&fit=crop&crop=face', height: 'medium' },
  { id: 'demo-6', name: 'Karthik Nair', role: 'CTO at Swiggy', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=520&fit=crop&crop=face', height: 'tall' },
  { id: 'demo-7', name: 'Neha Joshi', role: 'CEO at FinTech', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=450&fit=crop&crop=face', height: 'medium' },
  { id: 'demo-8', name: 'Aditya Kumar', role: 'Investor', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face', height: 'short' },
];

// Today's single person to reach out to
const DEMO_TODAY_PERSON = {
  id: 'demo-today',
  name: 'Vikram Singh',
  role: 'Angel Investor',
  photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&crop=face',
  reason: 'You haven\'t connected in 3 weeks',
};

const SIDEBAR_ITEMS = [
  { slug: 'all', name: 'Catch-Up', icon: Sparkles },
  { slug: 'moments', name: 'Moments', icon: Gift },
  { slug: 'gifts', name: 'Gifts', icon: Gift },
  { slug: 'events', name: 'Events', icon: CalendarIcon },
  { slug: 'trips', name: 'Trips', icon: Plane },
  { slug: 'people', name: 'People', icon: Users },
] as const;

const FEED_COMMUNITY_TILES = [
  {
    key: 'gifts',
    title: 'Gifts',
    subtitle: 'Curated picks for your people',
    image: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=1200&h=800&fit=crop',
    icon: Gift,
    slug: 'gifts',
  },
  {
    key: 'events',
    title: 'Events',
    subtitle: 'Invite + plan meetups',
    image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&h=800&fit=crop',
    icon: CalendarIcon,
    slug: 'events',
  },
  {
    key: 'trips',
    title: 'Trips',
    subtitle: 'Travel with friends',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=800&fit=crop',
    icon: Plane,
    slug: 'trips',
  },
] as const;

const LS_DAILY_DONE_KEY = 'zaurq_daily_done_dates_v1';
const LS_INVESTED_MINUTES_KEY = 'zaurq_invested_minutes_by_month_v1';
const LS_INVESTED_MONEY_KEY = 'zaurq_invested_money_cents_by_month_v1';

export const ForumTabContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<
    Array<{ displayName: string; photoUrl?: string | null; nextOccurrenceIso: string; daysUntil: number; connectionId?: string }>
  >([]);
  const [birthdaysLoading, setBirthdaysLoading] = useState(false);
  const [connectionCount, setConnectionCount] = useState<number | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<string>('all');
  
  // Calendar events
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | undefined>(() => new Date());
  const [googleCalendarError, setGoogleCalendarError] = useState<string | null>(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean>(false);
  const [embedCalendarId, setEmbedCalendarId] = useState<string>('primary');
  const [embedTimeZone, setEmbedTimeZone] = useState<string>(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  
  // Message input state
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Gifts state
  const [gifts, setGifts] = useState<any[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(false);

  // Lightweight local "daily task" tracker + investment metrics (until backend is added)
  const monthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [dailyDoneDates, setDailyDoneDates] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_DAILY_DONE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  const [investedMinutesByMonth, setInvestedMinutesByMonth] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(LS_INVESTED_MINUTES_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  });

  const [investedMoneyCentsByMonth, setInvestedMoneyCentsByMonth] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(LS_INVESTED_MONEY_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  });

  // People community state
  const [peopleViewMode, setPeopleViewMode] = useState<'swipe' | 'leaderboard'>('swipe');
  const { 
    discoveredUsers, 
    loading: peopleLoading, 
    discoverUsers,
  } = usePeople();

  // Load people when People community becomes active
  useEffect(() => {
    if (user && activeCommunity === 'people' && discoveredUsers.length === 0 && !peopleLoading) {
      discoverUsers({ excludeConnected: false }, 20, 0, false);
    }
  }, [activeCommunity, user, discoveredUsers.length, peopleLoading, discoverUsers]);

  // Fetch gifts when Gifts community is active
  useEffect(() => {
    if (!user || activeCommunity !== 'gifts') return;
    let cancelled = false;
    const run = async () => {
      setGiftsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '24');
        const r = await apiGet(`/api/gifts/products?${params.toString()}`, { skipCache: true });
        if (!cancelled) setGifts(Array.isArray(r?.products) ? r.products : []);
      } catch {
        if (!cancelled) setGifts([]);
      } finally {
        if (!cancelled) setGiftsLoading(false);
      }
    };
    const t = window.setTimeout(run, 300);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [activeCommunity, user?.id]);

  // Fetch active communities only
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const data = await apiGet('/api/forum/communities/active');
        setCommunities((data.communities || []) as Community[]);
      } catch (err) {
        console.error('Error fetching communities:', err);
      }
    };
    fetchCommunities();
  }, []);

  // Fetch upcoming birthdays
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const run = async () => {
      setBirthdaysLoading(true);
      try {
        const r = await apiGet('/api/connections/birthdays/upcoming?days=14&limit=6', { skipCache: true });
        const list = Array.isArray(r?.upcoming) ? r.upcoming : [];
        if (!cancelled) setUpcomingBirthdays(list);
      } catch {
        if (!cancelled) setUpcomingBirthdays([]);
      } finally {
        if (!cancelled) setBirthdaysLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user?.id]);

  const ymdLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const ymdCompactLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };

  const todayKeyLocal = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const markDailyDone = () => {
    const key = todayKeyLocal();
    setDailyDoneDates((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key].slice(-400);
      try {
        localStorage.setItem(LS_DAILY_DONE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const addInvestedMinutes = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    setInvestedMinutesByMonth((prev) => {
      const next = { ...prev, [monthKey]: (prev[monthKey] || 0) + Math.round(minutes) };
      try {
        localStorage.setItem(LS_INVESTED_MINUTES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const addInvestedMoneyCents = (cents: number) => {
    if (!Number.isFinite(cents) || cents <= 0) return;
    setInvestedMoneyCentsByMonth((prev) => {
      const next = { ...prev, [monthKey]: (prev[monthKey] || 0) + Math.round(cents) };
      try {
        localStorage.setItem(LS_INVESTED_MONEY_KEY, JSON.stringify(next));
            } catch {
              // ignore
            }
      return next;
    });
  };

  // Fetch Google Calendar connection + primary calendar id (for embed)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const run = async () => {
      setCalendarLoading(true);
      setGoogleCalendarError(null);
      try {
        const s = await apiGet('/api/google/status', { skipCache: true });
        const connected = !!s?.connected;
        if (!cancelled) setGoogleCalendarConnected(connected);
        if (!connected) {
          if (!cancelled) setGoogleCalendarError('Connect Google Calendar to see your schedule.');
        return;
      }

        const r = await apiGet('/api/google/calendars', { skipCache: true });
        const calendars = Array.isArray(r?.calendars) ? r.calendars : [];
        const primary = calendars.find((c: any) => c?.primary) || calendars.find((c: any) => c?.id === 'primary') || calendars[0];
        const calId = typeof primary?.id === 'string' && primary.id ? primary.id : 'primary';
        const tz = typeof primary?.timeZone === 'string' && primary.timeZone ? primary.timeZone : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        if (!cancelled) {
          setEmbedCalendarId(calId);
          setEmbedTimeZone(tz);
        }
      } catch (e: any) {
        if (!cancelled) {
          const msg = e?.message || String(e);
          setGoogleCalendarError(msg.includes('Google not connected') ? 'Connect Google Calendar to see your schedule.' : msg);
          setGoogleCalendarConnected(false);
        }
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Fetch connections
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const run = async () => {
      try {
        const r = await apiGet('/api/connections', { skipCache: true });
        const list = Array.isArray(r) ? r : [];
        if (!cancelled) {
          setConnections(list);
          setConnectionCount(list.length);
        }
      } catch {
        if (!cancelled) {
          setConnections([]);
          setConnectionCount(null);
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleCommunityChange = (slug: string) => {
    setActiveCommunity(slug);
    try {
      const params = new URLSearchParams(location.search);
      params.set('c', slug);
      navigate({ search: `?${params.toString()}` }, { replace: true });
    } catch {}
  };

  // URL sync
  useEffect(() => {
    try {
      const c = new URLSearchParams(location.search).get('c');
      if (c && c !== activeCommunity) {
        setActiveCommunity(c);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setSendingMessage(true);
    markDailyDone();
    addInvestedMinutes(3);
    navigate('/messages');
    setMessageText('');
    setSendingMessage(false);
  };

  // Display data (real or demo)
  const displayConnections = useMemo(() => {
    if (connections.length > 0) {
      return connections.slice(0, 8).map((c: any, idx: number) => ({
        id: c.id,
        name: c.contact_name || c.display_name || 'Unknown',
        role: c.relationship_context || c.how_we_met || '',
        photo: c.photo_url || null,
        height: ['tall', 'medium', 'short', 'tall', 'medium', 'tall', 'short', 'medium'][idx % 8],
      }));
    }
    return DEMO_CONNECTIONS;
  }, [connections]);

  const isDemo = connectionCount === 0;

  const investedMinutesThisMonth = investedMinutesByMonth[monthKey] || 0;
  const investedMoneyCentsThisMonth = investedMoneyCentsByMonth[monthKey] || 0;

  const currentStreak = useMemo(() => {
    const done = new Set(dailyDoneDates);
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!done.has(key)) break;
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [dailyDoneDates]);

  const streakCells = useMemo(() => {
    // 5 weeks (35 days) mini-heatmap, GitHub-ish: 7 rows (weekday), 5 cols (weeks)
    const done = new Set(dailyDoneDates);
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 34);
    // align to Sunday
    start.setDate(start.getDate() - start.getDay());
    const days: Array<{ key: string; done: boolean; isFuture: boolean }> = [];
    const cursor = new Date(start);
    for (let i = 0; i < 35; i++) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      const isFuture = cursor.getTime() > today.getTime();
      days.push({ key, done: done.has(key), isFuture });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [dailyDoneDates]);

  const todayPerson = useMemo(() => {
    if (connections.length > 0) {
      const randomIdx = Math.floor(Math.random() * Math.min(connections.length, 5));
      const c = connections[randomIdx];
      return {
        id: c?.id || 'unknown',
        name: c?.contact_name || c?.display_name || 'Someone',
        role: c?.relationship_context || '',
        photo: c?.photo_url || null,
        reason: 'Suggested for today',
      };
    }
    return DEMO_TODAY_PERSON;
  }, [connections]);

  const scheduleGoogleEvent = (personName: string) => {
    try {
      const base = new URL('https://calendar.google.com/calendar/r/eventedit');
      base.searchParams.set('text', `Catch up with ${personName}`);
      base.searchParams.set('details', `Scheduled from Zaurq.`);
      window.open(base.toString(), '_blank', 'noopener,noreferrer');
      markDailyDone();
      addInvestedMinutes(15);
    } catch {
      window.open('https://calendar.google.com', '_blank', 'noopener,noreferrer');
    }
  };

  const shiftSelectedDay = (deltaDays: number) => {
    const base = selectedCalendarDay || new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + deltaDays);
    setSelectedCalendarDay(next);
  };

  const calendarEmbedUrl = useMemo(() => {
    // Embed relies on the user's Google session in the browser.
    const base = new URL('https://calendar.google.com/calendar/embed');
    base.searchParams.set('src', String(embedCalendarId || 'primary'));
    base.searchParams.set('ctz', String(embedTimeZone || 'UTC'));
    base.searchParams.set('mode', 'AGENDA');
    base.searchParams.set('showTitle', '0');
    base.searchParams.set('showNav', '0');
    base.searchParams.set('showPrint', '0');
    base.searchParams.set('showTabs', '0');
    base.searchParams.set('showCalendars', '0');
    base.searchParams.set('showTz', '0');
    // Limit embed to a single day range.
    const d = selectedCalendarDay || new Date();
    const start = ymdCompactLocal(d);
    const d2 = new Date(d);
    d2.setDate(d2.getDate() + 1);
    const end = ymdCompactLocal(d2);
    base.searchParams.set('dates', `${start}/${end}`);
    return base.toString();
  }, [embedCalendarId, embedTimeZone, selectedCalendarDay]);

  const formatEventTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    if (d.toDateString() === now.toDateString()) return `Today ${time}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + time;
  };

  return (
    <div className="font-gilroy bg-background text-foreground min-h-screen">
      {/* Feed layout */}
      <div className="w-full mx-auto px-0 sm:px-1 lg:px-2">
        {/* MAIN CONTENT */}
        <main className="min-w-0 space-y-3 pb-24 lg:pb-8">
          {/* Top Nav (desktop + mobile) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeCommunity === item.slug;
              return (
                    <button
                  key={item.slug}
                  onClick={() => handleCommunityChange(item.slug)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap transition-all text-sm ${
                    isActive
                      ? 'bg-[#CBAA5A] text-black font-semibold'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                    </button>
              );
            })}
              </div>

          {/* (Sidebar removed in favor of top nav) */}

          {/* CATCH-UP VIEW */}
          {activeCommunity === 'all' && (
            <div className="h-[calc(100vh-140px)] flex flex-col gap-3">
              {/* Dashboard widgets */}
              <div className="hidden lg:grid lg:grid-cols-3 gap-3 flex-shrink-0">
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Streaks</div>
                    <div className="text-[10px] text-muted-foreground">{currentStreak} day streak</div>
            </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="grid grid-rows-7 grid-flow-col gap-1">
                      {streakCells.map((c) => (
                        <div
                          key={c.key}
                          className={`w-2.5 h-2.5 rounded-sm ${
                            c.isFuture ? 'bg-transparent' : c.done ? 'bg-[#CBAA5A]' : 'bg-muted/40'
                          }`}
                          title={c.key}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        markDailyDone();
                        addInvestedMinutes(5);
                      }}
                      className="h-8 px-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 text-[11px] font-semibold transition-colors"
                    >
                      Complete today
                </button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Money invested</div>
                    <div className="text-[10px] text-muted-foreground">This month</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-extrabold text-foreground">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                        Math.round(investedMoneyCentsThisMonth / 100)
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addInvestedMoneyCents(2500)}
                      className="h-8 px-2 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border text-[11px] font-semibold transition-colors"
                      title="Demo add"
                    >
                      +$25
                    </button>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Gifts, events, and relationship moments</div>
                </div>

                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Time invested</div>
                    <div className="text-[10px] text-muted-foreground">This month</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-extrabold text-foreground">
                      {Math.floor(investedMinutesThisMonth / 60)}h {investedMinutesThisMonth % 60}m
                    </div>
                <button
                      type="button"
                      onClick={() => addInvestedMinutes(30)}
                      className="h-8 px-2 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border text-[11px] font-semibold transition-colors"
                      title="Demo add"
                    >
                      +30m
                </button>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">DMs, calls, and planning</div>
            </div>
          </div>

              <div className="flex-1 min-h-0">
                {/* Desktop Grid: 3 columns */}
                <div className="hidden lg:grid lg:grid-cols-3 gap-3 h-full">
                {/* COLUMN 1: Today + Calendar */}
                <div className="flex flex-col gap-3 h-full min-h-0">
                  {/* Today's Focus */}
                  <div className="bg-card border border-border rounded-xl p-3 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
                      {isDemo && (
                        <span className="text-[9px] font-bold tracking-wider uppercase text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">Demo</span>
                      )}
              </div>

                    <div className="flex gap-3">
                      <Link to={isDemo ? '#' : `/connections/${todayPerson.id}`} className="flex-shrink-0 group">
                        <div className="w-24 h-32 rounded-lg overflow-hidden ring-2 ring-border group-hover:ring-[#CBAA5A] transition-all">
                          {todayPerson.photo ? (
                            <img src={todayPerson.photo} alt={todayPerson.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-xl font-bold ${getAvatarColor(todayPerson.id)}`}>
                              {getInitials(todayPerson.name.split(' ')[0] || '', todayPerson.name.split(' ')[1] || '')}
            </div>
          )}
                        </div>
                      </Link>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <Link to={isDemo ? '#' : `/connections/${todayPerson.id}`} className="hover:text-[#CBAA5A] transition-colors">
                            <h3 className="text-lg font-bold text-foreground">{todayPerson.name}</h3>
                          </Link>
                          {todayPerson.role && <p className="text-xs text-muted-foreground">{todayPerson.role}</p>}
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{todayPerson.reason}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 relative">
                            <Input
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="Message..."
                              className="pr-8 bg-muted/50 border-border rounded-lg h-8 text-xs"
                              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
              <button
                              onClick={handleSendMessage}
                              disabled={!messageText.trim() || sendingMessage}
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-[#CBAA5A] text-black hover:bg-[#D4B76A] disabled:opacity-50 transition-colors"
                            >
                              <Send className="w-3 h-3" />
              </button>
              </div>
                <button
                            onClick={() => window.open('https://calendly.com', '_blank')}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted hover:bg-accent border border-border text-xs font-medium transition-colors"
                >
                            <Video className="w-3.5 h-3.5 text-[#CBAA5A]" />
                            Call
              </button>
                        </div>
                      </div>
            </div>
          </div>

                  {/* Google Calendar (embedded) */}
                  <div className="bg-card border border-border rounded-xl p-3 flex-1 min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <GoogleCalendarLogo className="w-4 h-4" />
                        <h2 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Calendar</h2>
                      </div>
                      <button onClick={() => navigate('/profile')} className="text-[10px] text-[#CBAA5A] hover:underline font-medium">Manage</button>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                          type="button"
                          onClick={() => shiftSelectedDay(-1)}
                          className="h-8 w-8 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 flex items-center justify-center transition-colors"
                          title="Previous day"
                        >
                          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                          type="button"
                          onClick={() => setSelectedCalendarDay(new Date())}
                          className="h-8 px-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 text-[11px] font-semibold text-foreground transition-colors"
                          title="Jump to today"
                        >
                          Today
                </button>
                <button
                          type="button"
                          onClick={() => shiftSelectedDay(1)}
                          className="h-8 w-8 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 flex items-center justify-center transition-colors"
                          title="Next day"
                        >
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

                      <div className="text-xs font-semibold text-foreground truncate">
                        {(selectedCalendarDay || new Date()).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>

                      <div className="text-[10px] text-muted-foreground flex-shrink-0">
                        {googleCalendarConnected ? 'Google' : 'Not connected'}
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                      {calendarLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-4 h-4 animate-spin text-[#CBAA5A]" />
                        </div>
                      ) : googleCalendarError ? (
                        <div className="text-xs text-muted-foreground">
                          <div className="mb-2">{googleCalendarError}</div>
                          <button onClick={() => navigate('/profile')} className="text-[10px] font-semibold text-[#CBAA5A] hover:underline">
                            Manage Google Calendar
                  </button>
                        </div>
                      ) : (
                        <iframe
                          title="Google Calendar"
                          src={calendarEmbedUrl}
                          className="w-full h-full rounded-xl border border-border bg-black"
                          style={{ border: 'none' }}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                )}
              </div>
            </div>
          </div>

                {/* COLUMN 2: My Network + DM/Schedule actions */}
                <div className="bg-card border border-border rounded-xl p-3 flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#CBAA5A]" />
                      <h2 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">My Network</h2>
                      {isDemo && <span className="text-[9px] font-bold tracking-wider uppercase text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">Demo</span>}
                </div>
                    <button onClick={() => navigate('/profile')} className="text-[10px] font-semibold text-[#CBAA5A] hover:underline">Import</button>
              </div>
                  <div className="flex-1 overflow-y-auto hide-scrollbar min-h-0">
                    <div className="space-y-2">
                      {displayConnections.map((person) => {
                        const thumbClass = person.height === 'tall' ? 'h-16' : person.height === 'medium' ? 'h-14' : 'h-12';
                        return (
                          <div key={person.id} className="rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors overflow-hidden">
                            <div className="flex items-center gap-3 p-2">
                              <Link to={isDemo ? '#' : `/connections/${person.id}`} className="flex-shrink-0 group">
                                <div className={`w-24 ${thumbClass} rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-[#CBAA5A] transition-all`}>
                                  {person.photo ? (
                                    <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-lg font-bold ${getAvatarColor(person.id)}`}>
                                      {getInitials(person.name.split(' ')[0] || '', person.name.split(' ')[1] || '')}
                                    </div>
                                  )}
                                </div>
                              </Link>

                              <div className="flex-1 min-w-0">
                                <Link to={isDemo ? '#' : `/connections/${person.id}`} className="hover:text-[#CBAA5A] transition-colors">
                                  <div className="text-sm font-semibold text-foreground truncate">{person.name}</div>
                                </Link>
                                {person.role ? <div className="text-[10px] text-muted-foreground truncate">{person.role}</div> : null}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                                  type="button"
                    onClick={() => navigate('/messages')}
                                  className="h-8 px-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
                  >
                                  DM
                  </button>
                  <button
                                  type="button"
                                  onClick={() => scheduleGoogleEvent(person.name)}
                                  className="h-8 px-2 rounded-lg bg-[#CBAA5A] text-black hover:bg-[#D4B76A] text-xs font-semibold transition-colors"
                  >
                                  Schedule Call
                  </button>
                </div>
              </div>
              </div>
                        );
                })}
            </div>
                  </div>
                </div>

                {/* COLUMN 3: Life Events */}
                <div className="bg-card border border-border rounded-xl p-3 flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-[#CBAA5A]" />
                      <h2 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Life Events</h2>
                </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-3 pr-1">
                    {(upcomingBirthdays.length > 0 || isDemo) && (
                      <div className="rounded-xl border border-border bg-muted/10 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Gift className="w-4 h-4 text-[#CBAA5A]" />
                          <div className="text-sm font-bold text-foreground">Birthdays</div>
                        </div>
                        {birthdaysLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-[#CBAA5A]" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(upcomingBirthdays.length > 0
                              ? upcomingBirthdays.slice(0, 6)
                              : [
                                  {
                                    displayName: 'Sana Kapoor',
                                    photoUrl:
                                      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face',
                                    daysUntil: 3,
                                    connectionId: 'demo-bday',
                                  },
                                ]
                            ).map((bday: any, idx: number) => (
                              <div key={`${bday.displayName}-${idx}`} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                                <Link to={isDemo ? '#' : `/connections/${bday.connectionId || ''}`} className="flex-shrink-0 group">
                                  <div className="w-10 h-12 rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-[#CBAA5A] transition-all">
                                    {bday.photoUrl ? (
                                      <img src={bday.photoUrl} alt={bday.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${getAvatarColor(bday.connectionId || `bday-${idx}`)}`}>
                                        {getInitials(bday.displayName.split(' ')[0] || '', bday.displayName.split(' ')[1] || '')}
                                      </div>
                )}
              </div>
                                </Link>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-foreground truncate">{bday.displayName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {bday.daysUntil === 0 ? 'Today' : bday.daysUntil === 1 ? 'Tomorrow' : `In ${bday.daysUntil} days`}
                                  </div>
                                </div>
                    <button
                                  type="button"
                                  onClick={() => navigate('/messages')}
                                  className="h-8 w-8 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 flex items-center justify-center transition-colors"
                                  title="DM"
                                >
                                  <MessageCircle className="w-4 h-4" />
                    </button>
              </div>
                            ))}
            </div>
          )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile: Stacked layout */}
              <div className="lg:hidden space-y-3">
                {/* Today's Focus - Mobile */}
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
                    {isDemo && <span className="text-[9px] font-bold tracking-wider uppercase text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">Demo</span>}
                  </div>
                  <div className="flex gap-3">
                    <Link to={isDemo ? '#' : `/connections/${todayPerson.id}`} className="flex-shrink-0 group">
                      <div className="w-24 h-32 rounded-lg overflow-hidden ring-2 ring-border group-hover:ring-[#CBAA5A] transition-all">
                        {todayPerson.photo ? <img src={todayPerson.photo} alt={todayPerson.name} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-xl font-bold ${getAvatarColor(todayPerson.id)}`}>{getInitials(todayPerson.name.split(' ')[0] || '', todayPerson.name.split(' ')[1] || '')}</div>}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{todayPerson.name}</h3>
                        {todayPerson.role && <p className="text-xs text-muted-foreground">{todayPerson.role}</p>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 relative">
                          <Input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Message..." className="pr-8 bg-muted/50 border-border rounded-lg h-8 text-xs" />
                          <button onClick={handleSendMessage} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-[#CBAA5A] text-black"><Send className="w-3 h-3" /></button>
                        </div>
                        <button onClick={() => window.open('https://calendly.com', '_blank')} className="p-2 rounded-lg bg-muted border border-border"><Video className="w-4 h-4 text-[#CBAA5A]" /></button>
                      </div>
                    </div>
            </div>
          </div>

                {/* Calendar - Mobile */}
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                      <GoogleCalendarLogo className="w-4 h-4" />
                      <h2 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Calendar</h2>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {calendarLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-[#CBAA5A]" />
                      </div>
                    ) : googleCalendarError ? (
                      <div className="text-xs text-muted-foreground text-center py-3">
                        <div className="mb-1">{googleCalendarError}</div>
                        <button onClick={() => navigate('/profile')} className="text-[10px] font-semibold text-[#CBAA5A] hover:underline">
                          Connect Google Calendar
                  </button>
                      </div>
                    ) : (
                      <div className="h-[260px] overflow-hidden rounded-xl border border-border bg-black">
                        <iframe
                          title="Google Calendar (Mobile)"
                          src={calendarEmbedUrl}
                          className="w-full h-full"
                          style={{ border: 'none' }}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* My Network - Mobile */}
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">My Network</h2>
                    <button onClick={() => navigate('/profile')} className="text-[10px] font-semibold text-[#CBAA5A]">Import</button>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto hide-scrollbar">
                    <div className="columns-2 gap-2">
                      {displayConnections.slice(0, 6).map((person) => {
                        const heightClass = person.height === 'tall' ? 'h-32' : person.height === 'medium' ? 'h-28' : 'h-24';
                        return (
                          <Link key={person.id} to={isDemo ? '#' : `/connections/${person.id}`} className="block break-inside-avoid group mb-2">
                            <div className={`relative ${heightClass} rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-[#CBAA5A] transition-all`}>
                              {person.photo ? (
                                <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center text-lg font-bold ${getAvatarColor(person.id)}`}>
                                  {getInitials(person.name.split(' ')[0] || '', person.name.split(' ')[1] || '')}
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-4">
                                <h3 className="text-xs font-semibold text-white truncate">{person.name}</h3>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal strip: Gifts / Events / Trips */}
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Gifts · Events · Trips</div>
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                {FEED_COMMUNITY_TILES.map((tile) => {
                  const Icon = tile.icon;
                  return (
                  <button
                      key={tile.key}
                      type="button"
                      onClick={() => handleCommunityChange(tile.slug)}
                      className="relative w-[260px] h-[86px] flex-shrink-0 rounded-xl overflow-hidden border border-border bg-muted/20 hover:border-[#CBAA5A]/60 transition-colors"
                    >
                      <img src={tile.image} alt={tile.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                      <div className="relative p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#CBAA5A]/15 border border-[#CBAA5A]/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-[#CBAA5A]" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-white">{tile.title}</div>
                          <div className="text-[11px] text-white/70">{tile.subtitle}</div>
                        </div>
                      </div>
                  </button>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          {/* MOMENTS VIEW */}
          {activeCommunity === 'moments' && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#CBAA5A]" />
                    <h2 className="text-base font-bold text-foreground">Moments</h2>
              </div>
                  {isDemo && (
                    <span className="text-[9px] font-bold tracking-wider uppercase text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      Demo
                    </span>
                  )}
                </div>

                {birthdaysLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
                  </div>
                ) : (
              <div className="space-y-3">
                    {(upcomingBirthdays.length > 0 ? upcomingBirthdays : isDemo ? [
                      { displayName: 'Priya Sharma', photoUrl: DEMO_CONNECTIONS[0].photo, daysUntil: 2, connectionId: 'demo-1' },
                      { displayName: 'Arjun Patel', photoUrl: DEMO_CONNECTIONS[1].photo, daysUntil: 7, connectionId: 'demo-2' },
                      { displayName: 'Maya Chen', photoUrl: DEMO_CONNECTIONS[2].photo, daysUntil: 12, connectionId: 'demo-3' },
                    ] : []).map((bday, idx) => (
                      <div key={`${bday.displayName}-${idx}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <Link to={isDemo ? '#' : `/connections/${bday.connectionId || ''}`} className="flex-shrink-0 group">
                          <div className="w-14 h-18 rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-[#CBAA5A] transition-all">
                            {bday.photoUrl ? (
                              <img src={bday.photoUrl} alt={bday.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${getAvatarColor(`moment-${idx}`)}`}>
                                {getInitials(bday.displayName.split(' ')[0] || '', bday.displayName.split(' ')[1] || '')}
                          </div>
                            )}
                        </div>
                        </Link>
                        
                        <div className="flex-1 min-w-0">
                          <Link to={isDemo ? '#' : `/connections/${bday.connectionId || ''}`} className="hover:text-[#CBAA5A] transition-colors">
                            <h3 className="text-sm font-semibold text-foreground">{bday.displayName}</h3>
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Gift className="w-3 h-3 text-[#CBAA5A]" />
                            <p className="text-xs text-muted-foreground">
                              {bday.daysUntil === 0 ? 'Today!' : bday.daysUntil === 1 ? 'Tomorrow' : `In ${bday.daysUntil} days`}
                            </p>
                        </div>
                        </div>

                        <button
                          onClick={() => navigate('/messages')}
                          className="px-3 py-1.5 rounded-lg bg-[#CBAA5A] text-black hover:bg-[#D4B76A] transition-colors text-xs font-semibold"
                        >
                          Message
                        </button>
                      </div>
                    ))}

                    {upcomingBirthdays.length === 0 && !isDemo && (
                      <p className="text-center text-muted-foreground py-6 text-sm">No upcoming birthdays</p>
                    )}
                  </div>
                )}
              </div>
              </div>
            )}

          {/* GIFTS VIEW */}
          {activeCommunity === 'gifts' && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4 text-[#CBAA5A]" />
                  <h2 className="text-base font-bold text-foreground">Gifts</h2>
                    </div>
                    {/* Search removed */}
                </div>

                {giftsLoading ? (
                <div className="flex items-center justify-center py-16 bg-card border border-border rounded-xl">
                    <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
                  </div>
                ) : gifts.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                  <p className="text-muted-foreground">No gifts found. Try a different search.</p>
                  </div>
                ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gifts.map((p: any) => (
                      <a
                        key={String(p.shopify_product_id || p.handle)}
                        href={`https://boxupgifting.com/products/${encodeURIComponent(String(p.handle || ''))}`}
                        target="_blank"
                        rel="noreferrer"
                      className="bg-card border border-border rounded-xl overflow-hidden hover:border-[#CBAA5A]/50 transition-colors"
                      >
                      <div className="aspect-square bg-muted overflow-hidden">
                          {p.primary_image_url ? (
                          <img src={String(p.primary_image_url)} alt={String(p.title || 'Gift')} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-semibold text-foreground line-clamp-2">{String(p.title || '')}</div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                          {p.price_min != null ? `₹${p.price_min}` : '—'}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
          )}

          {/* EVENTS VIEW */}
          {activeCommunity === 'events' && (
              <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-[#CBAA5A]" />
                  <h2 className="text-base font-bold text-foreground">Events</h2>
                </div>
                <p className="text-sm text-muted-foreground">Coming soon: Plan events with your network.</p>
              </div>
            </div>
          )}

          {/* TRIPS VIEW */}
          {activeCommunity === 'trips' && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Plane className="w-4 h-4 text-[#CBAA5A]" />
                  <h2 className="text-base font-bold text-foreground">Trips</h2>
                </div>
                <p className="text-sm text-muted-foreground">Coming soon: Coordinate trips and meetups.</p>
              </div>
            </div>
          )}

          {/* PEOPLE VIEW */}
          {activeCommunity === 'people' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-xl">
                  <button
                    onClick={() => setPeopleViewMode('swipe')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    peopleViewMode === 'swipe' ? 'bg-[#CBAA5A] text-black' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                      Discover
                    </span>
                  </button>
                  <button
                    onClick={() => setPeopleViewMode('leaderboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    peopleViewMode === 'leaderboard' ? 'bg-[#CBAA5A] text-black' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                      Leaderboard
                    </span>
                  </button>
                </div>

                {peopleViewMode === 'swipe' && (
                <div className="h-[550px] max-h-[65vh] rounded-xl overflow-hidden border border-border">
                    <SwipePeopleView onViewMatches={() => setPeopleViewMode('leaderboard')} />
                  </div>
                )}

              {peopleViewMode === 'leaderboard' && <SocialCapitalLeaderboard />}
              </div>
          )}
        </main>
                      </div>
    </div>
  );
};
