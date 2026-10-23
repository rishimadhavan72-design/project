import React from 'react';
import {
  Shield,
  Lock,
  Building2,
  KeyRound,
  FileText,
  UserCheck,
  EyeOff,
  History,
  ArrowRight,
  Server,
  FileCheck2,
  Check,
  CameraOff,
} from 'lucide-react';

interface WelcomeViewProps {
  navigate: (route: string) => void;
  onOpenCodeExport: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ navigate, onOpenCodeExport }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0f392b] via-[#134837] to-[#0d3125] text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 shadow-inner">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <Shield className="w-3.5 h-3.5" />
            Enterprise-Grade Document Security
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            Your documents.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-white">
              Your control.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-emerald-100/90 leading-relaxed font-normal mb-12">
            TrustVault empowers individuals and organizations to securely upload, manage, share, and protect critical
            records with cryptographic verification, private file storage, and uncompromising document-level
            permissions.
          </p>

          {/* Quick Choice Callout: Personal vs Corporate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            {/* Personal Use Card */}
            <div className="group relative bg-white/95 backdrop-blur rounded-2xl p-7 border-2 border-emerald-400/40 hover:border-emerald-400 shadow-xl hover:shadow-2xl transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-sm">
                    <Lock className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Private by Default
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-2">Personal Use</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Zero-knowledge private storage designed for individuals. Store passports, deeds, tax returns, and
                  medical records in an isolated encrypted vault accessible exclusively by you.
                </p>

                <ul className="space-y-2 mb-8 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span>Private encrypted document vault outside web root</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span>Granular temporary sharing (READ or EDIT grants)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span>Instant grant revocation & personal audit history</span>
                  </li>
                </ul>
              </div>

              <div>
                <button
                  onClick={() => navigate('/personal/login')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#0f392b] hover:bg-[#165b44] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <span>Continue to Personal Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="mt-3 text-center">
                  <button
                    onClick={() => navigate('/personal/register')}
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-medium hover:underline"
                  >
                    Don&apos;t have an account? Create Personal Account
                  </button>
                </div>
              </div>
            </div>

            {/* Corporate Use Card */}
            <div className="group relative bg-white/95 backdrop-blur rounded-2xl p-7 border-2 border-emerald-400/40 hover:border-emerald-400 shadow-xl hover:shadow-2xl transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800 shadow-sm">
                    <Building2 className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                    Organisation Workspaces
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-2">Corporate Use</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Multi-tenant enterprise workspaces for companies, institutions, and legal teams. Features workspace
                  slugs, role management (Admin, Member, Auditor), and strict anti-privilege escalation.
                </p>

                <ul className="space-y-2 mb-8 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span>Workspace tenant isolation with secure slug resolution</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span>Document RBAC (NONE, READ, EDIT, OWNER)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span>Admins cannot read documents without explicit grant</span>
                  </li>
                </ul>
              </div>

              <div>
                <button
                  onClick={() => navigate('/corporate/login')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#0f392b] hover:bg-[#165b44] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <span>Continue to Corporate Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="mt-3 flex items-center justify-center gap-3 text-xs text-emerald-800 font-medium">
                  <button
                    onClick={() => navigate('/corporate/register-company')}
                    className="hover:text-emerald-950 hover:underline"
                  >
                    Register New Company
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => navigate('/corporate/accept-invitation')}
                    className="hover:text-emerald-950 hover:underline"
                  >
                    Accept Invitation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture Section */}
      <section id="security-section" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0f392b] bg-emerald-100 px-3 py-1 rounded-full">
            Zero-Trust Architectural Foundation
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-3 sm:text-4xl">
            Built on Ironclad Security Principles
          </h2>
          <p className="mt-4 text-base text-slate-600">
            TrustVault replaces loose folder permissions with cryptographic identity validation, explicit document
            ownership, and mandatory server-side verification on every download, preview, and edit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {/* Card 1: Document-Level RBAC */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Granular Access Levels</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every document evaluates to <strong className="text-slate-900">NONE</strong>,{' '}
              <strong className="text-slate-900">READ</strong>, <strong className="text-slate-900">EDIT</strong>, or{' '}
              <strong className="text-slate-900">OWNER</strong>. Effective permissions are computed server-side, never
              trusted from client state.
            </p>
          </div>

          {/* Card 2: Anti-Screen Capture DRM */}
          <div className="bg-white rounded-xl p-6 border-2 border-emerald-500/40 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-bl">
              Protected
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
              <CameraOff className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Anti-Screen Capture DRM</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Zero-knowledge preview streams feature dynamic forensic watermarking (viewer email + timestamp), window
              focus-loss privacy shielding, and PrtScn/capture shortcut interception.
            </p>
          </div>

          {/* Card 3: Private File Storage */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Private Storage Boundary</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Uploaded files are never placed in public static web roots. Files are stored on isolated, encrypted
              volumes and streamed only after server-side authorization check.
            </p>
          </div>

          {/* Card 4: Anti-Privilege Escalation */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
              <EyeOff className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">No Automatic Admin Peeking</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Organisation membership and document access are strictly decoupled. Company administrators cannot view or
              download private documents without an explicit grant from the owner.
            </p>
          </div>

          {/* Card 5: Audit & Activity Logging */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Tamper-Evident Audit Trails</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every action—logins, uploads, downloads, edits, permission grants, and intercepted screenshot
              attempts—is immutably recorded with actor IDs and timestamps.
            </p>
          </div>
        </div>

        {/* Full-Stack Architecture Showcase Banner */}
        <div className="mt-16 bg-gradient-to-r from-[#0f392b] to-[#165b44] rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold tracking-wider uppercase mb-2">
              <FileCheck2 className="w-4 h-4" />
              Full-Stack Architecture Specification
            </div>
            <h3 className="text-2xl font-bold">Angular + ASP.NET Core Web API + SQL Server</h3>
            <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
              Built according to strict enterprise patterns with Entity Framework Core migrations, typed DTOs,
              C# Authorization Handlers, and Angular Reactive Forms.
            </p>
          </div>
          <button
            onClick={onOpenCodeExport}
            className="flex-shrink-0 px-6 py-3 rounded-xl bg-white text-[#0f392b] font-bold text-sm shadow hover:bg-emerald-50 transition-colors flex items-center gap-2"
          >
            <span>View Architecture & Code (.NET / Angular)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Shield className="w-5 h-5 text-emerald-400" />
                TrustVault
              </div>
              <p className="text-xs text-slate-400">
                Your documents. Your control. Production-grade document security and access governance.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Product</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => navigate('/personal/login')} className="hover:text-emerald-400 transition-colors">
                    Personal Vault
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/corporate/login')} className="hover:text-emerald-400 transition-colors">
                    Corporate Workspaces
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/corporate/register-company')} className="hover:text-emerald-400 transition-colors">
                    Company Registration
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Security & Compliance</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="text-slate-300">AES-256-GCM Private Storage</span>
                </li>
                <li>
                  <span className="text-slate-300">Server-Side Authorization Matrix</span>
                </li>
                <li>
                  <span className="text-slate-300">Tamper-Evident Audit Logging</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Developer & Admin</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={onOpenCodeExport} className="hover:text-emerald-400 transition-colors">
                    ASP.NET Core C# Backend Source
                  </button>
                </li>
                <li>
                  <button onClick={onOpenCodeExport} className="hover:text-emerald-400 transition-colors">
                    Angular 19 Standalone Code
                  </button>
                </li>
                <li>
                  <button onClick={onOpenCodeExport} className="hover:text-emerald-400 transition-colors">
                    SQL Server 2022 Schema & DDL
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 TrustVault Document Security Platform. All rights reserved.</p>
            <div className="flex gap-6">
              <span>Privacy Policy</span>
              <span>Security Whitepaper</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
