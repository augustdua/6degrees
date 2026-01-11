import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/lib/api';
import { Loader2, Sparkles, Users, Gift, Calendar, Sun, Moon, Trophy, Send, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { SwipePeopleView } from '@/components/SwipePeopleView';
import SocialCapitalLeaderboard from '@/components/SocialCapitalLeaderboard';
import { usePeople } from '@/hooks/usePeople';
import { Input } from '@/components/ui/input';
import { WhatsAppInviteModal } from '@/components/home/WhatsAppInviteModal';
import { RightSidebarIntegrationsCard } from '@/components/home/RightSidebarIntegrationsCard';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_order?: number;
}

// Demo connections with real human photos
const DEMO_CONNECTIONS = [
  { id: 'demo-1', name: 'Priya Sharma', role: 'Product Manager at Google', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', lastContact: '2 weeks ago' },
  { id: 'demo-2', name: 'Arjun Patel', role: 'Founder at TechStart', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', lastContact: '1 month ago' },
  { id: 'demo-3', name: 'Maya Chen', role: 'Designer at Figma', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', lastContact: '3 weeks ago' },
  { id: 'demo-4', name: 'Rahul Gupta', role: 'Engineer at Meta', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', lastContact: '5 days ago' },
  { id: 'demo-5', name: 'Ananya Reddy', role: 'VC at Sequoia', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face', lastContact: '1 week ago' },
  { id: 'demo-6', name: 'Karthik Nair', role: 'CTO at Swiggy', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', lastContact: '2 months ago' },
];

// Demo birthday with photo
const DEMO_BIRTHDAY_PERSON = {
  id: 'demo-bday',
  name: 'Sana Kapoor',
  role: 'Marketing Lead at Zomato',
  photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
  birthdayIn: 3,
};

// Today's single person to reach out to
const DEMO_TODAY_PERSON = {
  id: 'demo-today',
  name: 'Vikram Singh',
  role: 'Angel Investor',
  photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
  reason: 'You haven\'t connected in 3 weeks',
};

const SIDEBAR_ITEMS = [
  { slug: 'all', name: 'Catch-Up', icon: Sparkles },
  { slug: 'moments', name: 'Moments', icon: Gift },
  { slug: 'people', name: 'People', icon: Users },
] as const;

export const ForumTabContent = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
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
  
  // Message input state
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

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
    // For now, navigate to messages - in future, could send directly
    navigate('/messages');
    setSendingMessage(false);
  };

  // Display data (real or demo)
  const displayConnections = useMemo(() => {
    if (connections.length > 0) {
      return connections.slice(0, 6).map((c: any) => ({
        id: c.id,
        name: c.contact_name || c.display_name || 'Unknown',
        role: c.relationship_context || c.how_we_met || '',
        photo: c.photo_url || null,
        lastContact: c.last_interaction_date ? `Last contact: ${new Date(c.last_interaction_date).toLocaleDateString()}` : '',
      }));
    }
    return DEMO_CONNECTIONS;
  }, [connections]);

  const isDemo = connectionCount === 0;

  const todayPerson = useMemo(() => {
    if (connections.length > 0) {
      // Pick a random connection to reach out to
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

  return (
    <div className="font-gilroy bg-background text-foreground min-h-screen">
      {/* 2-Column Layout: Left Sidebar + Main Content */}
      <div className="flex gap-6 max-w-5xl mx-auto">
        
        {/* LEFT SIDEBAR - Navigation */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-4 space-y-4">
            {/* Navigation */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-3 space-y-1">
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeCommunity === item.slug;
                  return (
                    <button
                      key={item.slug}
                      onClick={() => handleCommunityChange(item.slug)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#CBAA5A]/15 text-[#CBAA5A]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-semibold">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Integrations Card */}
            <RightSidebarIntegrationsCard onAddContact={() => setShowWhatsAppInviteModal(true)} />

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 space-y-6 pb-24 md:pb-8">
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-2">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeCommunity === item.slug;
              return (
                <button
                  key={item.slug}
                  onClick={() => handleCommunityChange(item.slug)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#CBAA5A] text-black'
                      : 'bg-card border border-border text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* CATCH-UP VIEW */}
          {activeCommunity === 'all' && (
            <div className="space-y-6">
              
              {/* Today's Focus - Single Person */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                  {isDemo && (
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      Demo
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-5">
                  <Link 
                    to={isDemo ? '#' : `/connections/${todayPerson.id}`}
                    className="flex-shrink-0 group"
                  >
                    <Avatar className="h-20 w-20 ring-2 ring-border group-hover:ring-[#CBAA5A] transition-all">
                      <AvatarImage src={todayPerson.photo || undefined} alt={todayPerson.name} className="object-cover" />
                      <AvatarFallback className={`text-lg ${getAvatarColor(todayPerson.id)}`}>
                        {getInitials(todayPerson.name.split(' ')[0] || '', todayPerson.name.split(' ')[1] || '')}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={isDemo ? '#' : `/connections/${todayPerson.id}`}
                      className="hover:text-[#CBAA5A] transition-colors"
                    >
                      <h3 className="text-xl font-bold text-foreground">{todayPerson.name}</h3>
                    </Link>
                    {todayPerson.role && (
                      <p className="text-sm text-muted-foreground mt-0.5">{todayPerson.role}</p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">{todayPerson.reason}</p>
                  </div>
                </div>

                {/* Message Input */}
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Send a message to ${todayPerson.name.split(' ')[0]}...`}
                      className="pr-12 bg-muted/50 border-border rounded-xl h-12 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendingMessage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#CBAA5A] text-black hover:bg-[#D4B76A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* My Network Grid */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-[0.15em] uppercase text-muted-foreground">My Network</h2>
                    {isDemo && (
                      <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Demo
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowWhatsAppInviteModal(true)}
                    className="text-xs font-semibold text-[#CBAA5A] hover:underline"
                  >
                    + Add Contacts
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {displayConnections.map((person) => (
                    <Link
                      key={person.id}
                      to={isDemo ? '#' : `/connections/${person.id}`}
                      className="group flex flex-col items-center text-center p-4 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-16 w-16 ring-2 ring-border group-hover:ring-[#CBAA5A] transition-all mb-3">
                        <AvatarImage src={person.photo || undefined} alt={person.name} className="object-cover" />
                        <AvatarFallback className={getAvatarColor(person.id)}>
                          {getInitials(person.name.split(' ')[0] || '', person.name.split(' ')[1] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-[#CBAA5A] transition-colors line-clamp-1">
                        {person.name}
                      </h3>
                      {person.role && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{person.role}</p>
                      )}
                    </Link>
                  ))}
                </div>

                {isDemo && (
                  <div className="mt-6 pt-5 border-t border-border text-center">
                    <p className="text-sm text-muted-foreground mb-3">Start building your network</p>
                    <button
                      onClick={() => setShowWhatsAppInviteModal(true)}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#CBAA5A] text-black hover:bg-[#D4B76A] transition-colors"
                    >
                      Add your first 5 contacts
                    </button>
                  </div>
                )}
              </div>

              {/* Upcoming Birthday */}
              {(upcomingBirthdays.length > 0 || isDemo) && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Gift className="w-4 h-4 text-[#CBAA5A]" />
                    <h2 className="text-sm font-bold tracking-[0.15em] uppercase text-muted-foreground">Upcoming Birthday</h2>
                    {isDemo && (
                      <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Demo
                      </span>
                    )}
                  </div>

                  {birthdaysLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-5">
                      {(() => {
                        const bday = upcomingBirthdays[0] || (isDemo ? {
                          displayName: DEMO_BIRTHDAY_PERSON.name,
                          photoUrl: DEMO_BIRTHDAY_PERSON.photo,
                          daysUntil: DEMO_BIRTHDAY_PERSON.birthdayIn,
                          nextOccurrenceIso: new Date(Date.now() + DEMO_BIRTHDAY_PERSON.birthdayIn * 86400000).toISOString(),
                          connectionId: DEMO_BIRTHDAY_PERSON.id,
                        } : null);
                        
                        if (!bday) return <p className="text-sm text-muted-foreground">No upcoming birthdays</p>;
                        
                        return (
                          <>
                            <Link 
                              to={isDemo ? '#' : `/connections/${bday.connectionId || ''}`}
                              className="flex-shrink-0 group"
                            >
                              <Avatar className="h-16 w-16 ring-2 ring-border group-hover:ring-[#CBAA5A] transition-all">
                                <AvatarImage src={bday.photoUrl || undefined} alt={bday.displayName} className="object-cover" />
                                <AvatarFallback className={getAvatarColor(bday.connectionId || 'bday')}>
                                  {getInitials(bday.displayName.split(' ')[0] || '', bday.displayName.split(' ')[1] || '')}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            
                            <div className="flex-1 min-w-0">
                              <Link 
                                to={isDemo ? '#' : `/connections/${bday.connectionId || ''}`}
                                className="hover:text-[#CBAA5A] transition-colors"
                              >
                                <h3 className="text-lg font-bold text-foreground">{bday.displayName}</h3>
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {bday.daysUntil === 0 ? '🎂 Birthday is today!' : 
                                 bday.daysUntil === 1 ? '🎂 Birthday is tomorrow' : 
                                 `🎂 Birthday in ${bday.daysUntil} days`}
                              </p>
                            </div>

                            <button
                              onClick={() => navigate('/messages')}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground hover:bg-[#CBAA5A] hover:text-black transition-colors text-sm font-semibold"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Send Wishes
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MOMENTS VIEW */}
          {activeCommunity === 'moments' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#CBAA5A]" />
                    <h2 className="text-lg font-bold text-foreground">Moments</h2>
                  </div>
                  {isDemo && (
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      Demo
                    </span>
                  )}
                </div>

                {birthdaysLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(upcomingBirthdays.length > 0 ? upcomingBirthdays : isDemo ? [
                      { displayName: 'Priya Sharma', photoUrl: DEMO_CONNECTIONS[0].photo, daysUntil: 2, nextOccurrenceIso: new Date(Date.now() + 2 * 86400000).toISOString(), connectionId: 'demo-1' },
                      { displayName: 'Arjun Patel', photoUrl: DEMO_CONNECTIONS[1].photo, daysUntil: 7, nextOccurrenceIso: new Date(Date.now() + 7 * 86400000).toISOString(), connectionId: 'demo-2' },
                      { displayName: 'Maya Chen', photoUrl: DEMO_CONNECTIONS[2].photo, daysUntil: 12, nextOccurrenceIso: new Date(Date.now() + 12 * 86400000).toISOString(), connectionId: 'demo-3' },
                    ] : []).map((bday, idx) => (
                      <div key={`${bday.displayName}-${idx}`} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <Link 
                          to={isDemo ? '#' : `/connections/${bday.connectionId || ''}`}
                          className="flex-shrink-0 group"
                        >
                          <Avatar className="h-14 w-14 ring-2 ring-border group-hover:ring-[#CBAA5A] transition-all">
                            <AvatarImage src={bday.photoUrl || undefined} alt={bday.displayName} className="object-cover" />
                            <AvatarFallback className={getAvatarColor(`moment-${idx}`)}>
                              {getInitials(bday.displayName.split(' ')[0] || '', bday.displayName.split(' ')[1] || '')}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={isDemo ? '#' : `/connections/${bday.connectionId || ''}`}
                            className="hover:text-[#CBAA5A] transition-colors"
                          >
                            <h3 className="text-base font-semibold text-foreground">{bday.displayName}</h3>
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Gift className="w-3.5 h-3.5 text-[#CBAA5A]" />
                            <p className="text-sm text-muted-foreground">
                              {bday.daysUntil === 0 ? 'Today!' : 
                               bday.daysUntil === 1 ? 'Tomorrow' : 
                               `In ${bday.daysUntil} days`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate('/messages')}
                          className="px-4 py-2 rounded-xl bg-[#CBAA5A] text-black hover:bg-[#D4B76A] transition-colors text-sm font-semibold"
                        >
                          Message
                        </button>
                      </div>
                    ))}

                    {upcomingBirthdays.length === 0 && !isDemo && (
                      <p className="text-center text-muted-foreground py-8">No upcoming birthdays in the next 14 days</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PEOPLE VIEW */}
          {activeCommunity === 'people' && (
            <div className="space-y-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-2xl">
                <button
                  onClick={() => setPeopleViewMode('swipe')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    peopleViewMode === 'swipe'
                      ? 'bg-[#CBAA5A] text-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Discover
                  </span>
                </button>
                <button
                  onClick={() => setPeopleViewMode('leaderboard')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    peopleViewMode === 'leaderboard'
                      ? 'bg-[#CBAA5A] text-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </span>
                </button>
              </div>

              {peopleViewMode === 'swipe' && (
                <div className="h-[600px] max-h-[70vh] rounded-2xl overflow-hidden border border-border">
                  <SwipePeopleView onViewMatches={() => setPeopleViewMode('leaderboard')} />
                </div>
              )}

              {peopleViewMode === 'leaderboard' && (
                <SocialCapitalLeaderboard />
              )}
            </div>
          )}
        </main>
      </div>

      {/* WhatsApp Invite Modal */}
      <WhatsAppInviteModal open={showWhatsAppInviteModal} onOpenChange={setShowWhatsAppInviteModal} />
    </div>
  );
};
