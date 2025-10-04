import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Building2, X, Plus } from 'lucide-react';
import { apiPost, apiGet } from '@/lib/api';

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
    } catch (error) {
      console.error('Error adding organization:', error);
      alert('Failed to add organization');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveOrganization = async (userOrgId: string) => {
    try {
      await apiPost(`/api/organizations/user/${userOrgId}`, {}, 'DELETE');
      const updated = userOrganizations.filter(o => o.id !== userOrgId);
      setUserOrganizations(updated);
      onOrganizationsChange?.(updated);
    } catch (error) {
      console.error('Error removing organization:', error);
      alert('Failed to remove organization');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Organizations */}
      {userOrganizations.length > 0 && (
        <div className="space-y-2">
          <Label>Your Organizations</Label>
          <div className="space-y-2">
            {userOrganizations.map((userOrg) => (
              <div
                key={userOrg.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userOrg.organization.logo_url || undefined} />
                  <AvatarFallback>
                    <Building2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{userOrg.organization.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{userOrg.position}</p>
                </div>
                {userOrg.is_current && (
                  <Badge variant="secondary" className="text-xs">Current</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOrganization(userOrg.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Organization */}
      <div className="space-y-3">
        <Label>Add Organization</Label>

        {/* Organization Search */}
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for your company, university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="pl-9"
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
              <Label htmlFor="position">Your Role/Position</Label>
              <Input
                id="position"
                type="text"
                placeholder="e.g., Software Engineer, Student, CEO"
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
