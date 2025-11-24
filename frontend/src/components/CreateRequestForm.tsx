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
import GamifiedFormCarousel, { FormStep } from "./GamifiedFormCarousel";

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
        const data = await apiGet('/api/credits/balance');
        setUserCredits(data.total_credits || 0);
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

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create a connection request.",
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
        description: "Your connection request is now live and ready to share.",
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
        description: "Share this link to grow your referral network.",
      });
    }
  };

  const handleCancel = () => {
    // Reset form or navigate away
    setRequest({
      target: "",
      message: "",
      credit_cost: 50,
      target_cash_reward: 100,
      target_organization_id: null
    });
    setSelectedOrg(null);
    window.history.back();
  };

  // Define form steps for the gamified carousel
  const formSteps: FormStep[] = [
    {
      id: 'target',
      title: 'Who do you want to connect with?',
      description: 'Be specific but not too narrow',
      isValid: request.target.trim().length > 0,
      component: (
        <div className="space-y-4">
          <Input
            placeholder="e.g., Someone at OpenAI's tech team"
            value={request.target}
            onChange={(e) => setRequest({...request, target: e.target.value})}
            className="text-lg py-6"
            autoFocus
          />
          <p className="text-sm text-muted-foreground text-center">
            💡 "Someone at OpenAI" works better than "Sam Altman specifically"
          </p>
        </div>
      )
    },
    {
      id: 'organization',
      title: 'Which organization?',
      description: 'Select the target organization (optional)',
      isValid: !!selectedOrg,
      isOptional: true,
      component: (
        <div className="space-y-4">
          {selectedOrg ? (
            <div className="flex items-center gap-4 p-4 border-2 border-primary rounded-lg bg-primary/5">
              <Avatar className="h-16 w-16">
                {selectedOrg.logo_url ? (
                  <AvatarImage src={selectedOrg.logo_url} alt={selectedOrg.name} />
                ) : (
                  <AvatarFallback>
                    <Building2 className="h-8 w-8" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="font-bold text-lg">{selectedOrg.name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrg.domain}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveOrg}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="relative" ref={searchRef}>
              <Input
                placeholder="Search for an organization..."
                value={orgSearchQuery}
                onChange={(e) => setOrgSearchQuery(e.target.value)}
                onFocus={() => orgSearchQuery.length >= 2 && setShowOrgResults(true)}
                className="text-lg py-6"
              />
              {orgLoading && (
                <p className="text-sm text-muted-foreground mt-2 text-center">🔍 Searching...</p>
              )}
              {showOrgResults && orgSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-background border-2 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {orgSearchResults.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center gap-3 p-4 hover:bg-primary/10 cursor-pointer transition-colors border-b last:border-b-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOrg(org);
                      }}
                    >
                      <Avatar className="h-12 w-12">
                        {org.logo_url ? (
                          <AvatarImage src={org.logo_url} alt={org.name} />
                        ) : (
                          <AvatarFallback>
                            <Building2 className="h-6 w-6" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-semibold">{org.name}</p>
                        <p className="text-sm text-muted-foreground">{org.domain}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'message',
      title: 'Add your message',
      description: 'Tell them why you want to connect (optional)',
      isValid: request.message.trim().length > 0,
      isOptional: true,
      component: (
        <div className="space-y-4">
          <Textarea
            placeholder="Hi! I'm building an AI startup and would love to chat about API integration best practices..."
            value={request.message}
            onChange={(e) => setRequest({...request, message: e.target.value})}
            rows={6}
            className="text-base resize-none"
          />
          <p className="text-xs text-muted-foreground text-center">
            {request.message.length} characters
          </p>
        </div>
      )
    },
    {
      id: 'credit_cost',
      title: 'Set credit cost',
      description: 'Credits will be distributed to successful referrers',
      isValid: request.credit_cost >= 10 && request.credit_cost <= 1000,
      component: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="flex items-center gap-2 text-lg font-semibold">
                <Coins className="w-6 h-6 text-yellow-600" />
                Your Credits
              </Label>
              <span className="font-bold text-2xl text-yellow-700">{userCredits}</span>
            </div>
            <p className="text-sm text-gray-600">
              Credits are distributed to the referral chain when your request succeeds
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="credit_cost" className="text-lg">Credit Cost</Label>
            <Input
              id="credit_cost"
              type="number"
              min={10}
              max={1000}
              step={10}
              value={request.credit_cost}
              onChange={(e) => setRequest({...request, credit_cost: parseInt(e.target.value) || 10})}
              className="text-2xl py-6 text-center font-bold"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Min: 10</span>
              <span>Max: 1000</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cash_reward',
      title: 'Target cash reward',
      description: 'Cash paid only to the target person when connection succeeds',
      isValid: Math.round(usdToInr(request.target_cash_reward)) >= Math.round(usdToInr(10)),
      component: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-white/10 to-white/5 border-2 border-white/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[#CBAA5A] rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <p className="font-bold text-lg">Pay Only On Success</p>
                <p className="text-sm text-gray-600">You only pay if the connection is made</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="target_cash_reward" className="text-lg">Cash Reward (₹)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                ₹
              </span>
              <Input
                id="target_cash_reward"
                type="number"
                min={Math.round(usdToInr(10))}
                max={Math.round(usdToInr(10000))}
                step={100}
                value={Math.round(usdToInr(request.target_cash_reward))}
                onChange={(e) => setRequest({...request, target_cash_reward: Math.round(parseInt(e.target.value) / 83)})}
                className="text-2xl py-6 text-center font-bold pl-12"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Min: ₹{Math.round(usdToInr(10))}</span>
              <span>Max: ₹{Math.round(usdToInr(10000))}</span>
            </div>
          </div>
        </div>
      )
    },
  ];

  if (createdRequestId && generatedLink) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Request Created Successfully */}
        <Card className="p-8 shadow-success animate-in fade-in zoom-in duration-500">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-[#CBAA5A] to-[#B28A28] rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Share2 className="w-10 h-10 text-black" />
            </div>

            <h2 className="text-3xl font-bold mb-4">🎉 Request Created Successfully!</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Your connection request is now live. Share this link to start building your network!
            </p>

            <div className="bg-muted p-4 rounded-lg mb-6 break-all text-sm font-mono border-2 border-primary">
              {generatedLink}
            </div>

            <div className="flex gap-4 justify-center mb-6">
              <Button onClick={copyLink} variant="default" size="lg" className="text-lg">
                <Copy className="w-5 h-5 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href={generatedLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Preview
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Badge variant="outline" className="text-base py-2 px-4">
                📊 Credits: {request.credit_cost}
              </Badge>
              <Badge variant="outline" className="text-base py-2 px-4">
                💰 Reward: {convertAndFormatINR(request.target_cash_reward)}
              </Badge>
              <Badge variant="default" className="text-base py-2 px-4 bg-white text-black">
                ✅ Active
              </Badge>
            </div>

            <div className="mt-8 flex gap-4 justify-center">
              <Button variant="outline" size="lg" onClick={() => window.location.href = '/dashboard'}>
                Go to Dashboard
              </Button>
              <Button variant="default" size="lg" onClick={() => window.location.href = `/request/${createdRequestId}`}>
                View Request Details
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Create Your Connection Request
        </h1>
        <p className="text-lg text-muted-foreground">
          Let's make this quick and fun! Just a few questions...
        </p>
      </div>

      <GamifiedFormCarousel
        steps={formSteps}
        onComplete={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={loading}
        submitButtonText="🚀 Create Request"
      />

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          ⏰ Your request will be active for 30 days or until the connection is made
        </p>
      </div>
    </div>
  );
}
