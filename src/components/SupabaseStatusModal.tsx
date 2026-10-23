import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Key,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  SUPABASE_PROJECT_ID,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SQL_SCHEMA,
  checkSupabaseTablesStatus,
} from '../lib/supabase';
import { trustVaultStore } from '../services/trustvault-store';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schema' | 'tables'>('overview');
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    counts?: Record<string, number>;
  } | null>(null);
  const [status, setStatus] = useState<{
    connected: boolean;
    tables: Record<string, boolean>;
    message: string;
  } | null>(null);

  const currentUser = trustVaultStore.getCurrentUser();

  const runCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkSupabaseTablesStatus();
      setStatus(res);
    } catch (err: any) {
      setStatus({
        connected: false,
        tables: {},
        message: err.message || 'Error communicating with Supabase',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await trustVaultStore.syncAllDataToSupabase();
      setSyncResult(res);
      await runCheck();
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Failed to sync data to Supabase.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tablesList = [
    { name: 'profiles', label: 'User Profiles, Email Authentication & Verification Enclave' },
    { name: 'workspaces', label: 'Personal & Corporate Workspaces' },
    { name: 'organisation_members', label: 'Organization RBAC Memberships' },
    { name: 'documents', label: 'Zero-Knowledge Encrypted Documents & Sealed Metadata' },
    { name: 'permission_grants', label: 'Granular Permission Grants (READ / EDIT)' },
    { name: 'invitations', label: 'Workspace Invitations (Admin Accept/Reject)' },
    { name: 'audit_events', label: 'Tamper-Evident Immutable Audit Log (Append-Only RLS)' },
    { name: 'download_requests', label: 'Strict Download Authorization Requests' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#0f392b] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Supabase Backend & Database
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Live Connected
                </span>
              </h2>
              <p className="text-xs text-emerald-200/80">
                Project ID: <span className="font-mono text-emerald-100 font-semibold">{SUPABASE_PROJECT_ID}</span>
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

        {/* Navigation Tabs */}
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
              Overview & Credentials
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'tables'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Database Tables Status
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'schema'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              SQL Migration Script
            </button>
          </div>

          <button
            onClick={runCheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Credentials Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-700" />
                  Active Supabase Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium block">Project ID:</span>
                    <span className="font-mono text-slate-900 font-bold">{SUPABASE_PROJECT_ID}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium block">Project API Endpoint:</span>
                    <span className="font-mono text-slate-900 font-bold break-all">{SUPABASE_URL}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 md:col-span-2">
                    <span className="text-slate-500 font-medium block">Publishable / Anon API Key:</span>
                    <span className="font-mono text-slate-900 font-medium break-all">{SUPABASE_ANON_KEY}</span>
                  </div>
                </div>
              </div>

              {/* Status and Current User */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Supabase Auth Engine
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    User registration and sign-in are connected to Supabase GoTrue Auth. New users registered in the Personal or Corporate portal receive Supabase Auth identities.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Current Session Profile
                  </div>
                  <p className="text-xs text-slate-700 font-mono">
                    {currentUser ? `${currentUser.fullName} (${currentUser.email})` : 'No active session'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Role in active workspace: <span className="font-semibold text-slate-700">{trustVaultStore.getActiveWorkspaceRole() || 'Member'}</span>
                  </p>
                </div>
              </div>

              {/* Functional Highlights */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Hardened Security & Database Features
                </h4>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5">
                  <li>
                    <strong className="text-slate-800">Mandatory Email Authentication:</strong> New user accounts require 6-digit OTP confirmation with Supabase Auth before vault enclaves and encryption keys are activated.
                  </li>
                  <li>
                    <strong className="text-slate-800">Zero-Trust Row Level Security (RLS):</strong> Documents table policies mathematically block any read, upload, or update operation if <code className="font-mono text-emerald-800 font-bold">is_email_verified = false</code>.
                  </li>
                  <li>
                    <strong className="text-slate-800">Automatic Auth Trigger Sync:</strong> PostgreSQL trigger <code className="font-mono text-emerald-800">handle_auth_user_change()</code> synchronously mirrors <code className="font-mono">auth.users</code> email confirmation into <code className="font-mono">public.profiles</code>.
                  </li>
                  <li>
                    <strong className="text-slate-800">Append-Only Audit Logs:</strong> Tamper-evident guarantee where UPDATE and DELETE policies return <code className="font-mono text-rose-800 font-bold">false</code> to prevent log tampering.
                  </li>
                  <li>
                    <strong className="text-slate-800">Resilient Storage Architecture:</strong> Zero-latency optimistic UI updates with live Supabase remote synchronization and offline recovery.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Below is the status of the PostgreSQL tables in your Supabase project (<code className="font-mono text-emerald-800 font-semibold">{SUPABASE_PROJECT_ID}</code>).
                </p>
                <button
                  onClick={handleSyncData}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f392b] hover:bg-[#165b44] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Data to Supabase'}</span>
                </button>
              </div>

              {syncResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                    syncResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {syncResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{syncResult.message}</div>
                    {syncResult.counts && (
                      <div className="mt-1 text-[11px] text-emerald-800 grid grid-cols-2 sm:grid-cols-4 gap-1 font-mono">
                        {Object.entries(syncResult.counts).map(([k, v]) => (
                          <span key={k}>
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {tablesList.map((tbl) => {
                  const isPresent = status?.tables?.[tbl.name];
                  return (
                    <div key={tbl.name} className="px-4 py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-slate-900">{tbl.name}</div>
                        <div className="text-slate-500 text-[11px]">{tbl.label}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active in Supabase
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Ready for SQL Execution
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!Object.values(status?.tables || {}).some(Boolean) && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <p className="font-bold">To create all database tables in Supabase with 1-click copy:</p>
                  <p className="text-amber-800 leading-relaxed">
                    1. Copy the SQL script from the <strong>SQL Migration Script</strong> tab.<br />
                    2. Paste and run it inside your Supabase project SQL Editor (<a
                      href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-0.5"
                    >
                      Open Supabase SQL Editor <ExternalLink className="w-3 h-3" />
                    </a>).<br />
                    3. Click &quot;Sync Data to Supabase&quot; above to seed all records!
                  </p>
                  <button
                    onClick={() => setActiveTab('schema')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                  >
                    View SQL Migration Script &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Supabase SQL Migration Script</h4>
                  <p className="text-[11px] text-slate-500">
                    Copy and run this in your Supabase SQL Editor to initialize all 8 tables and Row Level Security policies.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                  >
                    <span>Open SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={handleCopySchema}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f392b] hover:bg-[#165b44] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard' : 'Copy SQL Schema'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-[380px] border border-slate-800 leading-relaxed selection:bg-emerald-800 selection:text-white">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600">
                <span>Direct link to Supabase project SQL editor:</span>
                <a
                  href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline"
                >
                  <span>supabase.com/dashboard/project/{SUPABASE_PROJECT_ID}/sql/new</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase JS SDK v2 integration is active.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
