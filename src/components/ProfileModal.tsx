import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Building2,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  KeyRound,
  Layers,
  FileText,
} from 'lucide-react';
import { trustVaultStore } from '../services/trustvault-store';
import { User as UserType } from '../types/trustvault';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onRefresh?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onLogout,
  onRefresh,
}) => {
  const currentUser = trustVaultStore.getCurrentUser();
  const currentWorkspace = trustVaultStore.getCurrentWorkspace();
  const currentRole = trustVaultStore.getActiveWorkspaceRole();
  const userWorkspaces = trustVaultStore.getUserWorkspaces();
  const docs = trustVaultStore.getDocumentsForCurrentWorkspace();
  const ownedDocsCount = docs.filter((d) => d.document.ownerId === currentUser?.id).length;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit'>('overview');

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
      setEmail(currentUser.email);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters long.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    setIsSaving(true);
    try {
      await trustVaultStore.updateUserProfile(fullName, email);
      setIsSaving(false);
      setSuccessMessage('Profile information successfully updated and synchronized with Supabase.');
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setIsSaving(false);
      setErrorMessage(err.message || 'Failed to update profile.');
    }
  };

  const formattedDate = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#0f392b] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                User Profile
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Verified Identity
                </span>
              </h2>
              <p className="text-xs text-emerald-200/80">
                Manage your identity and workspace credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-900/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Profile Overview
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'edit'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Edit Name & Email
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
            ID: {currentUser.id.slice(0, 14)}...
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Notifications */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <img
                  src={
                    currentUser.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.fullName}&backgroundColor=165b44`
                  }
                  alt={currentUser.fullName}
                  className="w-18 h-18 rounded-2xl border-2 border-emerald-500 shadow-md object-cover flex-shrink-0"
                />
                <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 truncate">
                      {currentUser.fullName}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {currentUser.isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          Email Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          Unverified Email
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-full">
                        {currentUser.securityLevel || 'ZERO_KNOWLEDGE_TIER_1'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-mono text-slate-600 flex items-center justify-center sm:justify-start gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentUser.email}</span>
                  </p>

                  <p className="text-[11px] text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {currentUser.emailVerifiedAt
                        ? `Authenticated on ${new Date(currentUser.emailVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : `Member since ${formattedDate}`}
                    </span>
                  </p>
                </div>
              </div>

              {/* Workspace & Permissions Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    {currentWorkspace?.type === 'personal' ? (
                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                    )}
                    Active Workspace
                  </span>
                  <div className="font-bold text-sm text-slate-900 truncate">
                    {currentWorkspace?.name || 'Personal Vault'}
                  </div>
                  <div className="text-xs text-slate-600">
                    Role:{' '}
                    <span className="font-semibold text-emerald-800">
                      {currentRole || (currentWorkspace?.type === 'personal' ? 'Owner' : 'Member')}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    Authorised Workspaces
                  </span>
                  <div className="font-bold text-sm text-slate-900">
                    {userWorkspaces.length} Accessible {userWorkspaces.length === 1 ? 'Vault' : 'Vaults'}
                  </div>
                  <div className="text-xs text-slate-600">
                    Owned Documents: <span className="font-semibold text-slate-900">{ownedDocsCount}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action to Edit */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Update Identity Details</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Change your legal name or official email address for all document signatures.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Change Name & Email Address</h3>
                <p className="text-xs text-slate-500">
                  Updates reflect instantly across all your vaults, document signatures, and Supabase database.
                </p>
              </div>

              {/* Full Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Legal Name
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jordan Miller"
                    className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Displayed on zero-knowledge watermarks and document ownership certificates.
                </p>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Primary Email Address
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jordan@example.com"
                    className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Used for sign-in, access permissions, invitations, and audit log tracking.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f392b] hover:bg-[#165b44] text-white font-bold text-xs shadow-md disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFullName(currentUser.fullName);
                    setEmail(currentUser.email);
                    setActiveTab('overview');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Direct Sign Out Option inside Profile */}
          <div className="pt-5 border-t border-slate-200">
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <LogOut className="w-4 h-4 text-rose-600" />
                  Sign Out of Account
                </h4>
                <p className="text-[11px] text-rose-800 mt-0.5">
                  Terminates your current session and locks your private encrypted document vaults.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>TrustVault Identity & Access Control</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
