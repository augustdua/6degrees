import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Building2, X, Plus } from 'lucide-react';
import { apiPost, apiGet, apiDelete } from '@/lib/api';

interface Organization {
  id: string | null;
  name: string;
  logo_url: string | null;
  domain: string;
  industry: string | null;
  description: string | null;
  website: string;
  source?: string;
}

interface UserOrganization {
  id: string;
  position: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  organization_type?: 'work' | 'education';
  organization: Organization;
}

interface OrganizationSearchProps {
  userId: string;
  onOrganizationsChange?: (orgs: UserOrganization[]) => void;
}

const OrganizationSearch: React.FC<OrganizationSearchProps> = ({ userId, onOrganizationsChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [position, setPosition] = useState('');
  const [orgType, setOrgType] = useState<'work' | 'education'>('work');
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load user's current organizations
  useEffect(() => {
    const loadUserOrganizations = async () => {
      try {
        const response = await apiGet(`/api/organizations/user/${userId}`);
        setUserOrganizations(response.organizations || []);
        onOrganizationsChange?.(response.organizations || []);
      } catch (error) {
        console.error('Error loading user organizations:', error);
      }
    };

    if (userId) {
      loadUserOrganizations();
    }
  }, [userId]);

  // Search organizations as user types
  useEffect(() => {
    const searchOrganizations = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await apiGet(`/api/organizations/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.organizations || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching organizations:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchOrganizations, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrg(org);
    setSearchQuery(org.name);
    setShowResults(false);
  };

  const handleAddOrganization = async () => {
    if (!selectedOrg || !position.trim()) {
      return;
    }

    setAdding(true);
    try {
      const response = await apiPost('/api/organizations/user/add', {
        organizationId: selectedOrg.id,
        organizationData: selectedOrg.id ? null : {
          name: selectedOrg.name,
          logo_url: selectedOrg.logo_url,
          domain: selectedOrg.domain,
          website: selectedOrg.website,
          industry: selectedOrg.industry,
          description: selectedOrg.description
        },
        position: position.trim(),
        organizationType: orgType,
        is_current: true
      });

      // Add to user organizations list
      const newOrg = response.organization;
      const updated = [...userOrganizations, newOrg];
      setUserOrganizations(updated);
      onOrganizationsChange?.(updated);

      // Reset form
      setSelectedOrg(null);
      setSearchQuery('');
      setPosition('');
      setOrgType('work');
    } catch (error) {
      console.error('Error adding organization:', error);
      alert('Failed to add organization');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveOrganization = async (userOrgId: string) => {
    try {
      await apiDelete(`/api/organizations/user/${userOrgId}`);
      const updated = userOrganizations.filter(o => o.id !== userOrgId);
      setUserOrganizations(updated);
      onOrganizationsChange?.(updated);
    } catch (error) {
      console.error('Error removing organization:', error);
      alert('Failed to remove organization');
    }
  };

  // Separate organizations by type
  const workOrganizations = userOrganizations.filter(o => o.organization_type === 'work' || !o.organization_type);
  const educationOrganizations = userOrganizations.filter(o => o.organization_type === 'education');

  const renderOrganizationList = (orgs: UserOrganization[], title: string) => {
    if (orgs.length === 0) return null;

    return (
      <div className="space-y-2">
        <Label className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-[#888]">{title}</Label>
        <div className="space-y-2">
          {orgs.map((userOrg) => (
            <div
              key={userOrg.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[#333] bg-[#111]"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={userOrg.organization.logo_url || undefined} />
                <AvatarFallback className="bg-[#222] text-[#CBAA5A]">
                  <Building2 className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-gilroy tracking-[0.05em] uppercase text-[11px] text-white truncate">{userOrg.organization.name}</p>
                <p className="font-gilroy tracking-[0.05em] text-[10px] text-[#888] truncate">{userOrg.position}</p>
              </div>
              {userOrg.is_current && (
                <Badge variant="secondary" className="font-gilroy tracking-[0.1em] uppercase text-[8px] bg-[#CBAA5A] text-black border-0">Current</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveOrganization(userOrg.id)}
                className="h-8 w-8 p-0 text-[#666] hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Work Organizations */}
      {renderOrganizationList(workOrganizations, 'Work Experience')}

      {/* Education Organizations */}
      {renderOrganizationList(educationOrganizations, 'Education')}

      {/* Add New Organization */}
      <div className="space-y-3">
        <Label className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-[#888]">Add Organization</Label>

        {/* Organization Search */}
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#666]" />
            <Input
              type="text"
              placeholder="Search for your company, university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="pl-9 bg-[#111] border-[#333] font-gilroy text-[11px] placeholder:text-[#555] placeholder:uppercase placeholder:tracking-[0.1em]"
            />
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((org, index) => (
                <button
                  key={`${org.domain}-${index}`}
                  onClick={() => handleSelectOrganization(org)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={org.logo_url || undefined} />
                    <AvatarFallback>
                      <Building2 className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{org.name}</p>
                    {org.domain && (
                      <p className="text-xs text-muted-foreground truncate">{org.domain}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground mt-1">Searching...</p>
          )}
        </div>

        {/* Position Input (shown when org is selected) */}
        {selectedOrg && (
          <div className="space-y-3 p-4 border rounded-lg bg-accent/50">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedOrg.logo_url || undefined} />
                <AvatarFallback>
                  <Building2 className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <p className="font-medium">{selectedOrg.name}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgType">Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={orgType === 'work' ? 'default' : 'outline'}
                  onClick={() => setOrgType('work')}
                  className="flex-1"
                  size="sm"
                >
                  Work
                </Button>
                <Button
                  type="button"
                  variant={orgType === 'education' ? 'default' : 'outline'}
                  onClick={() => setOrgType('education')}
                  className="flex-1"
                  size="sm"
                >
                  Education
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">
                {orgType === 'work' ? 'Your Role/Position' : 'Degree/Program'}
              </Label>
              <Input
                id="position"
                type="text"
                placeholder={orgType === 'work' ? 'e.g., Software Engineer, CEO' : 'e.g., Bachelor of Science, MBA'}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddOrganization}
                disabled={adding || !position.trim()}
                className="flex-1"
                size="sm"
              >
                {adding ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedOrg(null);
                  setSearchQuery('');
                  setPosition('');
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationSearch;
