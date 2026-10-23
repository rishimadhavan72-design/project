import React, { useState } from 'react';
import {
  Building2,
  FileText,
  Upload,
  Search,
  Filter,
  Users,
  Mail,
  Shield,
  Activity,
  Settings,
  UserPlus,
  Share2,
  Trash2,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight,
  ShieldAlert,
  HardDrive,
  Copy,
  UserX,
  UserCog,
  X,
  Check,
  ShieldCheck,
  AlertCircle,
  FolderTree,
} from 'lucide-react';
import {
  DocumentItem,
  DocumentPermissionLevel,
  OrganisationMember,
  OrganisationRole,
} from '../types/trustvault';
import { trustVaultStore } from '../services/trustvault-store';
import { S3BucketExplorer } from './S3BucketExplorer';

interface CorporateDashboardProps {
  navigate: (route: string) => void;
  onOpenUpload: () => void;
  onOpenDetails: (doc: DocumentItem, perm: DocumentPermissionLevel) => void;
  onOpenShare: (doc: DocumentItem) => void;
}

export const CorporateDashboard: React.FC<CorporateDashboardProps> = ({
  navigate,
  onOpenUpload,
  onOpenDetails,
  onOpenShare,
}) => {
  const [, setCorpTick] = useState(0);
  React.useEffect(() => {
    return trustVaultStore.subscribe(() => {
      setCorpTick((t) => t + 1);
    });
  }, []);

  const currentUser = trustVaultStore.getCurrentUser();
  const currentWorkspace = trustVaultStore.getCurrentWorkspace();
  const currentRole = trustVaultStore.getActiveWorkspaceRole();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 's3_bucket' | 'shared' | 'members' | 'invitations' | 'audit' | 'settings'
  >('overview');
  const [documentsViewMode, setDocumentsViewMode] = useState<'table' | 's3_explorer'>('table');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Member invitation form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganisationRole>('Member');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Role modification modal state
  const [memberToEdit, setMemberToEdit] = useState<OrganisationMember | null>(null);
  const [newRoleSelection, setNewRoleSelection] = useState<OrganisationRole>('Member');

  // Member removal modal state
  const [memberToRemove, setMemberToRemove] = useState<OrganisationMember | null>(null);

  // Document deletion state
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);

  const confirmDeleteDoc = () => {
    if (!docToDelete) return;
    trustVaultStore.deleteDocument(docToDelete.id);
    setDocToDelete(null);
  };

  // Audit filter state
  const [auditActionFilter, setAuditActionFilter] = useState('All');
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState('All');

  const docsWithPerms = trustVaultStore.getDocumentsForCurrentWorkspace();
  const sharedDocs = trustVaultStore.getSharedWithMeDocuments();
  const members = trustVaultStore.getMembersForCurrentWorkspace();
  const invitations = trustVaultStore.getInvitationsForCurrentWorkspace();
  const auditLogs = trustVaultStore.getAuditEvents(true);
  const pendingOwnerRequests = trustVaultStore.getPendingDownloadRequestsForOwner();

  const isAdmin = currentRole === 'Admin';
  const isAuditor = currentRole === 'Auditor';

  // Filtered documents
  const filteredDocs = docsWithPerms.filter(({ document }) => {
    const matchesSearch =
      document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      document.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      document.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || document.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesAction = auditActionFilter === 'All' || log.action === auditActionFilter;
    const matchesOutcome = auditOutcomeFilter === 'All' || log.outcome === auditOutcomeFilter;
    return matchesAction && matchesOutcome;
  });

  // Handle member invite
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const inv = trustVaultStore.inviteMember(inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteSuccess(`Invitation dispatched to ${inv.recipientEmail} with token: ${inv.token}`);
      setTimeout(() => setInviteSuccess(null), 5000);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to issue invitation.');
    }
  };

  // Handle role modification
  const handleSaveRoleChange = () => {
    if (!memberToEdit) return;
    try {
      trustVaultStore.updateMemberRole(memberToEdit.id, newRoleSelection);
      setMemberToEdit(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle member removal
  const handleConfirmRemoveMember = () => {
    if (!memberToRemove) return;
    try {
      trustVaultStore.removeMember(memberToRemove.id);
      setMemberToRemove(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Revoke invitation
  const handleRevokeInvitation = (invId: string) => {
    try {
      trustVaultStore.revokeInvitation(invId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Administrator-only Accept invitation
  const handleAdminAcceptInvitation = (invId: string) => {
    try {
      trustVaultStore.adminAcceptInvitation(invId);
    } catch (err: any) {
      alert(err.message || 'Failed to accept invitation.');
    }
  };

  // Administrator-only Reject invitation
  const handleAdminRejectInvitation = (invId: string) => {
    try {
      trustVaultStore.adminRejectInvitation(invId);
    } catch (err: any) {
      alert(err.message || 'Failed to reject invitation.');
    }
  };

  // Corporate Workspace Authorization Gate
  const isAuthorizedCorporateMember = Boolean(
    currentUser &&
    currentWorkspace &&
    currentWorkspace.type === 'corporate' &&
    currentRole !== null &&
    trustVaultStore.isCurrentMemberOfWorkspace()
  );

  if (!isAuthorizedCorporateMember) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-800 rounded-3xl border border-rose-500/40 p-8 shadow-2xl text-center space-y-6 animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 shadow-inner">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
              403 Forbidden • Access Denied
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Tenant Isolation Security Enforced
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {currentUser ? (
                <>
                  Your account (<span className="font-semibold text-white">{currentUser.email}</span>) is not an authorized member of{' '}
                  <span className="font-semibold text-emerald-400">{currentWorkspace?.name || 'this corporate workspace'}</span>.
                </>
              ) : (
                'You must authenticate as an authorized corporate member to access this workspace.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-left space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Lock className="w-4 h-4" />
              <span>Multi-Tenant Enterprise Isolation Policy</span>
            </div>
            <p className="leading-normal">
              Corporate documents, AWS S3 storage buckets, audit logs, and member rosters are strictly segregated. Non-company members cannot view dashboards, inspect documents, or browse S3 buckets without verified membership.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => navigate('/corporate/join-company')}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Join Workspace with Invitation Token</span>
            </button>

            <button
              onClick={() => {
                const userWorkspaces = trustVaultStore.getUserWorkspaces();
                const personal = userWorkspaces.find((w) => w.type === 'personal');
                if (personal) {
                  trustVaultStore.switchWorkspace(personal.id);
                  navigate('/personal/dashboard');
                } else {
                  navigate('/personal/login');
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs transition-colors"
            >
              Switch to My Personal Vault
            </button>

            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-slate-400">
              <button
                onClick={() => navigate('/corporate/login')}
                className="hover:text-white underline"
              >
                Sign In with Corporate Member Account
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  trustVaultStore.logout();
                  navigate('/');
                }}
                className="hover:text-rose-400 underline"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-5 flex flex-col justify-between shadow-xs">
        <div className="space-y-6">
          {/* Workspace Info Card */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700">Workspace</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                {currentRole}
              </span>
            </div>
            <div className="font-bold text-slate-900 mt-1 truncate">{currentWorkspace?.name}</div>
            <div className="text-[11px] text-slate-500 font-mono truncate">ws/{currentWorkspace?.slug}</div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#0f392b] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                activeTab === 'documents'
                  ? 'bg-[#0f392b] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Company Documents</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'documents' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {docsWithPerms.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('s3_bucket')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                activeTab === 's3_bucket'
                  ? 'bg-[#0f392b] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderTree className="w-4 h-4 text-amber-500" />
                <span>Projects & Folders</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 's3_bucket' ? 'bg-amber-400 text-slate-950 font-extrabold' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Tree
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shared')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                activeTab === 'shared'
                  ? 'bg-[#0f392b] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4" />
                <span>Shared with Me</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'shared' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {sharedDocs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                activeTab === 'members'
                  ? 'bg-[#0f392b] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Members & Roles</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'members' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {members.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('invitations')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                activeTab === 'invitations'
                  ? 'bg-[#0f392b] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" />
                <span>Invitations</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'invitations' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {invitations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
                activeTab === 'audit'
                  ? 'bg-[#0f392b] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Activity & Audit</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
                activeTab === 'settings'
                  ? 'bg-[#0f392b] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Workspace Settings</span>
            </button>
          </nav>
        </div>

        {/* Anti-Peeking Principle Highlight Box */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-950 mt-6 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <ShieldAlert className="w-4 h-4 text-emerald-700" />
            <span>Anti-Privilege Escalation</span>
          </div>
          <p className="text-emerald-800 leading-tight">
            Org Administrators do not automatically gain read access to confidential documents without explicit grants.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{currentWorkspace?.name}</span>
              <span>/</span>
              <span className="capitalize text-slate-800 font-semibold">{activeTab}</span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h1 className="text-2xl font-extrabold text-slate-900">
                Corporate Document Hub
              </h1>
              {currentUser?.isEmailVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Verified Corporate Identity
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  Email Unverified
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f392b] hover:bg-[#165b44] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Unverified Corporate Email Warning Banner */}
        {currentUser && !currentUser.isEmailVerified && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Corporate Email Authentication Required
                </h4>
                <p className="text-xs text-amber-900 mt-0.5">
                  Your work email (<span className="font-mono font-semibold">{currentUser.email}</span>) has not yet completed cryptographic authentication. S3 storage access and confidential document operations require an authenticated email.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/corporate/verify-email?email=${encodeURIComponent(currentUser.email)}`)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              Verify Email Now
            </button>
          </div>
        )}

        {/* ==================== TAB: OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Authorised Documents
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2 block">
                  {docsWithPerms.length}
                </span>
                <span className="text-xs text-slate-500 font-medium mt-1">Scoped to your active role</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Organisation Members
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{members.length}</span>
                <span className="text-xs text-blue-700 font-semibold mt-1">Admins, Members & Auditors</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pending Invitations
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2 block">
                  {invitations.filter((i) => i.status === 'Pending').length}
                </span>
                <span className="text-xs text-amber-700 font-semibold mt-1">Single-use tokens</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Audited Events
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{auditLogs.length}</span>
                <span className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tamper-evident
                </span>
              </div>
            </div>

            {/* Pending Download Requests Notification for Document Owners */}
            {pendingOwnerRequests.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-200/80 text-emerald-900 flex items-center justify-center font-bold">
                    {pendingOwnerRequests.length}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-emerald-950">
                      Pending Download Authorization Requests ({pendingOwnerRequests.length})
                    </span>
                    <p className="text-emerald-800 text-[11px] mt-0.5">
                      Users with READ access have requested permission to download copies of your documents.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pendingOwnerRequests.map((req) => {
                    const reqDoc = docsWithPerms.find((d) => d.document.id === req.documentId);
                    if (!reqDoc) return null;
                    return (
                      <button
                        key={req.id}
                        onClick={() => onOpenDetails(reqDoc.document, reqDoc.effectivePermission)}
                        className="px-3 py-1.5 rounded-lg bg-[#0f392b] text-white font-bold text-xs hover:bg-[#165b44] shadow-xs"
                      >
                        Review: {req.documentTitle.substring(0, 20)}...
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending Invitations Administrator Action Banner */}
            {isAdmin && invitations.filter((i) => i.status === 'Pending').length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-950 text-white border border-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-800/80 text-emerald-200 flex items-center justify-center font-bold flex-shrink-0">
                    <Mail className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        Pending Membership Invitations ({invitations.filter((i) => i.status === 'Pending').length})
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-700 text-emerald-100 uppercase tracking-wider">
                        Admin Decision Required
                      </span>
                    </div>
                    <p className="text-emerald-300 text-[11px] mt-0.5">
                      New team members have pending invitations. As an Organisation Administrator, you can accept or reject their admission into Acme Corporation.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('invitations')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Review Invitations</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Anti-Privilege Escalation Notice */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Zero-Trust Notice for Administrators:</span> In accordance with the
                TrustVault security specification, an Organisation Administrator does not automatically receive
                document-content access (READ, preview, or download) to confidential records uploaded by members unless
                an explicit grant exists. Notice below that ungranted confidential documents display{' '}
                <strong className="text-rose-700 font-mono">NONE</strong> with access blocked.
              </div>
            </div>

            {/* Recent Documents Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Company Documents & Effective Access</h3>
                  <p className="text-xs text-slate-500">
                    Calculated server-side based on ownership, direct grants, and workspace policy.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  View All ({docsWithPerms.length})
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Document</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Your Access</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {docsWithPerms.slice(0, 5).map(({ document, effectivePermission }) => (
                      <tr
                        key={document.id}
                        onClick={() => onOpenDetails(document, effectivePermission)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-sm">
                            <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                            <span className="font-bold text-slate-900 truncate">{document.title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{document.category}</td>
                        <td className="py-3 px-4 text-slate-700">{document.ownerName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              effectivePermission === 'OWNER'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : effectivePermission === 'EDIT'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : effectivePermission === 'READ'
                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            {effectivePermission}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {effectivePermission === 'OWNER' && (
                              <button
                                onClick={() => onOpenShare(document)}
                                className="p-1.5 rounded text-slate-500 hover:text-emerald-800 hover:bg-emerald-50"
                                title="Share"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => onOpenDetails(document, effectivePermission)}
                              className="p-1.5 rounded text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                              title="Preview Content (Anti-Screenshot Protected)"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {effectivePermission === 'OWNER' && (
                              <button
                                onClick={() => setDocToDelete(document)}
                                className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                title="Delete Document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: AWS S3 BUCKET & POLICIES ==================== */}
        {activeTab === 's3_bucket' && (
          <S3BucketExplorer
            onOpenUploadToFolder={onOpenUpload}
            onOpenDetails={onOpenDetails}
            onOpenShare={onOpenShare}
          />
        )}

        {/* ==================== TAB: COMPANY DOCUMENTS ==================== */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* View Mode Toggle Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Corporate Storage Views</h3>
                <p className="text-xs text-slate-500">
                  Switch between standard tabular document list and AWS S3 bucket prefix hierarchy
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setDocumentsViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    documentsViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  onClick={() => setDocumentsViewMode('s3_explorer')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    documentsViewMode === 's3_explorer'
                      ? 'bg-[#0f392b] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                  <span>Projects & Folders</span>
                </button>
              </div>
            </div>

            {documentsViewMode === 's3_explorer' ? (
              <S3BucketExplorer
                onOpenUploadToFolder={onOpenUpload}
                onOpenDetails={onOpenDetails}
                onOpenShare={onOpenShare}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search company documents..."
                  className="w-full pl-10 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                {['All', 'Financial', 'Legal', 'Technical', 'HR'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#0f392b] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Documents Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">File Size</th>
                    <th className="py-3 px-4">Your Access</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map(({ document, effectivePermission }) => (
                    <tr
                      key={document.id}
                      onClick={() => onOpenDetails(document, effectivePermission)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-sm">
                          <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                          <span className="font-bold text-slate-900 truncate">{document.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{document.category}</td>
                      <td className="py-3 px-4 text-slate-700">{document.ownerName}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {(document.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            effectivePermission === 'OWNER'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : effectivePermission === 'EDIT'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : effectivePermission === 'READ'
                              ? 'bg-slate-100 text-slate-800 border-slate-300'
                              : 'bg-rose-100 text-rose-900 border-rose-300'
                          }`}
                        >
                          {effectivePermission}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {effectivePermission === 'OWNER' && (
                            <button
                              onClick={() => onOpenShare(document)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-800 hover:bg-emerald-50"
                              title="Manage Sharing"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onOpenDetails(document, effectivePermission)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                            title="Preview Content (Anti-Screenshot Protected)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {effectivePermission === 'OWNER' && (
                            <button
                              onClick={() => setDocToDelete(document)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )}

        {/* ==================== TAB: SHARED WITH ME ==================== */}
        {activeTab === 'shared' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Documents Shared Directly with You</h3>
              <p className="text-xs text-slate-500">
                Documents where an owner explicitly assigned you a READ or EDIT grant.
              </p>
            </div>

            {sharedDocs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No active grants currently shared with your account.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {sharedDocs.map(({ document, workspaceName, effectivePermission, grant }) => (
                  <div
                    key={document.id}
                    onClick={() => onOpenDetails(document, effectivePermission)}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{document.title}</p>
                        <p className="text-[11px] text-slate-500">
                          Owner: {document.ownerName} • {document.category} • Granted {grant?.permission || effectivePermission}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        effectivePermission === 'EDIT'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}
                    >
                      {effectivePermission}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: MEMBERS ==================== */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Invite Form (Admins only) */}
            {isAdmin ? (
              <form
                onSubmit={handleInviteSubmit}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-900">Invite New Organisation Member</h3>
                </div>

                {inviteSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{inviteSuccess}</span>
                  </div>
                )}

                {inviteError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Recipient Work Email
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 font-semibold"
                    >
                      <option value="Member">Member</option>
                      <option value="Auditor">Auditor (Audit Only)</option>
                      <option value="Admin">Organisation Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0f392b] hover:bg-[#165b44] text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    Send Invitation Token
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
                You are currently signed in as a <strong className="text-slate-800">{currentRole}</strong>. Member
                management and invitation issuance require Organisation Administrator privileges.
              </div>
            )}

            {/* Role Change Modal */}
            {memberToEdit && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-base">Modify Organisation Role</h4>
                    <button onClick={() => setMemberToEdit(null)}>
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Adjusting role for <strong className="text-slate-900">{memberToEdit.userName}</strong> (
                    {memberToEdit.userEmail}). Note: Changing role does not automatically transfer document ownership.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Role</label>
                    <select
                      value={newRoleSelection}
                      onChange={(e) => setNewRoleSelection(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="Member">Member</option>
                      <option value="Auditor">Auditor</option>
                      <option value="Admin">Organisation Administrator</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setMemberToEdit(null)}
                      className="px-3 py-1.5 text-xs rounded-lg border text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRoleChange}
                      className="px-4 py-1.5 text-xs rounded-lg bg-[#0f392b] text-white font-bold"
                    >
                      Apply Role
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Member Removal Confirmation Modal */}
            {memberToRemove && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">Confirm Member Removal</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Removing <strong className="text-slate-900">{memberToRemove.userEmail}</strong> will
                        immediately revoke their workspace membership and block all future document access. Their
                        previously uploaded documents remain intact under the workspace retention policy.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setMemberToRemove(null)}
                      className="px-3 py-1.5 text-xs rounded-lg border text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmRemoveMember}
                      className="px-4 py-1.5 text-xs rounded-lg bg-rose-700 text-white font-bold"
                    >
                      Remove Member
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Members Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Current Members ({members.length})</h3>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Name & Email</th>
                      <th className="py-3 px-4">Organisation Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Joined Date</th>
                      {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{m.userName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{m.userEmail}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              m.role === 'Admin'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : m.role === 'Auditor'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            {m.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setMemberToEdit(m);
                                  setNewRoleSelection(m.role);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                                title="Change Role"
                              >
                                <UserCog className="w-4 h-4" />
                              </button>
                              {m.userId !== currentUser?.id && (
                                <button
                                  onClick={() => setMemberToRemove(m)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                                  title="Remove Member"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: INVITATIONS ==================== */}
        {activeTab === 'invitations' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Organisation Invitations</h3>
              <p className="text-xs text-slate-500">
                Single-use cryptographically bound tokens for verified company onboarding.
              </p>
            </div>

            {/* Governance Policy Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Shield className="w-4 h-4 text-[#0f392b] flex-shrink-0" />
                <span>
                  <strong>Tenant Access Governance:</strong> Only corporate <strong>Administrators</strong> have the authority to accept or reject membership invitations into this workspace.
                </span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border self-start sm:self-auto ${
                  isAdmin
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                {isAdmin ? 'Admin Approval Authority Active' : `Your Role: ${currentRole} (Decisions Locked)`}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Token Preview</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{inv.recipientEmail}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{inv.role}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{inv.token}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                            inv.status === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : inv.status === 'Pending'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : inv.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {inv.status === 'Accepted' && <Check className="w-3 h-3 text-emerald-700" />}
                          {inv.status === 'Rejected' && <X className="w-3 h-3 text-rose-700" />}
                          {inv.status === 'Pending' && <Clock className="w-3 h-3 text-amber-700" />}
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status === 'Pending' ? (
                            <>
                              {isAdmin ? (
                                <>
                                  <button
                                    onClick={() => handleAdminAcceptInvitation(inv.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shadow-xs transition-colors"
                                    title="Accept invitation and admit user to workspace"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Accept</span>
                                  </button>
                                  <button
                                    onClick={() => handleAdminRejectInvitation(inv.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-[11px] shadow-xs transition-colors"
                                    title="Reject invitation"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium italic mr-1">
                                  Admin Decision Required
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    `${window.location.origin}/corporate/accept-invitation?token=${inv.token}`
                                  );
                                  alert('Invitation URL copied to clipboard!');
                                }}
                                className="p-1 rounded text-slate-500 hover:text-emerald-800 hover:bg-emerald-50"
                                title="Copy invitation link"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleRevokeInvitation(inv.id)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                                  title="Revoke invitation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {inv.status === 'Accepted' && 'Admitted'}
                              {inv.status === 'Rejected' && 'Rejected by Admin'}
                              {inv.status === 'Revoked' && 'Revoked'}
                              {inv.status === 'Expired' && 'Expired'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB: AUDIT & ACTIVITY ==================== */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Immutable Compliance & Audit Log</h3>
                <p className="text-xs text-slate-500">
                  Chronological record of logins, uploads, permission grants, and denied authorization checks.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={auditOutcomeFilter}
                  onChange={(e) => setAuditOutcomeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  <option value="All">All Outcomes</option>
                  <option value="SUCCESS">SUCCESS Only</option>
                  <option value="DENIED">DENIED Only</option>
                  <option value="FAILED">FAILED Only</option>
                </select>

                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  <option value="All">All Actions</option>
                  <option value="AUTH_LOGIN">AUTH_LOGIN</option>
                  <option value="DOC_UPLOAD">DOC_UPLOAD</option>
                  <option value="PERMISSION_GRANT">PERMISSION_GRANT</option>
                  <option value="ACCESS_DENIED">ACCESS_DENIED</option>
                  <option value="MEMBER_INVITE">MEMBER_INVITE</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
              {filteredAuditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        {log.outcome}
                      </span>
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="text-slate-500">by {log.actorName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({log.actorEmail})</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                    <div className="text-[10px] text-slate-400">
                      Resource: {log.resourceType} #{log.resourceId} ({log.resourceName})
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB: SETTINGS ==================== */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 max-w-xl">
            <div>
              <h3 className="text-base font-bold text-slate-900">Workspace Governance Settings</h3>
              <p className="text-xs text-slate-500">
                Tenant parameters and configuration options for {currentWorkspace?.name}.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Organisation Name
                </label>
                <input
                  type="text"
                  disabled
                  value={currentWorkspace?.name || ''}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Workspace Unique Slug
                </label>
                <input
                  type="text"
                  disabled
                  value={currentWorkspace?.slug || ''}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 font-mono"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>Tenant Boundary Isolation</span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Documents are partitioned by Workspace ID at the SQL layer. Users from external organisations cannot
                  discover or query documents across workspace boundaries.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">Delete company document?</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900">{docToDelete.title}</strong>? As the document owner, this will permanently remove the document from Acme Corporation and revoke all team access grants.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDoc}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
