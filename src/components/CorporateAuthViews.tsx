import React, { useState } from 'react';
import {
  Building2,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Globe,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  User,
  Clock,
  Sparkles,
  Database,
} from 'lucide-react';
import { DEMO_USERS, trustVaultStore } from '../services/trustvault-store';
import { SUPABASE_PROJECT_ID } from '../lib/supabase';
import { EmailVerificationCard } from './EmailVerificationCard';

interface CorporateAuthProps {
  view: 'login' | 'register-company' | 'join-company' | 'accept-invitation' | 'verify-email';
  navigate: (route: string) => void;
  initialToken?: string;
  initialEmail?: string;
}

export const CorporateAuthViews: React.FC<CorporateAuthProps> = ({
  view,
  navigate,
  initialToken = 'inv_valid_123',
  initialEmail = '',
}) => {
  const [currentView, setCurrentView] = useState<'login' | 'register-company' | 'join-company' | 'accept-invitation' | 'verify-email'>(view);
  const [verifyEmail, setVerifyEmail] = useState(initialEmail);
  const [simulatedCode, setSimulatedCode] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    setCurrentView(view);
    if (initialEmail) setVerifyEmail(initialEmail);
  }, [view, initialEmail]);

  // Corporate login state
  const [loginEmail, setLoginEmail] = useState(DEMO_USERS.corporateAdmin.email);
  const [loginPassword, setLoginPassword] = useState('AcmeCorp2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Company registration state
  const [companyName, setCompanyName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // Accept invitation state
  const [inviteToken, setInviteToken] = useState(initialToken);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Auto-slug generator when company name changes
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setCompanyName(name);
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setWorkspaceSlug(slug);
  };

  // Corporate Login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both your work email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await trustVaultStore.loginAsync(loginEmail, loginPassword, 'corporate');
      setIsSubmitting(false);
      navigate('/corporate/dashboard');
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
      setLoginError(err.message || 'Invalid work email or password.');
    }
  };

  // Corporate Registration submit
  const handleRegisterCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!companyName.trim()) {
      errors.companyName = 'Company or organisation name is required.';
    }

    if (!workspaceSlug.trim() || workspaceSlug.trim().length < 3) {
      errors.workspaceSlug = 'Workspace slug must be at least 3 alphanumeric characters.';
    }

    if (!adminName.trim()) {
      errors.adminName = 'Initial administrator name is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!workEmail.trim() || !emailRegex.test(workEmail.trim())) {
      errors.workEmail = 'Please provide a valid work email address.';
    }

    if (regPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      errors.terms = 'You must accept the Enterprise Agreement and Privacy Terms.';
    }

    setRegErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await trustVaultStore.registerCompanyAsync(companyName, workspaceSlug, adminName, workEmail, regPassword);
      setIsSubmitting(false);
      setVerifyEmail(workEmail.trim().toLowerCase());
      setSimulatedCode(res.verificationCode);
      setCurrentView('verify-email');
    } catch (err: any) {
      setIsSubmitting(false);
      setRegErrors({ general: err.message || 'Failed to register organisation.' });
    }
  };

  // Accept Invitation submit
  const handleAcceptInvitationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    const currentUser = trustVaultStore.getCurrentUser();
    if (!currentUser) {
      setInviteError('You must sign in first before accepting an organisation invitation.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      try {
        const res = trustVaultStore.acceptInvitation(inviteToken);
        setIsSubmitting(false);
        setInviteSuccess(res.message);
        setTimeout(() => {
          navigate('/corporate/dashboard');
        }, 1000);
      } catch (err: any) {
        setIsSubmitting(false);
        setInviteError(err.message || 'Invalid or expired invitation token.');
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back Link */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        {/* Brand Icon & Heading */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0f392b] text-white flex items-center justify-center shadow-lg">
            <Building2 className="w-7 h-7 stroke-[2.2]" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          {currentView === 'login' && 'Corporate Sign In'}
          {currentView === 'register-company' && 'Register Organisation'}
          {currentView === 'verify-email' && 'Email Authentication'}
          {currentView === 'join-company' && 'Join an Existing Organisation'}
          {currentView === 'accept-invitation' && 'Accept Organisation Invitation'}
        </h2>

        <p className="mt-2 text-center text-xs text-slate-500 max-w-sm mx-auto">
          {currentView === 'login' && 'Secure multi-tenant workspace with role-based document permissions.'}
          {currentView === 'register-company' && 'Initialize an isolated workspace with designated admin ownership.'}
          {currentView === 'verify-email' && 'Verify your corporate email to activate your organisation vault.'}
          {currentView === 'join-company' && 'Company membership requires an authorised invitation token.'}
          {currentView === 'accept-invitation' && 'Verify your identity and activate your company membership.'}
        </p>

        <div className="mt-2.5 mx-auto max-w-sm flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
          <Database className="w-3.5 h-3.5 text-emerald-700" />
          <span>Supabase Connected: <strong className="font-mono text-emerald-950 font-bold">{SUPABASE_PROJECT_ID}</strong></span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          {/* ===================== VIEW: VERIFY EMAIL ===================== */}
          {currentView === 'verify-email' && (
            <EmailVerificationCard
              email={verifyEmail || workEmail || loginEmail}
              workspaceType="corporate"
              simulatedCode={simulatedCode}
              onSuccess={() => navigate('/corporate/dashboard')}
              onBackToRegister={() => setCurrentView('register-company')}
            />
          )}

          {/* ===================== VIEW: CORPORATE LOGIN ===================== */}
          {currentView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Demo Accounts Preset Bar */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700 block">Quick Demo Roles (Acme Corp):</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail(DEMO_USERS.corporateAdmin.email);
                      setLoginPassword('AcmeCorp2026!');
                    }}
                    className="p-1.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold text-[10px] text-center"
                  >
                    Sarah (Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail(DEMO_USERS.corporateMember.email);
                      setLoginPassword('AcmeCorp2026!');
                    }}
                    className="p-1.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-semibold text-[10px] text-center"
                  >
                    David (Member)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail(DEMO_USERS.corporateAuditor.email);
                      setLoginPassword('AcmeCorp2026!');
                    }}
                    className="p-1.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[10px] text-center"
                  >
                    Elena (Auditor)
                  </button>
                </div>
              </div>

              {/* Work Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Work Email Address
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
                    placeholder="name@company.com"
                    className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => navigate('/personal/forgot-password')}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
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
                    className="block w-full pl-10 pr-10 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#0f392b] hover:bg-[#165b44] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}
              </button>

              {/* Alternative Onboarding Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => navigate('/corporate/register-company')}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Register a New Company</span>
                </button>

                <div className="flex items-center justify-center gap-3 text-slate-500 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/corporate/join-company')}
                    className="text-emerald-800 hover:underline font-semibold"
                  >
                    Join an Existing Company
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => navigate('/corporate/accept-invitation')}
                    className="text-emerald-800 hover:underline font-semibold"
                  >
                    Accept an Invitation
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ===================== VIEW: REGISTER COMPANY ===================== */}
          {currentView === 'register-company' && (
            <form onSubmit={handleRegisterCompanySubmit} className="space-y-4">
              {regErrors.general && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{regErrors.general}</span>
                </div>
              )}

              {/* Company Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Company / Organisation Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={handleCompanyNameChange}
                  placeholder="Apex Global Security Ltd."
                  className="block w-full px-3.5 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
                {regErrors.companyName && <p className="mt-1 text-xs text-rose-600">{regErrors.companyName}</p>}
              </div>

              {/* Unique Workspace Slug with Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unique Workspace Slug
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="apex-global"
                    className="block w-full pl-10 pr-3 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900"
                  />
                </div>
                {/* Live Slug Preview */}
                <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-[11px] text-emerald-900 flex items-center justify-between border border-emerald-200">
                  <span className="text-emerald-700">Workspace URL:</span>
                  <span className="font-mono font-bold text-emerald-950 truncate">
                    trustvault.io/ws/{workspaceSlug || 'your-slug'}
                  </span>
                </div>
                {regErrors.workspaceSlug && (
                  <p className="mt-1 text-xs text-rose-600">{regErrors.workspaceSlug}</p>
                )}
              </div>

              {/* Administrator Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Administrator Name
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Claire Daniels"
                  className="block w-full px-3.5 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
                {regErrors.adminName && <p className="mt-1 text-xs text-rose-600">{regErrors.adminName}</p>}
              </div>

              {/* Work Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="claire@apexglobal.com"
                  className="block w-full px-3.5 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
                {regErrors.workEmail && <p className="mt-1 text-xs text-rose-600">{regErrors.workEmail}</p>}
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full px-3 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full px-3 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
              </div>
              {regErrors.password && <p className="text-xs text-rose-600">{regErrors.password}</p>}
              {regErrors.confirmPassword && (
                <p className="text-xs text-rose-600">{regErrors.confirmPassword}</p>
              )}

              {/* Terms Checkbox */}
              <div className="flex items-start">
                <input
                  id="corp-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-emerald-700 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="corp-terms" className="ml-2 block text-xs text-slate-600 cursor-pointer">
                  I agree to the Enterprise Workspace Agreement. Company validation and initial admin rights will be
                  provisioned.
                </label>
              </div>
              {regErrors.terms && <p className="text-xs text-rose-600">{regErrors.terms}</p>}

              {/* Register Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#0f392b] hover:bg-[#165b44] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Creating Company Workspace...' : 'Register Company & Launch'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/corporate/login')}
                  className="text-xs font-semibold text-emerald-800 hover:underline"
                >
                  Already have a workspace? Sign In
                </button>
              </div>
            </form>
          )}

          {/* ===================== VIEW: JOIN COMPANY ===================== */}
          {currentView === 'join-company' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-blue-700" />
                  Invitation-Only Access Policy
                </div>
                <p className="leading-relaxed">
                  To safeguard multi-tenant isolation, arbitrary users cannot become members simply by typing a
                  company name. You must be invited by an authorized Organisation Administrator.
                </p>
              </div>

              <div className="text-xs text-slate-600 space-y-3">
                <div className="font-bold text-slate-800">How to join your organization:</div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                    1
                  </div>
                  <span>Ask your company administrator to issue an invitation to your corporate email.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                    2
                  </div>
                  <span>Click the secure invitation link in your invitation email, or paste your token below.</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/corporate/accept-invitation')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0f392b] hover:bg-[#165b44] text-white font-bold text-xs shadow transition-colors cursor-pointer"
              >
                <span>Enter Invitation Token</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/corporate/login')}
                  className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                >
                  Return to Corporate Login
                </button>
              </div>
            </div>
          )}

          {/* ===================== VIEW: ACCEPT INVITATION ===================== */}
          {currentView === 'accept-invitation' && (
            <form onSubmit={handleAcceptInvitationSubmit} className="space-y-4">
              {inviteError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{inviteError}</span>
                </div>
              )}

              {inviteSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              {/* Sample Valid Invitation Preview Card */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    Acme Corporation
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 font-bold text-emerald-900">
                    Pending
                  </span>
                </div>
                <div className="text-slate-600 text-[11px]">
                  Intended recipient: <strong className="text-slate-800">alex.morgan@trustvault.me</strong>
                </div>
                <div className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expires: Dec 31, 2026 (Single-Use Token)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Invitation Token
                </label>
                <input
                  type="text"
                  required
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="inv_token_..."
                  className="block w-full px-3.5 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#0f392b] hover:bg-[#165b44] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Verifying Token...' : 'Accept Invitation & Join'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/corporate/login')}
                  className="text-xs font-semibold text-emerald-800 hover:underline"
                >
                  Return to Corporate Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
