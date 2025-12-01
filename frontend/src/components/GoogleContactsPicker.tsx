import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, 
  Users, 
  Loader2, 
  Mail, 
  Check, 
  AlertCircle,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

interface GoogleContact {
  resourceName: string;
  name: string;
  email: string;
  photoUrl?: string;
}

interface GoogleContactsPickerProps {
  onSelectContacts: (emails: string[]) => void;
  onClose: () => void;
  maxSelections?: number;
}

export const GoogleContactsPicker: React.FC<GoogleContactsPickerProps> = ({
  onSelectContacts,
  onClose,
  maxSelections = 6
}) => {
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  const { providerToken } = useAuth();

  // Check if user has Google OAuth and get token
  useEffect(() => {
    checkGoogleAuth();
  }, [providerToken]); // Re-run if providerToken arrives late

  const checkGoogleAuth = async () => {
    setInitialLoading(true);
    try {
      // Check localStorage for cached token first
      const cachedToken = localStorage.getItem('google_contacts_token');
      const cachedExpiry = localStorage.getItem('google_contacts_token_expiry');
      
      if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
        console.log('Found valid cached Google token');
        setAccessToken(cachedToken);
        setHasGoogleAuth(true);
        fetchContacts(cachedToken);
        setInitialLoading(false);
        return;
      }

      // Try to get token from useAuth (most reliable on redirect)
      if (providerToken) {
        console.log('Found provider token in useAuth');
        // Cache it for 55 minutes (tokens usually last 1 hour)
        localStorage.setItem('google_contacts_token', providerToken);
        localStorage.setItem('google_contacts_token_expiry', (Date.now() + 55 * 60 * 1000).toString());
        setAccessToken(providerToken);
        setHasGoogleAuth(true);
        fetchContacts(providerToken);
        setInitialLoading(false);
        return;
      }

      // Fallback to session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.provider_token) {
        console.log('Found provider token in session');
        // Cache it
        localStorage.setItem('google_contacts_token', session.provider_token);
        localStorage.setItem('google_contacts_token_expiry', (Date.now() + 55 * 60 * 1000).toString());
        setAccessToken(session.provider_token);
        setHasGoogleAuth(true);
        fetchContacts(session.provider_token);
      } else if (session?.user?.app_metadata?.provider === 'google') {
        // User signed up with Google but we don't have fresh token
        console.log('User is Google user but no token available');
        setIsGoogleUser(true);
        setHasGoogleAuth(false);
      } else {
        setHasGoogleAuth(false);
      }
    } catch (err) {
      console.error('Error checking Google auth:', err);
      setHasGoogleAuth(false);
    } finally {
      setInitialLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear any cached invalid token
      localStorage.removeItem('google_contacts_token');
      localStorage.removeItem('google_contacts_token_expiry');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly',
          redirectTo: window.location.href,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      if (error) throw error;
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError('Failed to connect with Google');
      setLoading(false);
    }
  };

  const fetchContacts = async (token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch contacts from Google People API
      // We fetch both 'connections' (saved contacts) and 'otherContacts' (interacted with)
      
      const [connectionsResponse, otherContactsResponse] = await Promise.all([
        fetch(
          'https://people.googleapis.com/v1/people/me/connections?' +
          'pageSize=1000&' +
          'personFields=names,emailAddresses,photos&' +
          'sortOrder=FIRST_NAME_ASCENDING',
          { headers: { 'Authorization': `Bearer ${token}` } }
        ),
        fetch(
          'https://people.googleapis.com/v1/otherContacts?' +
          'pageSize=1000&' +
          'readMask=names,emailAddresses,photos',
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
      ]);

      if (!connectionsResponse.ok) {
        if (connectionsResponse.status === 401) {
          // Token expired - clear cache and show reconnect
          localStorage.removeItem('google_contacts_token');
          localStorage.removeItem('google_contacts_token_expiry');
          setHasGoogleAuth(false);
          setIsGoogleUser(true);
          throw new Error('Google access expired. Please reconnect to access your contacts.');
        }
        // throw new Error('Failed to fetch contacts'); // Don't fail hard if just one fails
      }

      const connectionsData = await connectionsResponse.json();
      const otherContactsData = otherContactsResponse.ok ? await otherContactsResponse.json() : { otherContacts: [] };
      
      const parsePerson = (person: any) => ({
        resourceName: person.resourceName,
        name: person.names?.[0]?.displayName || person.emailAddresses?.[0]?.value || 'Unknown',
        email: person.emailAddresses?.[0]?.value,
        photoUrl: person.photos?.[0]?.url
      });

      const savedContacts = (connectionsData.connections || [])
        .filter((person: any) => person.emailAddresses?.length > 0)
        .map(parsePerson);

      const otherContacts = (otherContactsData.otherContacts || [])
        .filter((person: any) => person.emailAddresses?.length > 0)
        .map(parsePerson);

      // Combine and deduplicate by email
      const allContacts = [...savedContacts, ...otherContacts]
        .filter((contact: GoogleContact, index: number, self: GoogleContact[]) =>
          index === self.findIndex(c => c.email === contact.email)
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      setContacts(allContacts);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (email: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else if (newSelected.size < maxSelections) {
      newSelected.add(email);
    }
    setSelectedEmails(newSelected);
  };

  const handleSendInvites = () => {
    onSelectContacts(Array.from(selectedEmails));
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Not authenticated with Google - show connect button
  if (!hasGoogleAuth) {
    // Show loading state while checking
    if (initialLoading) {
      return (
        <div className="p-6 text-center">
          <Loader2 className="w-8 h-8 text-[#CBAA5A] animate-spin mx-auto mb-4" />
          <p className="font-gilroy text-sm text-[#888]">Checking Google access...</p>
        </div>
      );
    }

    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-[#111] rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-[#CBAA5A]" />
        </div>
        <h3 className="font-riccione text-xl text-white">
          {isGoogleUser ? 'Grant Contacts Access' : 'Import from Google Contacts'}
        </h3>
        <p className="font-gilroy text-sm text-[#888] max-w-xs mx-auto">
          {isGoogleUser 
            ? 'We need permission to read your contacts. This is a one-time authorization.'
            : 'Connect your Google account to easily invite friends from your contacts.'}
        </p>
        {error && (
          <div className="flex items-center justify-center gap-2 text-red-400 text-sm font-gilroy">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        <Button
          onClick={signInWithGoogle}
          disabled={loading}
          className="bg-white text-black hover:bg-gray-100 font-gilroy tracking-wide"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {isGoogleUser ? 'Authorize Contacts Access' : 'Connect Google Account'}
        </Button>
        <button
          onClick={onClose}
          className="block mx-auto text-[#666] hover:text-white font-gilroy text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#CBAA5A]" />
          <h3 className="font-gilroy font-bold text-white tracking-[0.1em] uppercase text-sm">
            Google Contacts
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => accessToken && fetchContacts(accessToken)}
          disabled={loading}
          className="text-[#666] hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
        <Input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-black border-[#333] text-white font-gilroy placeholder:text-[#555]"
        />
      </div>

      {/* Selection count */}
      <p className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#666]">
        {selectedEmails.size} OF {maxSelections} SELECTED
      </p>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm font-gilroy p-3 bg-red-500/10 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#CBAA5A] animate-spin" />
        </div>
      )}

      {/* Contacts list */}
      {!loading && (
        <div className="max-h-[300px] overflow-y-auto space-y-1 scrollbar-hide">
          {filteredContacts.length === 0 ? (
            <p className="text-center text-[#666] font-gilroy py-8">
              {searchQuery ? 'No contacts match your search' : 'No contacts with email addresses found'}
            </p>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.resourceName}
                onClick={() => toggleContact(contact.email)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  selectedEmails.has(contact.email)
                    ? 'bg-[#CBAA5A]/10 border border-[#CBAA5A]/30'
                    : 'bg-[#0a0a0a] border border-transparent hover:border-[#333]'
                }`}
              >
                <Checkbox
                  checked={selectedEmails.has(contact.email)}
                  className="border-[#333] data-[state=checked]:bg-[#CBAA5A] data-[state=checked]:border-[#CBAA5A]"
                />
                <Avatar className="w-10 h-10">
                  <AvatarImage src={contact.photoUrl} />
                  <AvatarFallback className="bg-[#222] text-[#CBAA5A] font-gilroy text-xs">
                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-gilroy text-white text-sm truncate">
                    {contact.name}
                  </p>
                  <p className="font-gilroy text-[10px] text-[#666] truncate">
                    {contact.email}
                  </p>
                </div>
                {selectedEmails.has(contact.email) && (
                  <Check className="w-4 h-4 text-[#CBAA5A] flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 border-[#333] text-[#888] hover:text-white font-gilroy tracking-[0.1em] uppercase text-[10px]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSendInvites}
          disabled={selectedEmails.size === 0}
          className="flex-1 bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black hover:from-[#E5D9B6] hover:to-[#CBAA5A] font-gilroy tracking-[0.1em] uppercase text-[10px] disabled:opacity-50"
        >
          <Mail className="w-4 h-4 mr-2" />
          Invite {selectedEmails.size > 0 ? `(${selectedEmails.size})` : ''}
        </Button>
      </div>
    </div>
  );
};

