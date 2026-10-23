import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Lock,
  Sparkles,
  KeyRound,
  Check,
  Copy,
  Clock,
  ArrowLeft,
  Database,
} from 'lucide-react';
import { trustVaultStore } from '../services/trustvault-store';
import { SUPABASE_PROJECT_ID } from '../lib/supabase';

interface EmailVerificationCardProps {
  email: string;
  workspaceType: 'personal' | 'corporate';
  simulatedCode?: string;
  onSuccess: () => void;
  onBackToRegister?: () => void;
}

export const EmailVerificationCard: React.FC<EmailVerificationCardProps> = ({
  email,
  workspaceType,
  simulatedCode: initialCode,
  onSuccess,
  onBackToRegister,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [activeCode, setActiveCode] = useState<string>(() => {
    if (initialCode) return initialCode;
    const pending = trustVaultStore.getPendingVerification(email);
    return pending?.code || '749201';
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer cooldown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Update active code if pending changes
  useEffect(() => {
    const pending = trustVaultStore.getPendingVerification(email);
    if (pending?.code) {
      setActiveCode(pending.code);
    }
  }, [email]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept single numeric digit
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...digits];

    if (!cleaned) {
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // Handle single digit input
    newDigits[index] = cleaned[cleaned.length - 1];
    setDigits(newDigits);
    setVerifyError(null);

    // Auto-advance to next input
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pasted) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      setVerifyError(null);
      const nextFocus = Math.min(5, pasted.length);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const handleAutoFillCode = () => {
    if (activeCode && activeCode.length === 6) {
      setDigits(activeCode.split(''));
      setVerifyError(null);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVerifyError(null);

    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setVerifyError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      await trustVaultStore.verifyEmailOtpAsync(email, fullCode);
      setIsVerifying(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 900);
    } catch (err: any) {
      setIsVerifying(false);
      setVerifyError(err.message || 'Verification failed. Please try again.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendStatus(null);
    setVerifyError(null);

    try {
      const res = await trustVaultStore.resendVerificationOtp(email);
      setActiveCode(res.newCode);
      setResendCooldown(45);
      setResendStatus(`Fresh authentication token sent to ${email}`);
      setTimeout(() => setResendStatus(null), 4000);
    } catch (err: any) {
      setVerifyError(err.message || 'Failed to resend verification code.');
    }
  };

  const handleCopyCode = () => {
    if (activeCode) {
      navigator.clipboard.writeText(activeCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand Header & Security Shield */}
      <div className="text-center">
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f392b] to-[#165b44] text-white flex items-center justify-center shadow-lg border border-emerald-500/30">
          <Mail className="w-8 h-8 text-emerald-300 stroke-[2.2]" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <h3 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
          Verify Your Email
        </h3>
        <p className="mt-1.5 text-xs text-slate-600 max-w-sm mx-auto">
          To ensure strict zero-knowledge document isolation, TrustVault requires email authentication before unlocking your vault.
        </p>

        {/* Email Badge */}
        <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-950 font-mono">
          <Mail className="w-3.5 h-3.5 text-emerald-700" />
          <span>{email}</span>
        </div>
      </div>

      {/* Success Notification */}
      {isSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-emerald-800">
              Identity Authenticated
            </div>
            <div className="text-xs font-medium text-emerald-900 mt-0.5">
              Email verified with Supabase Auth. Unlocking your AES-256 encrypted vault...
            </div>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {verifyError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{verifyError}</span>
        </div>
      )}

      {/* Resend Status Notification */}
      {resendStatus && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>{resendStatus}</span>
        </div>
      )}

      {/* 6-Digit Code Input Form */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center mb-3">
            Enter 6-Digit Verification Code
          </label>
          <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className="w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-mono font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all shadow-xs"
              />
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isVerifying || isSuccess || digits.join('').length !== 6}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying Token with Supabase...</span>
            </>
          ) : isSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Authentication Verified!</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Verify & Activate {workspaceType === 'corporate' ? 'Organisation' : 'Personal'} Vault</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Sandbox & Development Helper Box */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-700">
          <span className="font-bold flex items-center gap-1.5 text-slate-900">
            <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
            Sandbox OTP Helper:
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950"
          >
            {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          In development mode without an external SMTP gateway configured, your cryptographic OTP is{' '}
          <strong className="font-mono text-emerald-900 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
            {activeCode}
          </strong>
        </p>
        <button
          type="button"
          onClick={handleAutoFillCode}
          className="w-full py-1.5 px-3 rounded-lg bg-emerald-100/80 hover:bg-emerald-200/90 text-emerald-950 font-bold text-xs border border-emerald-300 transition-colors flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>Auto-fill OTP ({activeCode})</span>
        </button>
      </div>

      {/* Resend & Change Email Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600 border-t border-slate-200">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 hover:text-emerald-950 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
          </span>
        </button>

        {onBackToRegister && (
          <button
            type="button"
            onClick={onBackToRegister}
            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Wrong email? Re-enter</span>
          </button>
        )}
      </div>

      {/* Zero-Knowledge Security Notice */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-[11px] text-emerald-900">
        <Database className="w-4 h-4 text-emerald-700 flex-shrink-0" />
        <span>
          Supabase Database Project <strong className="font-mono font-bold">{SUPABASE_PROJECT_ID}</strong> enforces Row Level Security (RLS) restricting document reads until email verification is confirmed.
        </span>
      </div>
    </div>
  );
};
