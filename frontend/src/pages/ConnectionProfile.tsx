import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MessageCircle, Calendar, Gift, MapPin, Briefcase, Mail, Phone, Edit2, Save, X, Loader2 } from 'lucide-react';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';
import { useToast } from '@/hooks/use-toast';
import TopHeader from '@/components/TopHeader';

interface Connection {
  id: string;
  contact_name?: string;
  display_name?: string;
  photo_url?: string;
  email?: string;
  phone?: string;
  relationship_context?: string;
  how_we_met?: string;
  notes?: string;
  birthday?: string;
  location?: string;
  company?: string;
  role?: string;
  last_interaction_date?: string;
  created_at?: string;
}

export default function ConnectionProfile() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    contact_name: '',
    relationship_context: '',
    how_we_met: '',
    notes: '',
    birthday: '',
    location: '',
    company: '',
    role: '',
  });

  useEffect(() => {
    if (!connectionId || !user) return;
    
    const fetchConnection = async () => {
      setLoading(true);
      try {
        // Try to get the specific connection
        const connections = await apiGet('/api/connections', { skipCache: true });
        const found = Array.isArray(connections) 
          ? connections.find((c: any) => c.id === connectionId)
          : null;
        
        if (found) {
          setConnection(found);
          setEditForm({
            contact_name: found.contact_name || found.display_name || '',
            relationship_context: found.relationship_context || '',
            how_we_met: found.how_we_met || '',
            notes: found.notes || '',
            birthday: found.birthday || '',
            location: found.location || '',
            company: found.company || '',
            role: found.role || '',
          });
        }
      } catch (err) {
        console.error('Error fetching connection:', err);
        toast({ title: 'Error', description: 'Could not load connection', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnection();
  }, [connectionId, user, toast]);

  const handleSave = async () => {
    if (!connectionId) return;
    setSaving(true);
    try {
      // In a real app, this would call an API to update the connection
      // For now, just update local state
      setConnection(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
      toast({ title: 'Saved', description: 'Connection details updated' });
    } catch (err) {
      toast({ title: 'Error', description: 'Could not save changes', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const name = connection?.contact_name || connection?.display_name || 'Unknown';
  const firstName = name.split(' ')[0] || '';
  const lastName = name.split(' ')[1] || '';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#CBAA5A]" />
        </div>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Connection not found</h1>
          <p className="text-muted-foreground mb-6">This connection may have been removed or doesn't exist.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Profile Header */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-border">
              <AvatarImage src={connection.photo_url || undefined} alt={name} className="object-cover" />
              <AvatarFallback className={`text-2xl ${getAvatarColor(connection.id)}`}>
                {getInitials(firstName, lastName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              {editing ? (
                <Input
                  value={editForm.contact_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="text-2xl font-bold mb-2"
                  placeholder="Name"
                />
              ) : (
                <h1 className="text-2xl font-bold text-foreground mb-1">{name}</h1>
              )}
              
              {editing ? (
                <div className="flex gap-2 mb-2">
                  <Input
                    value={editForm.role}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="Role"
                    className="flex-1"
                  />
                  <Input
                    value={editForm.company}
                    onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company"
                    className="flex-1"
                  />
                </div>
              ) : (
                (connection.role || connection.company) && (
                  <p className="text-muted-foreground mb-2">
                    {[connection.role, connection.company].filter(Boolean).join(' at ')}
                  </p>
                )
              )}

              {editing ? (
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Location"
                  className="mb-2"
                />
              ) : (
                connection.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{connection.location}</span>
                  </div>
                )
              )}
            </div>

            {/* Edit/Save Button */}
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#CBAA5A] text-black hover:bg-[#D4B76A]"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-border">
            <Button
              onClick={() => navigate('/messages')}
              className="flex-1 bg-[#CBAA5A] text-black hover:bg-[#D4B76A]"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/profile')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </div>
        </div>

        {/* Contact Info */}
        {(connection.email || connection.phone) && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-bold tracking-[0.15em] uppercase text-muted-foreground mb-4">Contact</h2>
            <div className="space-y-3">
              {connection.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${connection.email}`} className="text-sm text-foreground hover:text-[#CBAA5A]">
                    {connection.email}
                  </a>
                </div>
              )}
              {connection.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${connection.phone}`} className="text-sm text-foreground hover:text-[#CBAA5A]">
                    {connection.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Relationship Context */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-bold tracking-[0.15em] uppercase text-muted-foreground mb-4">Relationship</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">How we met</label>
              {editing ? (
                <Input
                  value={editForm.how_we_met}
                  onChange={(e) => setEditForm(prev => ({ ...prev, how_we_met: e.target.value }))}
                  placeholder="How did you meet?"
                  className="mt-1"
                />
              ) : (
                <p className="text-sm text-foreground mt-1">
                  {connection.how_we_met || <span className="text-muted-foreground italic">Not specified</span>}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Context</label>
              {editing ? (
                <Input
                  value={editForm.relationship_context}
                  onChange={(e) => setEditForm(prev => ({ ...prev, relationship_context: e.target.value }))}
                  placeholder="Relationship context"
                  className="mt-1"
                />
              ) : (
                <p className="text-sm text-foreground mt-1">
                  {connection.relationship_context || <span className="text-muted-foreground italic">Not specified</span>}
                </p>
              )}
            </div>

            {(connection.birthday || editing) && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5" />
                  Birthday
                </label>
                {editing ? (
                  <Input
                    type="date"
                    value={editForm.birthday}
                    onChange={(e) => setEditForm(prev => ({ ...prev, birthday: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm text-foreground mt-1">
                    {connection.birthday ? new Date(connection.birthday).toLocaleDateString() : <span className="text-muted-foreground italic">Not specified</span>}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-bold tracking-[0.15em] uppercase text-muted-foreground mb-4">Notes</h2>
          {editing ? (
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes about this connection..."
              className="min-h-[120px]"
            />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {connection.notes || <span className="text-muted-foreground italic">No notes yet. Click edit to add some.</span>}
            </p>
          )}
        </div>

        {/* Activity */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-bold tracking-[0.15em] uppercase text-muted-foreground mb-4">Activity</h2>
          <div className="space-y-3">
            {connection.last_interaction_date && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last interaction</span>
                <span className="text-foreground">{new Date(connection.last_interaction_date).toLocaleDateString()}</span>
              </div>
            )}
            {connection.created_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Added to network</span>
                <span className="text-foreground">{new Date(connection.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

