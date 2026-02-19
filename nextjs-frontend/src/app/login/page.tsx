'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordValidationTooltip } from '@/components/ui/password-validation-tooltip';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Image from 'next/image';

// Dynamic imports for heavy components (only needed for signup tab)
const PhoneInputWithFlag = dynamic(
  () => import('@/components/customers/phone-input-with-flag').then(mod => mod.PhoneInputWithFlag),
  {
    loading: () => <Input placeholder="Loading..." disabled className="bg-gray-50" />,
    ssr: false
  }
);

const CitySelector = dynamic(
  () => import('@/components/customers/city-selector').then(mod => mod.CitySelector),
  {
    loading: () => <Input placeholder="Loading..." disabled className="bg-gray-50" />,
    ssr: false
  }
);

export default function LoginPage() {
  // Track if component is mounted (hydrated) to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; firstName?: string; lastName?: string; mobile?: string; licenseNumber?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portalMismatch, setPortalMismatch] = useState<null | 'ADMIN_ON_CUSTOMER'>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Email OTP state
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const {
    login,
    register,
    isAuthenticated,
    isLoading,
    hasRole,
    showEmailVerificationModal,
    setShowEmailVerificationModal,
    logout,
    user,
    requestEmailOtp,
    loginWithEmailOtp
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle URL parameter to set initial tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'signup') {
      setTab('signup');
    }
  }, [searchParams]);

  // OTP flow effects
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  useEffect(() => {
    setOtpMode(false);
    setOtpSent(false);
    setOtpCode("");
    setResendCountdown(0);
    setErrors({});
  }, [tab]);

  // Handle switching to OTP mode
  const handleSwitchToOtpMode = () => {
    setErrors({});
    setOtpMode(true);
  };

  // Handle requesting OTP
  async function handleRequestOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await requestEmailOtp(email);
      if (result.success) {
        toast.success("Verification code sent to your email.");
        setOtpSent(true);
        setResendCountdown(120); // 2 minutes countdown
      } else {
        const error = result.error || "Failed to send code";
        if (error.toLowerCase().includes("does not exist") || error.toLowerCase().includes("not found")) {
          setErrors(prev => ({ ...prev, email: error }));
        } else {
          toast.error(error);
        }
      }
    } catch (err) {
      toast.error("Failed to send verification code");
    }

    setIsSubmitting(false);
  }

  // Handle verifying OTP
  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const ok = await loginWithEmailOtp(email, otpCode, {
        portal: 'CUSTOMER',
        onError: (err) => {
          toast.error(err);
        },
      });

      if (ok) {
        // Successful login - AuthContext will handle state, then LoginPage redirect effect will kick in
      }
    } catch (err) {
      toast.error("An unexpected error occurred during verification");
    }

    setIsSubmitting(false);
  }

  // Handle resending OTP
  async function handleResendOtp() {
    if (resendCountdown > 0) return;

    setErrors({});
    setIsSubmitting(true);
    setOtpCode("");

    try {
      const result = await requestEmailOtp(email);
      if (result.success) {
        setResendCountdown(120);
        toast.success("A new verification code has been sent");
      } else {
        toast.error(result.error || "Failed to resend code");
      }
    } catch (err) {
      toast.error("Failed to resend verification code");
    }

    setIsSubmitting(false);
  }

  // Handle going back to password login
  const handleBackToPassword = () => {
    setOtpMode(false);
    setOtpSent(false);
    setOtpCode("");
    setResendCountdown(0);
    setErrors({});
  };

  // Render OTP verification screen
  const renderOtpVerification = () => (
    <div className="space-y-6 py-2">
      <button
        type="button"
        onClick={handleBackToPassword}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to password login
      </button>

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Check your email</h3>
        <p className="text-sm text-gray-600 mt-2">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleVerifyOtp} className="space-y-6">
        <div className="flex justify-center py-4">
          <div className="flex gap-2">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={(value) => setOtpCode(value)}
              autoFocus
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot className="h-12 w-12 text-lg border-2" index={0} />
                <InputOTPSlot className="h-12 w-12 text-lg border-2" index={1} />
                <InputOTPSlot className="h-12 w-12 text-lg border-2" index={2} />
                <InputOTPSlot className="h-12 w-12 text-lg border-2" index={3} />
                <InputOTPSlot className="h-12 w-12 text-lg border-2" index={4} />
                <InputOTPSlot className="h-12 w-12 text-lg border-2" index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCountdown > 0 || isSubmitting}
            className="text-sm font-semibold text-blue-600 hover:text-blue-500 disabled:text-gray-400 disabled:no-underline"
          >
            {resendCountdown > 0
              ? `Resend code in ${Math.floor(resendCountdown / 60)}:${(resendCountdown % 60).toString().padStart(2, '0')}`
              : 'Resend code'}
          </button>
        </div>

        <Button type="submit" className="w-full h-11" disabled={isSubmitting || otpCode.length !== 6}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Sign In'
          )}
        </Button>
      </form>
    </div>
  );

  // Render OTP request screen
  const renderOtpRequest = () => (
    <div className="space-y-6 py-2">
      <button
        type="button"
        onClick={handleBackToPassword}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to password login
      </button>

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Login with email code</h3>
        <p className="text-sm text-gray-600 mt-2">
          We'll send a one-time verification code to your email for passwordless access.
        </p>
      </div>

      <form onSubmit={handleRequestOtp} className="space-y-6">
        <div>
          <Label className="mb-1 block" htmlFor="otp-email">Email address <span className="text-red-500">*</span></Label>
          <Input
            id="otp-email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (<p className="mt-1 text-sm text-red-600">{errors.email}</p>)}
        </div>

        <Button type="submit" className="w-full h-11" disabled={isSubmitting || !email}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending code...
            </>
          ) : (
            'Send verification code'
          )}
        </Button>
      </form>
    </div>
  );

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; firstName?: string; lastName?: string; mobile?: string; licenseNumber?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    } else if (/\s/.test(password)) {
      newErrors.password = 'Password cannot contain spaces';
    }

    // For signup: relaxed rules (min 4, no spaces)
    if (tab === 'signup') {
      if (password && password.length < 4) {
        newErrors.password = 'Password must be at least 4 characters';
      } else if (password && /\s/.test(password)) {
        newErrors.password = 'Password cannot contain spaces';
      }

      if (licenseNumber && !licenseNumber.trim()) {
        newErrors.licenseNumber = 'NPI / License number is required';
      } else if (!licenseNumber) {
        newErrors.licenseNumber = 'NPI / License number is required';
      }

      if (!firstName) newErrors.firstName = 'First name is required';
      if (!lastName) newErrors.lastName = 'Last name is required';

      // mobile is mandatory
      if (!mobile || !mobile.trim()) {
        newErrors.mobile = 'Mobile number is required';
      } else {
        const digitsOnly = mobile.replace(/\D/g, '');
        const localTen = digitsOnly.slice(-10);
        if (localTen.length !== 10) {
          newErrors.mobile = 'Mobile number must be exactly 10 digits';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if form is valid for signup button state
  const isSignupFormValid = () => {
    if (tab !== 'signup') return true;

    const hasValidEmail = email && /\S+@\S+\.\S+/.test(email);
    const hasValidPassword = password && password.length >= 4 && !/\s/.test(password);
    const hasValidFirstName = firstName.trim();
    const hasValidLastName = lastName.trim();
    const hasValidLicense = licenseNumber && licenseNumber.trim();
    const hasValidMobile = mobile && mobile.trim() && mobile.replace(/\D/g, '').slice(-10).length === 10;
    return hasValidEmail && hasValidPassword && hasValidFirstName && hasValidLastName && hasValidLicense && hasValidMobile;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (portalMismatch) setPortalMismatch(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (tab === 'signup') {
        // Attempt login first for existing customers
        const loggedIn = await login(email, password, {
          suppressToasts: true, portal: 'CUSTOMER', onError: (err) => {
            if ((err || '').toLowerCase().includes("admins can’t login") || (err || '').toLowerCase().includes("admins can't login")) {
              setPortalMismatch('ADMIN_ON_CUSTOMER');
            }
          }
        });
        if (loggedIn && user) {
          setPortalMismatch(null);
          if (user.role === 'CUSTOMER') {
            router.push('/landing');
          } else {
            router.push('/admin-dashboard');
          }
          return;
        }

        // If login failed, try registering a new CUSTOMER
        // Enforce required fields for signup
        if (!firstName || !lastName || !licenseNumber) {
          validateForm();
          setIsSubmitting(false);
          return;
        }
        const registered = await register({
          email,
          password,
          firstName,
          lastName,
          role: 'CUSTOMER',
          mobile,
          companyName: companyName.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined, // licenseNumber is mandatory
          city: city.trim() || undefined,
          zip: zip.trim() || undefined,
        });
        if (registered) {
          // Show modal and inform about email verification
          setShowApprovalModal(true);
          try { (await import('sonner')).toast?.info?.('We sent a verification email. Please verify your email.'); } catch { }
          return;
        }
      } else {
        let loginErrorMessage: string | null = null;
        const success = await login(email, password, {
          suppressToasts: true, portal: 'CUSTOMER', onError: (err) => {
            loginErrorMessage = err;
            if ((err || '').toLowerCase().includes("admins can't login") || (err || '').toLowerCase().includes("admins can't login")) {
              setPortalMismatch('ADMIN_ON_CUSTOMER');
            }
          }
        });
        if (success && user) {
          setPortalMismatch(null);
          if (user.role === 'CUSTOMER') {
            router.push('/landing');
          } else {
            router.push('/admin-dashboard');
          }
        } else {
          // If onError was called (loginErrorMessage set), it means AuthContext didn't handle it 
          // as a "modal status" error (pending/inactive/verify).
          // So it's likely a credential error -> Show password error.
          // If onError was NOT called, it means AuthContext popped a modal -> Don't show password error.
          if (loginErrorMessage) {
            const msg = (loginErrorMessage as string).toLowerCase();
            if (msg.includes('user not found')) {
              setErrors(prev => ({ ...prev, email: 'Email address not found' }));
            } else if (msg.includes('invalid password')) {
              setErrors(prev => ({ ...prev, password: 'Password is incorrect' }));
            } else if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('connection refused')) {
              toast.error("Network error: Unable to connect to site. Please check your internet connection.");
            } else {
              setErrors(prev => ({ ...prev, password: 'Email or password is incorrect' }));
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      console.log('Error response:', error?.response?.data);
      console.log('Current tab:', tab);

      // Handle specific error messages for signup
      if (tab === 'signup' && error?.response?.data?.error) {
        const errorMessage = error.response.data.error;
        if (errorMessage.includes('email') && errorMessage.includes('already')) {
          setErrors(prev => ({ ...prev, email: 'Email already taken' }));
        } else if (errorMessage.includes('mobile') && errorMessage.includes('already')) {
          setErrors(prev => ({ ...prev, mobile: 'Mobile number already taken' }));
        } else {
          toast.error(errorMessage);
        }
      } else if (tab === 'signin') {
        // Handle signin errors - check multiple possible error structures
        const errorMessage = (error?.response?.data?.error || error?.response?.data?.message || error?.message || '').toLowerCase();

        console.log('Signin error message:', errorMessage);
        console.log('Email being used:', email);

        // Check for account status issues FIRST - don't show password error for these
        if (errorMessage.includes('pending') ||
          errorMessage.includes('approval') ||
          errorMessage.includes('inactive') ||
          errorMessage.includes('verify') ||
          errorMessage.includes('verification')) {
          // Account status issue - don't show password error, just show the status message
          toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Account status issue');
          return; // Don't set any field errors
        }

        // First check for specific email-related errors
        if (errorMessage.includes('user not found') ||
          errorMessage.includes('account not found') ||
          errorMessage.includes('email not found') ||
          errorMessage.includes('no user found') ||
          errorMessage.includes('user does not exist') ||
          errorMessage.includes('email does not exist')) {
          setErrors(prev => ({ ...prev, email: 'Email is not valid' }));
        }
        // Then check for specific password-related errors
        else if (errorMessage.includes('wrong password') ||
          errorMessage.includes('incorrect password') ||
          errorMessage.includes('password incorrect') ||
          errorMessage.includes('invalid password') ||
          errorMessage.includes('password mismatch')) {
          setErrors(prev => ({ ...prev, password: 'Password is invalid' }));
        }
        // For generic "invalid credentials" - we need to be smarter about this
        else if (errorMessage.includes('invalid credentials') ||
          errorMessage.includes('authentication failed') ||
          errorMessage.includes('login failed') ||
          errorMessage.includes('unauthorized')) {
          // Check if email format is valid - if not, show email error
          if (!/\S+@\S+\.\S+/.test(email)) {
            setErrors(prev => ({ ...prev, email: 'Email is not valid' }));
          } else {
            // For valid email format, show a more helpful message that covers both possibilities
            setErrors(prev => ({ ...prev, password: 'Email or password is incorrect' }));
          }
        }
        // Handle any other specific error messages
        else if (errorMessage.includes('email')) {
          setErrors(prev => ({ ...prev, email: 'Email is not valid' }));
        } else if (errorMessage.includes('password')) {
          setErrors(prev => ({ ...prev, password: 'Password is invalid' }));
        } else if (errorMessage) {
          // For any other error message, show as toast instead of field error
          toast.error(error?.response?.data?.error || error?.response?.data?.message || errorMessage);
        } else {
          // If no specific error message, show generic error as toast
          toast.error('Login failed. Please try again.');
        }
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already authenticated (after mount to avoid hydration issues)
  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated && user) {
      if (user.role === 'CUSTOMER') {
        router.push('/landing');
      } else {
        router.push('/admin-dashboard');
      }
    }
  }, [mounted, isAuthenticated, isLoading, router, user]);

  // Show nothing only if we're definitely authenticated and redirecting
  if (mounted && !isLoading && isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Always render the form - this allows SSR to work and improves LCP
  // Form submission is disabled while loading
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-center">Email Verification Required</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-sm text-gray-600">
                A verification email has been sent to your registered email address. Please verify your email to continue.
              </p>
              <Button className="w-full" onClick={() => setShowApprovalModal(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Email Verification Modal */}
        <Dialog open={showEmailVerificationModal} onOpenChange={setShowEmailVerificationModal}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-center">Verify Your Email</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-sm text-gray-600">
                A verification email has been sent to your registered email address. Please check your inbox and verify to continue.
              </p>
              <Button className="w-full" onClick={() => setShowEmailVerificationModal(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
        <div className="text-center">
          <div className="flex items-center justify-center mt-6">
            <Image src="/Centre-Labs-logo-sm.png" alt="Logo" width={160} height={160} priority />
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-center">Sign in or create an account</CardTitle>
            {/* <CardDescription>Staff access the dashboard; customers access their store account</CardDescription> */}
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => {
              setTab(v as any);
              setErrors({}); // Clear errors when switching tabs
              if (portalMismatch) setPortalMismatch(null);
            }}>
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                {otpMode ? (
                  otpSent ? renderOtpVerification() : renderOtpRequest()
                ) : (
                  <>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <Label className="mb-1 block" htmlFor="email">Email address <span className="text-red-500">*</span></Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                            if (portalMismatch) setPortalMismatch(null);
                          }}
                          className={errors.email ? 'border-red-500' : ''}
                          placeholder="admin@example.com"
                        />
                        {errors.email && (<p className="mt-1 text-sm text-red-600">{errors.email}</p>)}
                      </div>
                      <div>
                        <Label className="mb-1 block" htmlFor="password">Password <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                              if (portalMismatch) setPortalMismatch(null);
                            }}
                            className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                            placeholder="Enter your password"
                          />
                          <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? (<EyeOff className="h-4 w-4 text-gray-400" />) : (<Eye className="h-4 w-4 text-gray-400" />)}
                          </button>
                        </div>
                        {errors.password && !portalMismatch && (
                          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                        )}
                        {portalMismatch === 'ADMIN_ON_CUSTOMER' && (
                          <p className="mt-1 text-sm text-red-600">
                            Oops! Admins can’t login to customer panel, please <a href="/admin/login" className="underline text-blue-600">click here</a> to login via Admin login.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <a
                            href="#"
                            className="font-medium text-blue-600 hover:text-blue-500"
                            onClick={(e) => {
                              e.preventDefault();
                              setForgotEmail((email || '').trim().toLowerCase());
                              setForgotOpen(true);
                            }}
                          >Forgot your password?</a>
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-11" disabled={isSubmitting || (mounted && isLoading)}>
                        {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>) : ('Sign in')}
                      </Button>
                    </form>

                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={handleSwitchToOtpMode}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                      >
                        Login using email one-time verification code
                      </button>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label className="mb-1 block" htmlFor="email">Email address <span className="text-red-500">*</span></Label>
                    <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? 'border-red-500' : ''} placeholder="admin@example.com" />
                    {errors.email && (<p className="mt-1 text-sm text-red-600">{errors.email}</p>)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1 block" htmlFor="firstName">First name <span className="text-red-500">*</span></Label>
                      <Input required id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className={errors.firstName ? 'border-red-500' : ''} />
                      {errors.firstName && (<p className="mt-1 text-sm text-red-600">{errors.firstName}</p>)}
                    </div>
                    <div>
                      <Label className="mb-1 block" htmlFor="lastName">Last name <span className="text-red-500">*</span></Label>
                      <Input required id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className={errors.lastName ? 'border-red-500' : ''} />
                      {errors.lastName && (<p className="mt-1 text-sm text-red-600">{errors.lastName}</p>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1 block" htmlFor="companyName">Company</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g., RefinedMD"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <Label htmlFor="licenseNumber" className="text-sm font-semibold text-gray-700">NPI / License Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="licenseNumber"
                        placeholder="e.g., 1234567890"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className={`bg-gray-50 border-gray-200 focus:bg-white transition-all ${errors.licenseNumber ? 'border-red-500' : ''}`}
                      />
                      {errors.licenseNumber && (<p className="text-xs text-red-600 font-medium">{errors.licenseNumber}</p>)}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-sm font-semibold text-gray-700">Mobile Number <span className="text-red-500">*</span></Label>
                    <div className="relative group">
                      <PhoneInputWithFlag
                        id="mobile"
                        placeholder="e.g., +1 555 000 1111"
                        value={mobile}
                        onChange={(v) => setMobile(v)}
                        className={`transition-all ${errors.mobile ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.mobile && (<p className="text-xs text-red-600 font-medium">{errors.mobile}</p>)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1 block" htmlFor="city">City</Label>
                      <CitySelector
                        id="city"
                        value={city}
                        onChange={setCity}
                        placeholder="Select city"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block" htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        placeholder="Enter ZIP code"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1 block" htmlFor="password">Password <span className="text-red-500">*</span></Label>
                    <p className="text-xs text-gray-500 mb-2">Minimum 4 characters, no spaces</p>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setShowPasswordValidation(e.target.value.length > 0);
                        }}
                        onFocus={() => setShowPasswordValidation(password.length > 0)}
                        onBlur={() => setShowPasswordValidation(false)}
                        className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                        placeholder="Enter your password"
                      />
                      <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (<EyeOff className="h-4 w-4 text-gray-400" />) : (<Eye className="h-4 w-4 text-gray-400" />)}
                      </button>
                      {/* Hide complexity tooltip since rules are relaxed */}
                    </div>
                    {errors.password && (<p className="mt-1 text-sm text-red-600">{errors.password}</p>)}
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isSubmitting || (mounted && isLoading)}>
                    {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>) : ('Sign up')}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('signin');
                      handleSwitchToOtpMode();
                    }}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Already have an account? Login with email code
                  </button>
                </div>

                {/* Customer Approval Information */}
                <div className="mt-4">
                  <Alert>
                    <AlertDescription className="text-sm">
                      <strong>Customer Account Approval:</strong><br />
                      After signing up, your account will be reviewed by our team.
                      You will receive an email notification once your account is approved.
                      Please wait for approval before attempting to log in.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>

            {/* Forgot Password Dialog */}
            <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
              <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Label htmlFor="forgotEmail">Email address</Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
                  <Button
                    disabled={forgotLoading}
                    onClick={async () => {
                      const entered = (forgotEmail || "").trim().toLowerCase();
                      if (!entered || !/\S+@\S+\.\S+/.test(entered)) {
                        toast.error("Please enter a valid email");
                        return;
                      }
                      try {
                        setForgotLoading(true);
                        const resp = await api.requestPasswordReset(entered);
                        if (resp.success) {
                          toast.success("Password reset email sent successfully");
                          setForgotOpen(false);
                        } else {
                          toast.error(resp.error || "Failed to request password reset");
                        }
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to request password reset");
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                  >
                    {forgotLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>) : 'Send Reset Link'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {/* <div className="mt-6">
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Demo Credentials:</strong><br />
                  Admin: admin@example.com / SecurePass123!<br />
                  Manager: manager@example.com / SecurePass123!<br />
                  Staff: staff@example.com / SecurePass123!
                </AlertDescription>
              </Alert>
            </div> */}
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Centre Labs. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
