import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Share2, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRequests } from "@/hooks/useRequests";
import { useAuth } from "@/hooks/useAuth";

export default function CreateRequestForm() {
  const [request, setRequest] = useState({
    target: "",
    message: "",
    reward: 100
  });
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const { toast } = useToast();
  const { createRequest, loading } = useRequests();
  const { user } = useAuth();

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

    try {
      const result = await createRequest(request.target, request.message, request.reward);
      setGeneratedLink(result.request.shareable_link);
      
      toast({
        title: "Chain Link Created!",
        description: "Your request is ready to share. Copy the link and spread it through your network.",
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

  if (generatedLink) {
    return (
      <Card className="p-8 max-w-2xl mx-auto shadow-success">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-success rounded-full flex items-center justify-center mx-auto mb-6">
            <Share2 className="w-8 h-8 text-success-foreground" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Your Chain Link is Ready!</h2>
          <p className="text-muted-foreground mb-8">
            Share this link through LinkedIn, Twitter, WhatsApp, or any platform. 
            Each person can forward it until it reaches: <span className="font-semibold text-foreground">{request.target}</span>
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
            <Badge variant="outline">Reward: ${request.reward}</Badge>
            <Badge variant="outline" className="bg-success/10 text-success">Active Chain</Badge>
          </div>
        </div>
      </Card>
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

        <div className="space-y-2">
          <Label htmlFor="reward">Reward Amount ($)</Label>
          <div className="flex items-center gap-4">
            <Input
              id="reward"
              type="number"
              min="10"
              max="10000"
              value={request.reward}
              onChange={(e) => setRequest({...request, reward: parseInt(e.target.value)})}
              className="w-32"
            />
            <div className="text-sm text-muted-foreground">
              <div>Split between everyone in the winning chain</div>
              <div className="font-medium">You only pay if the connection succeeds</div>
            </div>
          </div>
        </div>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Chain Link"}
          <Share2 className="ml-2 w-5 h-5" />
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Your link will be active for 30 days or until the connection is made
        </div>
      </form>
    </Card>
  );
}