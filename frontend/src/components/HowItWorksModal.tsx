import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Target,
  Share2,
  DollarSign,
  Network,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

interface HowItWorksModalProps {
  onClose: () => void;
}

const HowItWorksModal = ({ onClose }: HowItWorksModalProps) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">How 6Degree Works</DialogTitle>
          <DialogDescription className="text-center">
            Professional networking through connection rewards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1 */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Create a Connection Request
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Specify who you want to connect with and set a reward amount. The more specific, the better!
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm"><strong>Example:</strong> "Connect me with the CTO of Microsoft" - $500 reward</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Share Your Link
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Share your connection request link with your network. Friends, colleagues, and connections can help!
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm"><strong>Pro Tip:</strong> Post on LinkedIn, share in Slack, or send to your most connected friends</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Chain of Connections
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    People in your network forward the request to their connections, creating a chain until someone reaches your target.
                  </p>
                  <div className="flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      You
                    </span>
                    <ArrowRight className="h-4 w-4" />
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Friend
                    </span>
                    <ArrowRight className="h-4 w-4" />
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Colleague
                    </span>
                    <ArrowRight className="h-4 w-4" />
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-purple-600" />
                      Target
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4 */}
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Reward Distribution
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    When your target is reached, the reward is automatically split among everyone who helped in the chain.
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm"><strong>Fair Split:</strong> Everyone who participated gets an equal share of the reward</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Key Features</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">LinkedIn profile integration</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Real-time chain visualization</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Professional networking focus</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Secure reward distribution</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={onClose} className="px-8">
            Got It!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HowItWorksModal;