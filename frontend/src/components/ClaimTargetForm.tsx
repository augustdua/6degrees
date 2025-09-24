import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTargetClaims } from '@/hooks/useTargetClaims';
import {
  Target,
  User,
  Mail,
  Building2,
  Briefcase,
  MessageSquare,
  Phone,
  Linkedin,
  CheckCircle
} from 'lucide-react';

interface ClaimTargetFormProps {
  requestId: string;
  chainId: string;
  targetDescription: string;
  onClaimSubmitted: () => void;
}

const ClaimTargetForm = ({ requestId, chainId, targetDescription, onClaimSubmitted }: ClaimTargetFormProps) => {
  const { submitTargetClaim } = useTargetClaims();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    targetName: '',
    targetEmail: '',
    targetCompany: '',
    targetRole: '',
    message: '',
    contactPreference: 'email' as 'email' | 'linkedin' | 'phone',
    contactInfo: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return formData.targetName.trim() &&
           formData.targetEmail.trim() &&
           formData.targetCompany.trim() &&
           formData.targetRole.trim() &&
           formData.contactInfo.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      await submitTargetClaim(requestId, chainId, formData);
      alert('Target claim submitted successfully! The creator will review your claim.');
      onClaimSubmitted();
    } catch (error) {
      console.error('Error submitting claim:', error);
      alert('Failed to submit target claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContactIcon = () => {
    switch (formData.contactPreference) {
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

  const getContactPlaceholder = () => {
    switch (formData.contactPreference) {
      case 'email':
        return 'target@company.com';
      case 'linkedin':
        return 'https://linkedin.com/in/target-profile';
      case 'phone':
        return '+1 (555) 123-4567';
      default:
        return '';
    }
  };

  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <Target className="h-5 w-5" />
          Claim Target Reached
        </CardTitle>
        <CardDescription>
          Have you successfully connected with this target? Submit your claim for review.
        </CardDescription>
        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Target: {targetDescription}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Details */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Target Contact Information
            </h4>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetName">Full Name *</Label>
                <Input
                  id="targetName"
                  placeholder="John Doe"
                  value={formData.targetName}
                  onChange={(e) => handleInputChange('targetName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetEmail">Email Address *</Label>
                <Input
                  id="targetEmail"
                  type="email"
                  placeholder="john.doe@company.com"
                  value={formData.targetEmail}
                  onChange={(e) => handleInputChange('targetEmail', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetCompany">Company *</Label>
                <Input
                  id="targetCompany"
                  placeholder="Company Name"
                  value={formData.targetCompany}
                  onChange={(e) => handleInputChange('targetCompany', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetRole">Role/Position *</Label>
                <Input
                  id="targetRole"
                  placeholder="Chief Technology Officer"
                  value={formData.targetRole}
                  onChange={(e) => handleInputChange('targetRole', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Method */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              How did you contact them?
            </h4>

            <div className="space-y-2">
              <Label htmlFor="contactPreference">Contact Method *</Label>
              <Select
                value={formData.contactPreference}
                onValueChange={(value) => handleInputChange('contactPreference', value as 'email' | 'linkedin' | 'phone')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="linkedin">
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </div>
                  </SelectItem>
                  <SelectItem value="phone">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactInfo" className="flex items-center gap-2">
                {getContactIcon()}
                Contact Information *
              </Label>
              <Input
                id="contactInfo"
                placeholder={getContactPlaceholder()}
                value={formData.contactInfo}
                onChange={(e) => handleInputChange('contactInfo', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Additional Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Additional Details (Optional)</Label>
            <Textarea
              id="message"
              placeholder="How did you reach them? What was their response? Any additional context..."
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting Claim...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Target Claim
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your claim will be reviewed by the request creator. Make sure all information is accurate.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default ClaimTargetForm;