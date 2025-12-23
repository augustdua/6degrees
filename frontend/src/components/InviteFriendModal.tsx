import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Check, AlertCircle, Loader2, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiGet } from '@/lib/api';
import { GoogleContactsPicker } from './GoogleContactsPicker';

interface InviteFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralLink?: string; // Legacy prop, not used anymore
}

interface SentInvite {
  id: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  accepted_at?: string;
}

type ViewMode = 'main' | 'google-contacts';

export const InviteFriendModal: React.FC<InviteFriendModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitesRemaining, setInvitesRemaining] = useState(6);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [bulkSending, setBulkSending] = useState(false);
  const { toast } = useToast();

  // Handle opening Google Contacts picker
  const handleOpenGoogleContacts = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Opening Google Contacts picker');
    setViewMode('google-contacts');
  };

  useEffect(() => {
    if (isOpen) {
      loadInvites();
      setViewMode('main'); // Reset view when modal opens
    }
  }, [isOpen]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const response = await apiGet('/api/user-invites/my-invites');
      setInvitesRemaining(response.invitesRemaining ?? 6);
      setSentInvites(response.sentInvites || []);
    } catch (err) {
      console.error('Error loading invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiPost('/api/user-invites/send', { email: email.trim() });
      setSuccess(true);
      setInvitesRemaining(response.invitesRemaining);
      setEmail('');
      await loadInvites();
      
      toast({
        title: "Invite Sent!",
        description: `An invite code has been sent to ${email.trim()}`,
      });

      // Reset success after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  // Handle bulk invites from Google Contacts
  const handleGoogleContactsSelect = async (emails: string[]) => {
    if (emails.length === 0) return;

    setBulkSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const email of emails) {
      if (invitesRemaining <= 0) {
        toast({
          title: "No invites remaining",
          description: `Sent ${successCount} invites. You've used all your invites.`,
          variant: "destructive"
        });
        break;
      }

      try {
        const response = await apiPost('/api/user-invites/send', { email: email.trim() });
        setInvitesRemaining(response.invitesRemaining);
        successCount++;
      } catch (err: any) {
        console.error(`Failed to invite ${email}:`, err);
        failCount++;
      }
    }

    await loadInvites();
    setBulkSending(false);
    setViewMode('main');

    if (successCount > 0) {
      toast({
        title: `${successCount} Invite${successCount > 1 ? 's' : ''} Sent!`,
        description: failCount > 0 
          ? `${failCount} invite${failCount > 1 ? 's' : ''} failed (may already be invited).`
          : `Your friends will receive invite codes via email.`,
      });
    } else if (failCount > 0) {
      toast({
        title: "Invites Failed",
        description: "Selected contacts may already be invited or registered.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="text-[9px] font-gilroy tracking-[0.1em] uppercase px-2 py-1 rounded-full bg-green-500/20 text-green-400">JOINED</span>;
      case 'pending':
        return <span className="text-[9px] font-gilroy tracking-[0.1em] uppercase px-2 py-1 rounded-full bg-[#CBAA5A]/20 text-[#CBAA5A]">PENDING</span>;
      case 'expired':
        return <span className="text-[9px] font-gilroy tracking-[0.1em] uppercase px-2 py-1 rounded-full bg-[#333] text-[#666]">EXPIRED</span>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-black rounded-[24px] max-w-lg w-full max-h-[90vh] overflow-y-auto border-2 border-[#222] scrollbar-hide"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-black border-b border-[#222] px-6 py-5 flex items-center justify-between rounded-t-[24px]">
          <div className="flex items-center gap-3">
            {viewMode === 'google-contacts' && (
              <button
                onClick={() => setViewMode('main')}
                className="p-2 hover:bg-[#111] rounded-lg transition-all text-[#666] hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="font-riccione text-2xl text-white">
                {viewMode === 'google-contacts' ? 'Import Contacts' : 'Invite to Zaurq'}
              </h2>
              <p className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#666] mt-1">
                {invitesRemaining} OF 6 INVITES REMAINING
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#111] rounded-lg transition-all text-[#666] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Bulk sending overlay */}
          {bulkSending && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-60">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-[#CBAA5A] animate-spin mx-auto mb-4" />
                <p className="font-gilroy text-white">Sending invites...</p>
              </div>
            </div>
          )}

          {viewMode === 'google-contacts' ? (
            /* Google Contacts Picker View */
            <GoogleContactsPicker
              onSelectContacts={handleGoogleContactsSelect}
              onClose={() => setViewMode('main')}
              maxSelections={Math.min(invitesRemaining, 6)}
            />
          ) : (
            /* Main View */
            <>
              {/* Invite Count Display */}
              <div className="flex justify-center gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      i < invitesRemaining
                        ? 'border-[#CBAA5A] bg-[#CBAA5A]/10'
                        : 'border-[#333] bg-transparent'
                    }`}
                  >
                    {i < (6 - invitesRemaining) && (
                      <Check className="w-4 h-4 text-[#CBAA5A]" />
                    )}
                  </div>
                ))}
              </div>

              {/* Import from Google Contacts Button */}
              {invitesRemaining > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleOpenGoogleContacts}
                  className="w-full flex items-center justify-between p-4 h-auto bg-[#0a0a0a] rounded-2xl border border-[#222] hover:border-[#CBAA5A]/30 hover:bg-[#0a0a0a] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center group-hover:bg-[#CBAA5A]/10 transition-colors">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-gilroy font-bold text-white text-sm tracking-[0.05em]">
                        Import from Google Contacts
                      </p>
                      <p className="font-gilroy text-[10px] text-[#666] tracking-[0.1em] uppercase">
                        Select friends to invite
                      </p>
                    </div>
                  </div>
                  <Users className="w-5 h-5 text-[#666] group-hover:text-[#CBAA5A] transition-colors" />
                </Button>
              )}

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-[#222]"></div>
                <span className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#555]">or</span>
                <div className="flex-1 h-px bg-[#222]"></div>
              </div>

              {/* Email Input Section */}
              <div className="bg-[#0a0a0a] rounded-2xl p-5 border border-[#222]">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="w-5 h-5 text-[#CBAA5A]" />
                  <h3 className="font-gilroy font-bold text-white tracking-[0.1em] uppercase text-sm">
                    Send Invite Manually
                  </h3>
                </div>
                
                <p className="font-gilroy text-[#888] text-sm mb-4">
                  Enter the email of someone you'd like to invite. They'll receive a 4-digit code to join.
                </p>

                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                      className="pl-10 bg-black border-[#333] text-white font-gilroy placeholder:text-[#555]"
                      disabled={sending || invitesRemaining <= 0}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm font-gilroy">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-green-400 text-sm font-gilroy">
                      <Check className="w-4 h-4" />
                      Invite sent successfully!
                    </div>
                  )}

                  <Button
                    onClick={handleSendInvite}
                    disabled={sending || !email.trim() || invitesRemaining <= 0}
                    className="w-full py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black hover:from-[#E5D9B6] hover:to-[#CBAA5A] disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        SENDING...
                      </>
                    ) : invitesRemaining <= 0 ? (
                      'NO INVITES REMAINING'
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        SEND INVITE
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Sent Invites List */}
              {sentInvites.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#666]">
                    SENT INVITES
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide">
                    {sentInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-xl border border-[#222]"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-gilroy text-white text-sm truncate">
                            {invite.invitee_email}
                          </p>
                          <p className="font-gilroy text-[10px] text-[#666] tracking-[0.1em] uppercase">
                            {new Date(invite.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(invite.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Text */}
              <p className="text-center font-gilroy text-[10px] tracking-[0.1em] uppercase text-[#555]">
                Invites are exclusive • Choose wisely who you bring in
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
