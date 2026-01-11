import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/lib/api';
import { Loader2, Sparkles, Users, Gift, Calendar, Plane, Trophy, Send, MessageCircle, Circle, Video, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { SwipePeopleView } from '@/components/SwipePeopleView';
import SocialCapitalLeaderboard from '@/components/SocialCapitalLeaderboard';
import { usePeople } from '@/hooks/usePeople';
import { Input } from '@/components/ui/input';
import { WhatsAppInviteModal } from '@/components/home/WhatsAppInviteModal';
import { RightSidebarIntegrationsCard } from '@/components/home/RightSidebarIntegrationsCard';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';

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

// Demo DM conversations
const DEMO_DMS = [
  { id: 'dm-1', name: 'Priya Sharma', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', lastMessage: 'Thanks for the intro!', time: '2m', unread: true },
  { id: 'dm-2', name: 'Arjun Patel', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face', lastMessage: 'Let\'s catch up this week', time: '1h', unread: true },
  { id: 'dm-3', name: 'Maya Chen', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face', lastMessage: 'Sounds great!', time: '3h', unread: false },
  { id: 'dm-4', name: 'Rahul Gupta', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face', lastMessage: 'Will send the deck', time: '1d', unread: false },
];

// Today's single person to reach out to
const DEMO_TODAY_PERSON = {
  id: 'demo-today',
  name: 'Vikram Singh',
  role: 'Angel Investor',
  photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&crop=face',
  reason: 'You haven\'t connected in 3 weeks',
};

// Demo calendar events
const DEMO_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'cal-1', summary: 'Coffee with Priya', start: new Date(Date.now() + 2 * 3600000).toISOString(), end: new Date(Date.now() + 3 * 3600000).toISOString() },
  { id: 'cal-2', summary: 'Product Review', start: new Date(Date.now() + 24 * 3600000).toISOString(), end: new Date(Date.now() + 25 * 3600000).toISOString() },
  { id: 'cal-3', summary: 'Investor Call', start: new Date(Date.now() + 48 * 3600000).toISOString(), end: new Date(Date.now() + 49 * 3600000).toISOString() },
];

const SIDEBAR_ITEMS = [
  { slug: 'all', name: 'Catch-Up', icon: Sparkles },
  { slug: 'moments', name: 'Moments', icon: Gift },
  { slug: 'gifts', name: 'Gifts', icon: Gift },
  { slug: 'events', name: 'Events', icon: Calendar },
  { slug: 'trips', name: 'Trips', icon: Plane },
  { slug: 'people', name: 'People', icon: Users },
] as const;

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
  const [showWhatsAppInviteModal, setShowWhatsAppInviteModal] = useState(false);
  
  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  
  // Message input state
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Gifts state
  const [gifts, setGifts] = useState<any[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [giftsQuery, setGiftsQuery] = useState('');

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
        if (giftsQuery.trim()) params.set('q', giftsQuery.trim());
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
  }, [activeCommunity, user?.id, giftsQuery]);

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

  // Fetch calendar events
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const run = async () => {
      setCalendarLoading(true);
      try {
        const r = await apiGet('/api/google/calendar/events?days=7', { skipCache: true });
        const events = Array.isArray(r?.events) ? r.events : [];
        if (!cancelled) setCalendarEvents(events);
            } catch {
        if (!cancelled) setCalendarEvents([]);
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
    navigate('/messages');
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

  const displayCalendarEvents = calendarEvents.length > 0 ? calendarEvents.slice(0, 3) : (isDemo ? DEMO_CALENDAR_EVENTS : []);

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
      {/* 3-Column Layout: Left Nav + Main + DMs */}
      <div className="flex gap-3 max-w-[1400px] mx-auto px-2">
        
        {/* LEFT SIDEBAR - Navigation (narrow) */}
        <aside className="hidden lg:block w-44 flex-shrink-0">
          <div className="sticky top-4 space-y-3">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-2 space-y-0.5">
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeCommunity === item.slug;
                  return (
                    <button
                      key={item.slug}
                      onClick={() => handleCommunityChange(item.slug)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-[#CBAA5A]/15 text-[#CBAA5A]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>

            <RightSidebarIntegrationsCard onAddContact={() => setShowWhatsAppInviteModal(true)} />
              </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 space-y-4 pb-24 lg:pb-8">
          
          {/* Mobile Navigation */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2">
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
                      : 'bg-card border border-border text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
              </button>
              );
            })}
            </div>

          {/* CATCH-UP VIEW - All cards visible at once on desktop */}
          {activeCommunity === 'all' && (
            <div className="space-y-3">
              {/* Desktop Grid: 2 columns with all cards visible */}
              <div className="hidden lg:grid lg:grid-cols-2 gap-3">
                {/* LEFT COLUMN */}
                <div className="space-y-3">
                  {/* Today's Focus */}
                  <div className="bg-card border border-border rounded-xl p-3">
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

                  {/* Calendar - with Google Calendar Logo */}
                  <div className="bg-card border border-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GoogleCalendarLogo className="w-4 h-4" />
                        <h2 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Calendar</h2>
                        {isDemo && calendarEvents.length === 0 && (
                          <span className="text-[9px] font-bold tracking-wider uppercase text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">Demo</span>
                )}
              </div>
                      <button onClick={() => navigate('/profile')} className="text-[10px] text-[#CBAA5A] hover:underline font-medium">View all</button>
                    </div>
                    <div className="max-h-[140px] overflow-y-auto hide-scrollbar space-y-1.5">
                      {calendarLoading ? (
                        <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[#CBAA5A]" /></div>
                      ) : displayCalendarEvents.length > 0 ? (
                        displayCalendarEvents.map((event) => (
                          <div key={event.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-[#CBAA5A]/10 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-[#CBAA5A]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-medium text-foreground truncate">{event.summary}</h4>
                              <p className="text-[10px] text-muted-foreground">{formatEventTime(event.start)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-3">Connect Google Calendar</p>
                      )}
            </div>
          </div>

                  {/* Birthday */}
                  {(upcomingBirthdays.length > 0 || isDemo) && (
                    <div className="bg-card border border-border rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-[#CBAA5A]" />
                        <h2 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Birthday Soon</h2>
                </div>
                      {birthdaysLoading ? (
                        <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[#CBAA5A]" /></div>
                      ) : (
                <div className="flex items-center gap-2">
                          {(() => {
                            const bday = upcomingBirthdays[0] || (isDemo ? { displayName: 'Sana Kapoor', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face', daysUntil: 3, connectionId: 'demo-bday' } : null);
                            if (!bday) return <p className="text-xs text-muted-foreground">No upcoming birthdays</p>;
                            return (
                              <>
                                <Link to={isDemo ? '#' : `/connections/${bday.connectionId || ''}`} className="flex-shrink-0 group">
                                  <div className="w-12 h-14 rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-[#CBAA5A] transition-all">
                                    {bday.photoUrl ? <img src={bday.photoUrl} alt={bday.displayName} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${getAvatarColor(bday.connectionId || 'bday')}`}>{getInitials(bday.displayName.split(' ')[0] || '', bday.displayName.split(' ')[1] || '')}</div>}
                </div>
                                </Link>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-foreground truncate">{bday.displayName}</h3>
                                  <p className="text-xs text-muted-foreground">🎂 {bday.daysUntil === 0 ? 'Today!' : bday.daysUntil === 1 ? 'Tomorrow' : `In ${bday.daysUntil} days`}</p>
              </div>
                                <button onClick={() => navigate('/messages')} className="p-1.5 rounded-lg bg-muted hover:bg-[#CBAA5A] hover:text-black transition-colors"><MessageCircle className="w-4 h-4" /></button>
                              </>
                            );
                          })()}
              </div>
                      )}
            </div>
          )}
                </div>

                {/* RIGHT COLUMN - My Network */}
                <div className="bg-card border border-border rounded-xl p-3 flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#CBAA5A]" />
                      <h2 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">My Network</h2>
                      {isDemo && <span className="text-[9px] font-bold tracking-wider uppercase text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">Demo</span>}
                </div>
                    <button onClick={() => setShowWhatsAppInviteModal(true)} className="text-[10px] font-semibold text-[#CBAA5A] hover:underline">+ Add</button>
              </div>
                  <div className="flex-1 overflow-y-auto hide-scrollbar">
                    <div className="columns-2 gap-2">
                      {displayConnections.map((person) => {
                        const heightClass = person.height === 'tall' ? 'h-36' : person.height === 'medium' ? 'h-32' : 'h-28';
                  return (
                          <Link key={person.id} to={isDemo ? '#' : `/connections/${person.id}`} className="block break-inside-avoid group mb-2">
                            <div className={`relative ${heightClass} rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-[#CBAA5A] transition-all`}>
                              {person.photo ? <img src={person.photo} alt={person.name} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-lg font-bold ${getAvatarColor(person.id)}`}>{getInitials(person.name.split(' ')[0] || '', person.name.split(' ')[1] || '')}</div>}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-5">
                                <h3 className="text-xs font-semibold text-white truncate">{person.name}</h3>
                              </div>
                            </div>
                          </Link>
                  );
                })}
              </div>
                    {isDemo && (
                      <div className="mt-2 pt-2 border-t border-border text-center">
                        <button onClick={() => setShowWhatsAppInviteModal(true)} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#CBAA5A] text-black hover:bg-[#D4B76A] transition-colors">Add contacts</button>
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
                    {displayCalendarEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <Clock className="w-4 h-4 text-[#CBAA5A]" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-medium text-foreground truncate">{event.summary}</h4>
                          <p className="text-[10px] text-muted-foreground">{formatEventTime(event.start)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* My Network - Mobile */}
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">My Network</h2>
                    <button onClick={() => setShowWhatsAppInviteModal(true)} className="text-[10px] font-semibold text-[#CBAA5A]">+ Add</button>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto hide-scrollbar">
                    <div className="columns-2 gap-2">
                      {displayConnections.slice(0, 6).map((person) => {
                        const heightClass = person.height === 'tall' ? 'h-32' : person.height === 'medium' ? 'h-28' : 'h-24';
                        return (
                          <Link key={person.id} to={isDemo ? '#' : `/connections/${person.id}`} className="block break-inside-avoid group mb-2">
                            <div className={`relative ${heightClass} rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-[#CBAA5A] transition-all`}>
                              {person.photo ? <img src={person.photo} alt={person.name} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-lg font-bold ${getAvatarColor(person.id)}`}>{getInitials(person.name.split(' ')[0] || '', person.name.split(' ')[1] || '')}</div>}
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
                    <Input
                      value={giftsQuery}
                      onChange={(e) => setGiftsQuery(e.target.value)}
                  placeholder="Search gifts..."
                  className="bg-muted/50 border-border"
                    />
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

        {/* RIGHT SIDEBAR - DMs */}
        <aside className="hidden xl:block w-64 flex-shrink-0">
          <div className="sticky top-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Messages</h3>
                  <button
                  onClick={() => navigate('/messages')}
                  className="text-xs text-[#CBAA5A] hover:underline font-medium"
                  >
                  View all
                  </button>
          </div>
              
              <div className="divide-y divide-border">
                {(isDemo ? DEMO_DMS : DEMO_DMS.slice(0, 2)).map((dm) => (
                  <button
                    key={dm.id}
                    onClick={() => navigate('/messages')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-border">
                        <img src={dm.photo} alt={dm.name} className="w-full h-full object-cover" />
                      </div>
                      {dm.unread && (
                        <Circle className="absolute -top-0.5 -right-0.5 w-3 h-3 fill-[#CBAA5A] text-[#CBAA5A]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${dm.unread ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                          {dm.name}
                            </span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{dm.time}</span>
                          </div>
                      <p className={`text-xs truncate ${dm.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {dm.lastMessage}
                      </p>
                        </div>
                  </button>
                ))}
                      </div>

              {/* Quick compose */}
              <div className="p-3 border-t border-border">
                        <button
                  onClick={() => navigate('/messages')}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-muted hover:bg-accent text-sm font-medium text-foreground transition-colors"
                        >
                  <MessageCircle className="w-4 h-4" />
                  New Message
                        </button>
                    </div>
            </div>
          </div>
        </aside>
      </div>

      <WhatsAppInviteModal open={showWhatsAppInviteModal} onOpenChange={setShowWhatsAppInviteModal} />
    </div>
  );
};
