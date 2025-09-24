import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLinkedIn } from '@/hooks/useLinkedIn';
import { useAuth } from '@/hooks/useAuth';
import { Linkedin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function LinkedInConnect() {
  const { user } = useAuth();
  const { connectLinkedIn, disconnectLinkedIn, isLinkedInConnected, loading } = useLinkedIn();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const handleConnect = () => {
    connectLinkedIn();
  };

  const handleDisconnect = async () => {
    await disconnectLinkedIn();
    setShowDisconnectDialog(false);
  };

  const formatConnectedDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Linkedin className="w-5 h-5 text-blue-600" />
          <CardTitle>LinkedIn Integration</CardTitle>
          {isLinkedInConnected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
        <CardDescription>
          {isLinkedInConnected
            ? 'Your LinkedIn profile is connected. This helps build trust and improves connection success rates.'
            : 'Connect your LinkedIn profile to enhance your credibility and improve connection success rates.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLinkedInConnected ? (
          <>
            {/* Connected State */}
            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <Avatar className="w-12 h-12">
                <AvatarImage
                  src={user?.linkedinProfilePicture || user?.avatar}
                  alt={`${user?.firstName} ${user?.lastName}`}
                />
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h4 className="font-medium text-green-900">
                  {user?.firstName} {user?.lastName}
                </h4>
                {user?.linkedinHeadline && (
                  <p className="text-sm text-green-700 mt-1">
                    {user.linkedinHeadline}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-green-600">
                  <span>Connected {formatConnectedDate(user?.linkedinConnectedAt)}</span>
                  {user?.linkedinUrl && (
                    <a
                      href={user.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      View Profile →
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">Benefits of connecting LinkedIn:</p>
                  <ul className="space-y-1">
                    <li>• Verified professional identity increases trust</li>
                    <li>• Higher response rates for connection requests</li>
                    <li>• Enhanced profile visibility in the network</li>
                    <li>• Access to LinkedIn-verified contact information</li>
                  </ul>
                </div>
              </div>
            </div>

            <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  )}
                  Disconnect LinkedIn
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect LinkedIn?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your LinkedIn integration from 6Degrees. You can always reconnect later,
                    but this may temporarily reduce your connection success rates.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
            {/* Disconnected State */}
            <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Linkedin className="w-6 h-6 text-blue-600" />
              </div>

              <div className="flex-1">
                <h4 className="font-medium">Connect Your LinkedIn Profile</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Increase your connection success rate by up to 300% with verified LinkedIn credentials.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Linkedin className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">What we'll access:</p>
                  <ul className="space-y-1">
                    <li>• Basic profile information (name, headline, photo)</li>
                    <li>• Email address for verification</li>
                    <li>• LinkedIn profile URL</li>
                  </ul>
                  <p className="mt-2 text-blue-600">
                    We never access your connections or post on your behalf.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Linkedin className="w-4 h-4 mr-2" />
              )}
              Connect LinkedIn Profile
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}