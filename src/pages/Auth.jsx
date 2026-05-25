import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Phone, LogIn, Loader2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, continueWithGoogle, requestPhoneOtp, continueWithEmail, continueWithABHA } = useAuth();
  
  const [authMethod, setAuthMethod] = useState(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const returnTo = searchParams.get('returnTo') || '/onboarding';
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const returnTo = searchParams.get('returnTo') || '/onboarding';
      await continueWithGoogle(returnTo);
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await continueWithEmail(email);
      setAuthMethod('email-otp');
    } catch (err) {
      setError(err.message || 'Failed to send sign-in link');
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await requestPhoneOtp(phone);
      setAuthMethod('phone-otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
      setLoading(false);
    }
  };

  const handleABHASignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await continueWithABHA();
    } catch (err) {
      setError(err.message || 'Failed to start ABHA sign-in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--hf-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg"
              style={{ background: '#d7f576', color: '#0a1200' }}>
              <Heart size={24} />
            </div>
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--hf-text)' }}>
            HealthFlux
          </h1>
          <p style={{ color: 'var(--hf-text-muted)' }}>
            Your personal AI health operating system
          </p>
        </div>

        {/* Auth methods */}
        <div className="space-y-3 mb-6">
          {/* Google Sign-In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-6 rounded-xl text-base font-semibold transition-all"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid rgba(15,23,42,0.1)'
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </Button>

          {/* ABHA Sign-In */}
          <Button
            onClick={handleABHASignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-6 rounded-xl text-base font-semibold transition-all"
            style={{
              background: '#f7c9a3',
              color: '#3d1a00'
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
            Continue with ABHA
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1" style={{ height: '1px', background: 'rgba(15,23,42,0.1)' }}></div>
            <span style={{ color: 'var(--hf-text-muted)', fontSize: '0.875rem' }}>Or continue with</span>
            <div className="flex-1" style={{ height: '1px', background: 'rgba(15,23,42,0.1)' }}></div>
          </div>

          {/* Email Sign-In */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--hf-text-muted)' }} />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="pl-10 py-6 rounded-xl"
                style={{
                  background: 'var(--hf-input-bg)',
                  borderColor: 'rgba(15,23,42,0.1)',
                  color: 'var(--hf-text)'
                }}
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full py-6 rounded-xl text-base font-semibold transition-all"
              style={{ background: '#9bb4ff', color: '#0a1240' }}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign in with Email'}
            </Button>
          </form>

          {/* Phone Sign-In */}
          <form onSubmit={handlePhoneSignIn} className="space-y-3">
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--hf-text-muted)' }} />
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className="pl-10 py-6 rounded-xl"
                style={{
                  background: 'var(--hf-input-bg)',
                  borderColor: 'rgba(15,23,42,0.1)',
                  color: 'var(--hf-text)'
                }}
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !phone}
              className="w-full py-6 rounded-xl text-base font-semibold transition-all"
              style={{ background: '#c9bbff', color: '#1a0a40' }}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign in with Phone'}
            </Button>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(242,140,140,0.15)', color: '#f28c8c' }}>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Sign-in method feedback */}
        {authMethod && (
          <div className="p-4 rounded-xl" style={{ background: 'rgba(215,245,118,0.15)', color: '#0a1200' }}>
            <p className="text-sm font-medium">
              {authMethod === 'email-otp' && '✓ Check your email for a sign-in link'}
              {authMethod === 'phone-otp' && '✓ Check your phone for an OTP code'}
            </p>
          </div>
        )}

        {/* Terms */}
        <p className="text-xs text-center mt-8" style={{ color: 'var(--hf-text-muted)' }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
