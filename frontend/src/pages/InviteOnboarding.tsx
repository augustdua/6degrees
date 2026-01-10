import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Eye, 
  EyeOff, 
  Camera, 
  Upload,
  Loader2,
  Sparkles,
  Users
} from 'lucide-react';

type Step = 'code' | 'account' | 'profile' | 'welcome';

interface InviteData {
  inviteId: string;
  email: string;
  inviter: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
  };
}

interface SignupResult {
  success: boolean;
  userId: string;
  session: any;
  user: any;
  inviter: any;
}

const InviteOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { toast } = useToast();
  
  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('code');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Code entry state
  const [code, setCode] = useState(['', '', '', '']);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Account state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [birthdayDate, setBirthdayDate] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Signup state
  const [signingUp, setSigningUp] = useState(false);
  const [signupResult, setSignupResult] = useState<SignupResult | null>(null);

  // Focus first code input on mount
  useEffect(() => {
    if (currentStep === 'code' && codeInputRefs.current[0]) {
      codeInputRefs.current[0].focus();
    }
  }, [currentStep]);

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    
    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take last digit
    setCode(newCode);
    setCodeError(null);
    
    // Auto-focus next input
    if (value && index < 3) {
      codeInputRefs.current[index + 1]?.focus();
    }
    
    // Auto-validate when complete
    if (value && index === 3 && newCode.every(d => d)) {
      validateCode(newCode.join(''));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData.length === 4) {
      const newCode = pastedData.split('');
      setCode(newCode);
      validateCode(pastedData);
    }
  };

  const validateCode = async (codeString: string) => {
    setValidating(true);
    setCodeError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-invites/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeString })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setCodeError(data.error || 'Invalid code');
        setCode(['', '', '', '']);
        codeInputRefs.current[0]?.focus();
        return;
      }
      
      setInviteData(data);
      transitionToStep('account');
    } catch (err) {
      setCodeError('Failed to validate code. Please try again.');
      setCode(['', '', '', '']);
    } finally {
      setValidating(false);
    }
  };

  const transitionToStep = (step: Step) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsAnimating(false);
    }, 300);
  };

  const validatePassword = (): boolean => {
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleAccountNext = () => {
    if (validatePassword()) {
      transitionToStep('profile');
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError('Please enter your name');
      return;
    }
    
    if (!bio.trim()) {
      setProfileError('Please add a short bio');
      return;
    }

    setSigningUp(true);
    setProfileError(null);

    try {
      // Upload profile picture if provided
      let profilePictureUrl: string | undefined;
      if (profilePicture) {
        const formData = new FormData();
        formData.append('file', profilePicture);
        
        // Upload to Supabase storage directly
        const fileName = `${Date.now()}-${profilePicture.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, profilePicture);
          
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(uploadData.path);
          profilePictureUrl = urlData.publicUrl;
        }
      }

      // Complete signup
      const response = await fetch(`${API_BASE_URL}/api/user-invites/complete-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.join(''),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          bio: bio.trim(),
          birthdayDate: birthdayDate.trim(),
          birthdayVisibility: 'connections',
          profilePictureUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileError(data.error || 'Failed to create account');
        return;
      }

      setSignupResult(data);
      
      // Set session in Supabase client
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }
      
      transitionToStep('welcome');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to create account');
    } finally {
      setSigningUp(false);
    }
  };

  const handleEnterApp = () => {
    navigate('/feed');
  };

  const getPasswordStrength = (): { label: string; color: string; width: string } => {
    if (password.length === 0) return { label: '', color: '', width: '0%' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
    if (password.length < 8) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' };
    if (password.length < 12) return { label: 'Good', color: 'bg-[#CBAA5A]', width: '75%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#CBAA5A]/5 via-transparent to-transparent" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(203,170,90,0.03) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Content */}
      <div className={`relative z-10 w-full max-w-md transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-riccione text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-[#CBAA5A] via-[#E8D5A3] to-[#CBAA5A] bg-clip-text text-transparent">
              6degree.app
            </span>
          </h1>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#CBAA5A] to-transparent mx-auto mt-3" />
        </div>

        {/* Step: Code Entry */}
        {currentStep === 'code' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="font-gilroy text-white text-xl font-bold mb-2">Enter Your Invite Code</h2>
              <p className="font-gilroy text-[#666] text-sm">
                Enter the 4-digit code you received
              </p>
            </div>

            {/* Code Inputs */}
            <div className="flex justify-center gap-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (codeInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  onPaste={index === 0 ? handleCodePaste : undefined}
                  disabled={validating}
                  className={`w-16 h-20 text-center text-3xl font-bold font-gilroy rounded-2xl border-2 bg-[#0a0a0a] transition-all focus:outline-none ${
                    codeError
                      ? 'border-red-500 text-red-500'
                      : digit
                      ? 'border-[#CBAA5A] text-[#CBAA5A]'
                      : 'border-[#333] text-white focus:border-[#CBAA5A]'
                  }`}
                />
              ))}
            </div>

            {codeError && (
              <p className="text-center font-gilroy text-red-400 text-sm">{codeError}</p>
            )}

            {validating && (
              <div className="flex items-center justify-center gap-2 text-[#CBAA5A]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-gilroy text-sm">Validating...</span>
              </div>
            )}

            <p className="text-center font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#555]">
              Don't have a code? Ask a member to invite you
            </p>
          </div>
        )}

        {/* Step: Account Creation */}
        {currentStep === 'account' && inviteData && (
          <div className="space-y-6">
            {/* Invited By Card */}
            <div className="bg-gradient-to-br from-[#CBAA5A]/10 to-transparent rounded-2xl border border-[#CBAA5A]/20 p-4 text-center">
              <p className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#888] mb-2">INVITED BY</p>
              <div className="flex items-center justify-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-[#CBAA5A]">
                  <AvatarImage src={inviteData.inviter.profilePictureUrl} />
                  <AvatarFallback className="bg-[#CBAA5A] text-black font-bold">
                    {inviteData.inviter.firstName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="font-gilroy font-bold text-white">
                  {inviteData.inviter.firstName} {inviteData.inviter.lastName}
                </span>
              </div>
            </div>

            <div className="text-center">
              <h2 className="font-gilroy text-white text-xl font-bold mb-2">Create Your Account</h2>
              <p className="font-gilroy text-[#666] text-sm">{inviteData.email}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#888]">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    className="bg-[#0a0a0a] border-[#333] text-white font-gilroy pr-10"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="h-1 bg-[#222] rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all`} style={{ width: strength.width }} />
                    </div>
                    <p className="font-gilroy text-[10px] text-[#666]">{strength.label}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#888]">Confirm Password</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  className="bg-[#0a0a0a] border-[#333] text-white font-gilroy"
                  placeholder="Confirm password"
                />
              </div>

              {passwordError && (
                <p className="font-gilroy text-red-400 text-sm">{passwordError}</p>
              )}
            </div>

            <Button
              onClick={handleAccountNext}
              disabled={!password || !confirmPassword}
              className="w-full py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black hover:from-[#E5D9B6] hover:to-[#CBAA5A]"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step: Profile */}
        {currentStep === 'profile' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-gilroy text-white text-xl font-bold mb-2">Complete Your Profile</h2>
              <p className="font-gilroy text-[#666] text-sm">Tell us about yourself</p>
            </div>

            {/* Profile Picture */}
            <div className="flex justify-center">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#333] group-hover:border-[#CBAA5A] transition-all flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
                  {profilePicturePreview ? (
                    <img src={profilePicturePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-[#444] group-hover:text-[#CBAA5A] transition-all" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#CBAA5A] flex items-center justify-center">
                  <Upload className="w-4 h-4 text-black" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-center font-gilroy text-[10px] text-[#666] tracking-[0.1em] uppercase">
              {profilePicture ? 'Tap to change' : 'Optional • Add later'}
            </p>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#888]">First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-[#0a0a0a] border-[#333] text-white font-gilroy"
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#888]">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-[#0a0a0a] border-[#333] text-white font-gilroy"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#888]">Headline / Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-[#0a0a0a] border-[#333] text-white font-gilroy min-h-[100px] resize-none"
                placeholder="e.g., Founder at Acme Inc. | Angel Investor | Ex-Google"
                maxLength={200}
              />
              <p className="font-gilroy text-[10px] text-[#555] text-right">{bio.length}/200</p>
            </div>

            {/* Birthday (optional) */}
            <div className="space-y-2">
              <Label className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#888]">
                Birthday (optional)
              </Label>
              <Input
                value={birthdayDate}
                onChange={(e) => setBirthdayDate(e.target.value)}
                type="date"
                className="bg-[#0a0a0a] border-[#333] text-white font-gilroy"
              />
              <p className="font-gilroy text-[10px] text-[#555]">
                Used for “Moments” reminders for your connections.
              </p>
            </div>

            {profileError && (
              <p className="font-gilroy text-red-400 text-sm text-center">{profileError}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => transitionToStep('account')}
                className="flex-1 py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase border-[#333] text-white hover:border-[#CBAA5A]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCompleteSignup}
                disabled={signingUp || !firstName.trim() || !lastName.trim() || !bio.trim()}
                className="flex-1 py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black hover:from-[#E5D9B6] hover:to-[#CBAA5A]"
              >
                {signingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Account
                    <Check className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Welcome */}
        {currentStep === 'welcome' && signupResult && (
          <div className="space-y-8 text-center">
            {/* Success Animation */}
            <div className="relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#CBAA5A] to-[#E8D5A3] flex items-center justify-center animate-pulse">
                <Sparkles className="w-12 h-12 text-black" />
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-[#CBAA5A]/20 animate-ping" />
            </div>

            <div>
              <h2 className="font-riccione text-3xl text-white mb-2">Welcome to Zaurq!</h2>
              <p className="font-gilroy text-[#888]">
                You're now connected with {signupResult.inviter?.firstName}
              </p>
            </div>

            {/* Connection Card */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-[#222] p-6">
              <div className="flex items-center justify-center gap-4">
                <Avatar className="w-14 h-14 border-2 border-[#CBAA5A]">
                  <AvatarImage src={signupResult.inviter?.profilePictureUrl} />
                  <AvatarFallback className="bg-[#CBAA5A] text-black font-bold">
                    {signupResult.inviter?.firstName?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center">
                  <Users className="w-6 h-6 text-[#CBAA5A] mb-1" />
                  <span className="font-gilroy text-[9px] tracking-[0.15em] uppercase text-[#666]">CONNECTED</span>
                </div>
                <Avatar className="w-14 h-14 border-2 border-[#CBAA5A]">
                  <AvatarImage src={signupResult.user?.profilePictureUrl} />
                  <AvatarFallback className="bg-[#CBAA5A] text-black font-bold">
                    {signupResult.user?.firstName?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="font-gilroy text-[#666] text-sm mt-4">
                {signupResult.inviter?.firstName} is now your first connection
              </p>
            </div>

            <Button
              onClick={handleEnterApp}
              className="w-full py-4 rounded-full font-gilroy font-bold text-[13px] tracking-[0.15em] uppercase bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black hover:from-[#E5D9B6] hover:to-[#CBAA5A]"
            >
              Enter Zaurq
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <p className="font-gilroy text-[10px] tracking-[0.15em] uppercase text-[#555]">
              It's not who you are. It's who you know.
            </p>
          </div>
        )}

        {/* Progress Indicators */}
        {currentStep !== 'welcome' && (
          <div className="flex justify-center gap-2 mt-8">
            {['code', 'account', 'profile'].map((step, index) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-all ${
                  step === currentStep
                    ? 'w-6 bg-[#CBAA5A]'
                    : ['code', 'account', 'profile'].indexOf(currentStep) > index
                    ? 'bg-[#CBAA5A]'
                    : 'bg-[#333]'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteOnboarding;

