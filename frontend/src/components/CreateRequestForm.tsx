import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect, useRef } from "react";
import { Share2, Copy, ExternalLink, Coins, Building2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRequests } from "@/hooks/useRequests";
import { useAuth } from "@/hooks/useAuth";
import { convertAndFormatINR, usdToInr } from "@/lib/currency";
import { apiGet } from "@/lib/api";
import { AIVideoGenerator } from "@/components/AIVideoGenerator";

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  domain: string;
}

export default function CreateRequestForm() {
  const [request, setRequest] = useState({
    target: "",
    message: "",
    credit_cost: 50,
    target_cash_reward: 100,
    target_organization_id: null as string | null
  });
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showOrgResults, setShowOrgResults] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { createRequest, loading } = useRequests();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch('/api/credits/balance', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUserCredits(data.total_credits || 0);
        }
      } catch (error) {
        console.error('Error fetching credits:', error);
      }
    };

    if (user) {
      fetchCredits();
    }
  }, [user]);

  // Search organizations as user types
  useEffect(() => {
    const searchOrganizations = async () => {
      if (orgSearchQuery.trim().length < 2) {
        setOrgSearchResults([]);
        return;
      }

      setOrgLoading(true);
      try {
        const data = await apiGet(`/api/organizations/search?q=${encodeURIComponent(orgSearchQuery)}`);
        setOrgSearchResults(data.organizations || []);
        setShowOrgResults(true);
      } catch (error) {
        console.error('Error searching organizations:', error);
        setOrgSearchResults([]);
      } finally {
        setOrgLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchOrganizations, 300);
    return () => clearTimeout(debounceTimer);
  }, [orgSearchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowOrgResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setRequest({ ...request, target_organization_id: org.id });
    setOrgSearchQuery('');
    setShowOrgResults(false);
  };

  const handleRemoveOrg = () => {
    setSelectedOrg(null);
    setRequest({ ...request, target_organization_id: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create a connection request.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has enough credits
    if (userCredits < request.credit_cost) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${request.credit_cost} credits but only have ${userCredits}. Purchase more credits to continue.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createRequest(
        request.target,
        request.message,
        request.credit_cost,
        request.target_cash_reward,
        request.target_organization_id
      );
      setGeneratedLink(result.request.shareable_link);
      setCreatedRequestId(result.request.id);
      setUserCredits(prev => prev - request.credit_cost);

      toast({
        title: "Request Created!",
        description: `Now generating your AI video... ${request.credit_cost} credits deducted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create request",
        variant: "destructive",
      });
    }
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Link Copied!",
        description: "Share this link to start building your connection chain.",
      });
    }
  };

  if (createdRequestId && generatedLink) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* AI Video Generator */}
        <AIVideoGenerator
          requestId={createdRequestId}
          target={request.target}
          message={request.message}
          onVideoReady={setVideoUrl}
        />

        {/* Share Link (show after video is ready) */}
        {videoUrl && (
          <Card className="p-8 shadow-success">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-success rounded-full flex items-center justify-center mx-auto mb-6">
                <Share2 className="w-8 h-8 text-success-foreground" />
              </div>

              <h2 className="text-2xl font-bold mb-4">Your Video Request is Ready!</h2>
              <p className="text-muted-foreground mb-8">
                Share this link through LinkedIn, Twitter, WhatsApp, or any platform.
                People will see your video and can join your chain!
              </p>

              <div className="bg-muted p-4 rounded-lg mb-6 break-all text-sm font-mono">
                {generatedLink}
              </div>

              <div className="flex gap-4 justify-center mb-6">
                <Button onClick={copyLink} variant="network">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button variant="outline" asChild>
                  <a href={generatedLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview
                  </a>
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline">Credits Spent: {request.credit_cost}</Badge>
                <Badge variant="outline">Target Reward: {convertAndFormatINR(request.target_cash_reward)}</Badge>
                <Badge variant="outline" className="bg-success/10 text-success">Active Chain</Badge>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card className="p-8 max-w-2xl mx-auto shadow-network">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Create Your Connection Request</h2>
          <p className="text-muted-foreground">
            Tell us who you want to connect with and we'll create a shareable link for your network.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Who do you want to connect with?</Label>
          <Input
            id="target"
            placeholder="e.g., Someone at OpenAI's tech team, The CEO of Tesla, A venture capitalist in Silicon Valley"
            value={request.target}
            onChange={(e) => setRequest({...request, target: e.target.value})}
            required
            className="text-lg py-3"
          />
          <p className="text-sm text-muted-foreground">
            Be specific but not too narrow. "Someone at OpenAI" works better than "Sam Altman specifically"
          </p>
        </div>

        {/* Organization Search */}
        <div className="space-y-2">
          <Label htmlFor="organization">Target Organization (optional)</Label>
          {selectedOrg ? (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
              <Avatar className="h-10 w-10">
                {selectedOrg.logo_url ? (
                  <AvatarImage src={selectedOrg.logo_url} alt={selectedOrg.name} />
                ) : (
                  <AvatarFallback>
                    <Building2 className="h-5 w-5" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{selectedOrg.name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrg.domain}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveOrg}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="relative" ref={searchRef}>
              <Input
                id="organization"
                placeholder="Search for an organization..."
                value={orgSearchQuery}
                onChange={(e) => setOrgSearchQuery(e.target.value)}
                onFocus={() => orgSearchQuery.length >= 2 && setShowOrgResults(true)}
                className="text-lg py-3"
              />
              {showOrgResults && orgSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {orgSearchResults.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleSelectOrg(org)}
                    >
                      <Avatar className="h-10 w-10">
                        {org.logo_url ? (
                          <AvatarImage src={org.logo_url} alt={org.name} />
                        ) : (
                          <AvatarFallback>
                            <Building2 className="h-5 w-5" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground">{org.domain}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Add the organization where your target works to make your request more specific
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Your message (optional)</Label>
          <Textarea
            id="message"
            placeholder="Hi! I'm building an AI startup and would love to chat with someone on the OpenAI team about their API integration best practices..."
            value={request.message}
            onChange={(e) => setRequest({...request, message: e.target.value})}
            rows={4}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-600" />
                Your Credits
              </Label>
              <span className="font-bold text-indigo-600">{userCredits} credits</span>
            </div>
            <p className="text-xs text-gray-600">
              Credits are used to create requests. Path participants earn credits, targets get cash.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit_cost">Credit Cost for Request</Label>
            <div className="flex items-center gap-4">
              <Input
                id="credit_cost"
                type="number"
                min={10}
                max={1000}
                value={request.credit_cost}
                onChange={(e) => setRequest({...request, credit_cost: parseInt(e.target.value) || 10})}
                className="w-32"
              />
              <div className="text-sm text-muted-foreground">
                <div>Credits will be distributed to path participants when chain completes</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_cash_reward">Target Cash Reward (₹)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="target_cash_reward"
                type="number"
                min={Math.round(usdToInr(10))}
                max={Math.round(usdToInr(10000))}
                value={Math.round(usdToInr(request.target_cash_reward))}
                onChange={(e) => setRequest({...request, target_cash_reward: Math.round(parseInt(e.target.value) / 83)})}
                className="w-32"
              />
              <div className="text-sm text-muted-foreground">
                <div>Cash paid only to the target person</div>
                <div className="font-medium">You only pay if the connection succeeds</div>
              </div>
            </div>
          </div>
        </div>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Request"}
          <Share2 className="ml-2 w-5 h-5" />
        </Button>

        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-purple-600">
            📹 Next: You'll create an AI video for your request
          </p>
          <p className="text-xs text-muted-foreground">
            Your link will be active for 30 days or until the connection is made
          </p>
        </div>
      </form>
    </Card>
  );
}