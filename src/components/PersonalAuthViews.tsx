import React, { useState } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  Check,
  Database,
} from 'lucide-react';
import { DEMO_USERS, trustVaultStore } from '../services/trustvault-store';
import { SUPABASE_PROJECT_ID } from '../lib/supabase';
import { EmailVerificationCard } from './EmailVerificationCard';

interface PersonalAuthProps {
  view: 'login' | 'register' | 'forgot-password' | 'verify-email';
  navigate: (route: string) => void;
  initialEmail?: string;
}

export const PersonalAuthViews: React.FC<PersonalAuthProps> = ({ view, navigate, initialEmail }) => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot-password' | 'verify-email'>(view);
  const [verifyEmail, setVerifyEmail] = useState(initialEmail || '');
  const [simulatedCode, setSimulatedCode] = useState<string | undefined>(undefined);

  // Sync prop changes
  React.useEffect(() => {
    setCurrentView(view);
    if (initialEmail) setVerifyEmail(initialEmail);
  }, [view, initialEmail]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState(DEMO_USERS.personalUser.email);
  const [loginPassword, setLoginPassword] = useState('PersonalVault2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAgreedTerms, setRegAgreedTerms] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regSuccess, setRegSuccess] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await trustVaultStore.loginAsync(loginEmail, loginPassword, 'personal');
      setIsSubmitting(false);
      navigate('/personal/dashboard');
    } catch (err: any) {
      setIsSubmitting(false);
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        const norm = loginEmail.trim().toLowerCase();
        setVerifyEmail(norm);
        const pending = trustVaultStore.getPendingVerification(norm);
        if (pending) setSimulatedCode(pending.code);
        setCurrentView('verify-email');
        return;
      }
      setLoginError(err.message || 'Invalid credentials. Please verify your email and password.');
    }
  };

  // Handle Registration Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!regFullName.trim() || regFullName.trim().length < 2) {
      errors.fullName = 'Full name is required (minimum 2 characters).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail.trim() || !emailRegex.test(regEmail.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (regPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(regPassword)) {
      errors.password = 'Password must contain at least one uppercase letter.';
    } else if (!/[0-9]/.test(regPassword)) {
      errors.password = 'Password must contain at least one numeric digit.';
    }

    if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!regAgreedTerms) {
      errors.terms = 'You must agree to the Terms of Service and Privacy Policy.';
    }

    setRegErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await trustVaultStore.registerPersonalAsync(regFullName, regEmail, regPassword);
      setIsSubmitting(false);
      setVerifyEmail(regEmail.trim().toLowerCase());
      setSimulatedCode(res.verificationCode);
      setCurrentView('verify-email');
    } catch (err: any) {
      setIsSubmitting(false);
      setRegErrors({ general: err.message || 'Registration failed.' });
    }
  };

  // Handle Forgot Password Submission
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setForgotSubmitted(true);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back Link */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 mb-6 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        {/* Brand Icon & Heading */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0f392b] text-white flex items-center justify-center shadow-lg">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          {currentView === 'login' && 'Personal Vault Sign In'}
          {currentView === 'register' && 'Create Your Personal Vault'}
          {currentView === 'verify-email' && 'Email Authentication'}
          {currentView === 'forgot-password' && 'Password Recovery'}
        </h2>

        {/* Private by Default Notice & Supabase Badge */}
        <div className="mt-3 mx-auto max-w-sm flex flex-col gap-1.5 items-center">
          <div className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/90 text-emerald-900 text-xs font-medium border border-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Your personal workspace is private by default.</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
            <Database className="w-3.5 h-3.5 text-emerald-700" />
            <span>Supabase Database & Auth: <strong className="font-mono text-emerald-950 font-bold">{SUPABASE_PROJECT_ID}</strong></span>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          {/* ===================== VIEW: VERIFY EMAIL ===================== */}
          {currentView === 'verify-email' && (
            <EmailVerificationCard
              email={verifyEmail || regEmail || loginEmail}
              workspaceType="personal"
              simulatedCode={simulatedCode}
              onSuccess={() => navigate('/personal/dashboard')}
              onBackToRegister={() => setCurrentView('register')}
            />
          )}

          {/* ===================== VIEW: LOGIN ===================== */}
          {currentView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Demo auto-fill banner */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold">Demo Account:</span> Alex Morgan
                  <div className="text-[11px] text-emerald-700 font-mono">alex.morgan@trustvault.me</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail(DEMO_USERS.personalUser.email);
                    setLoginPassword('PersonalVault2026!');
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold text-[11px] hover:bg-emerald-800"
                >
                  Fill Demo
                </button>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => navigate('/personal/forgot-password')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Email Checkbox */}
              <div className="flex items-center">
                <input
                  id="remember-email"
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="h-4 w-4 text-emerald-700 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-email" className="ml-2 block text-xs text-slate-600 cursor-pointer">
                  Remember email on this browser (session remains secured)
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#0f392b] hover:bg-[#165b44] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Personal Vault'}
              </button>

              {/* Navigation to Registration or Corporate */}
              <div className="pt-4 border-t border-slate-100 text-center space-y-2">
                <p className="text-xs text-slate-600">
                  New to TrustVault?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/personal/register')}
                    className="font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                  >
                    Create Personal Account
                  </button>
                </p>
                <p className="text-xs text-slate-500">
                  Looking for company workspaces?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/corporate/login')}
                    className="font-semibold text-blue-800 hover:text-blue-950 hover:underline"
                  >
                    Go to Corporate Login
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ===================== VIEW: REGISTER ===================== */}
          {currentView === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regErrors.general && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{regErrors.general}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Account created successfully! Initializing your private vault...</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Jordan Miller"
                    className={`block w-full pl-10 pr-3 py-2 sm:text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                      regErrors.fullName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                </div>
                {regErrors.fullName && <p className="mt-1 text-xs text-rose-600">{regErrors.fullName}</p>}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="jordan.miller@example.com"
                    className={`block w-full pl-10 pr-3 py-2 sm:text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                      regErrors.email ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                </div>
                {regErrors.email && <p className="mt-1 text-xs text-rose-600">{regErrors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Master Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`block w-full pl-10 pr-10 py-2 sm:text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                      regErrors.password ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {regErrors.password && <p className="mt-1 text-xs text-rose-600">{regErrors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`block w-full pl-10 pr-3 py-2 sm:text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                      regErrors.confirmPassword ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                </div>
                {regErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-600">{regErrors.confirmPassword}</p>
                )}
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1 text-slate-600">
                <div className="font-semibold text-slate-700 mb-1">Password Requirements:</div>
                <div className="flex items-center gap-1.5">
                  <span className={regPassword.length >= 8 ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    ✓ At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={/[A-Z]/.test(regPassword) ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    ✓ At least one uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={/[0-9]/.test(regPassword) ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    ✓ At least one number
                  </span>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start">
                <input
                  id="reg-terms"
                  type="checkbox"
                  checked={regAgreedTerms}
                  onChange={(e) => setRegAgreedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-emerald-700 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="reg-terms" className="ml-2 block text-xs text-slate-600 cursor-pointer">
                  I agree to the TrustVault Terms of Service, Zero-Knowledge Privacy Policy, and encrypted storage
                  policies.
                </label>
              </div>
              {regErrors.terms && <p className="text-xs text-rose-600">{regErrors.terms}</p>}

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#0f392b] hover:bg-[#165b44] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Provisioning Vault...' : 'Create Account & Open Vault'}
              </button>

              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/personal/login')}
                    className="font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                  >
                    Sign in to Personal Vault
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ===================== VIEW: FORGOT PASSWORD ===================== */}
          {currentView === 'forgot-password' && (
            <div className="space-y-5">
              {forgotSubmitted ? (
                <div className="text-center py-4 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recovery Instructions Sent</h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      If an account exists for <span className="font-semibold text-slate-800">{forgotEmail}</span>, a
                      secure password-reset link has been dispatched. For security reasons, we do not confirm whether
                      an account is registered.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/personal/login')}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter the email associated with your Personal Vault. We will send you instructions to safely reset
                    your master password.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#0f392b] hover:bg-[#165b44] focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Verifying...' : 'Send Recovery Instructions'}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/personal/login')}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
                    >
                      Return to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
