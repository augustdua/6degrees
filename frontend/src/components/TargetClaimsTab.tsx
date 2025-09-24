import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTargetClaims } from '@/hooks/useTargetClaims';
import {
  Target,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Building2,
  Briefcase,
  MessageSquare,
  DollarSign,
  ExternalLink,
  Phone,
  Linkedin
} from 'lucide-react';

const TargetClaimsTab = () => {
  const { claims, loading, approveClaim, rejectClaim } = useTargetClaims();
  const [processingClaim, setProcessingClaim] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});

  const pendingClaims = (claims || []).filter(claim => claim.status === 'pending');
  const reviewedClaims = (claims || []).filter(claim => claim.status !== 'pending');

  const handleApproveClaim = async (claimId: string) => {
    setProcessingClaim(claimId);
    try {
      await approveClaim(claimId);
      alert('Target claim approved successfully!');
    } catch (error) {
      console.error('Error approving claim:', error);
      alert('Failed to approve claim');
    } finally {
      setProcessingClaim(null);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    setProcessingClaim(claimId);
    try {
      await rejectClaim(claimId, rejectionReason[claimId] || undefined);
      alert('Target claim rejected.');
      setRejectionReason(prev => ({ ...prev, [claimId]: '' }));
    } catch (error) {
      console.error('Error rejecting claim:', error);
      alert('Failed to reject claim');
    } finally {
      setProcessingClaim(null);
    }
  };

  const getContactIcon = (preference: string) => {
    switch (preference) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Claims */}
      {pendingClaims.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Reviews ({pendingClaims.length})
          </h3>
          <div className="space-y-4">
            {pendingClaims.map((claim) => (
              <Card key={claim.id} className="border-yellow-200 dark:border-yellow-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={claim.claimant?.linkedinUrl} />
                        <AvatarFallback>
                          {claim.claimant?.firstName?.[0]}{claim.claimant?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {claim.claimant?.firstName} {claim.claimant?.lastName}
                        </CardTitle>
                        <CardDescription>
                          Claims to have reached: <strong>{claim.targetName}</strong>
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Request Details */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Target Request
                    </h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Target:</strong> {claim.request?.target}</p>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span><strong>Reward:</strong> ${claim.request?.reward}</span>
                      </div>
                      {claim.request?.message && (
                        <p><strong>Message:</strong> {claim.request.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Target Details */}
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <User className="h-4 w-4" />
                      Target Contact Details
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span><strong>Name:</strong> {claim.targetName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span><strong>Email:</strong> {claim.targetEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span><strong>Company:</strong> {claim.targetCompany}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span><strong>Role:</strong> {claim.targetRole}</span>
                      </div>
                      <div className="flex items-center gap-2 md:col-span-2">
                        {getContactIcon(claim.contactPreference)}
                        <span><strong>Contact via {claim.contactPreference}:</strong> {claim.contactInfo}</span>
                        {claim.contactPreference === 'linkedin' && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={claim.contactInfo} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  {claim.message && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Additional Message
                      </h4>
                      <p className="text-sm bg-muted/50 p-3 rounded">{claim.message}</p>
                    </div>
                  )}

                  {/* Submitted */}
                  <div className="text-xs text-muted-foreground">
                    Submitted on {formatDate(claim.createdAt)}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <div className="flex-1">
                      <Label htmlFor={`rejection-reason-${claim.id}`} className="text-xs">
                        Rejection reason (optional)
                      </Label>
                      <Textarea
                        id={`rejection-reason-${claim.id}`}
                        placeholder="Why are you rejecting this claim?"
                        value={rejectionReason[claim.id] || ''}
                        onChange={(e) => setRejectionReason(prev => ({
                          ...prev,
                          [claim.id]: e.target.value
                        }))}
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                    <div className="flex flex-col gap-2 justify-end">
                      <Button
                        onClick={() => handleApproveClaim(claim.id)}
                        disabled={processingClaim === claim.id}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        {processingClaim === claim.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectClaim(claim.id)}
                        disabled={processingClaim === claim.id}
                        variant="destructive"
                        size="sm"
                      >
                        {processingClaim === claim.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reviewed Claims */}
      {reviewedClaims.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Previously Reviewed ({reviewedClaims.length})
          </h3>
          <div className="space-y-4">
            {reviewedClaims.map((claim) => (
              <Card key={claim.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {claim.claimant?.firstName?.[0]}{claim.claimant?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {claim.claimant?.firstName} {claim.claimant?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Target: {claim.targetName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={claim.status === 'approved' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {claim.status === 'approved' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {claim.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(claim.reviewedAt || claim.updatedAt)}
                      </span>
                    </div>
                  </div>
                  {claim.rejectionReason && (
                    <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                      <strong>Reason:</strong> {claim.rejectionReason}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {claims.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Target Claims</h3>
          <p className="text-muted-foreground">
            When someone claims to have reached your targets, they will appear here for review.
          </p>
        </div>
      )}
    </div>
  );
};

export default TargetClaimsTab;