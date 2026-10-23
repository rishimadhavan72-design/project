import React, { useState } from 'react';
import {
  Lock,
  FileText,
  Upload,
  Search,
  Filter,
  Share2,
  Clock,
  HardDrive,
  Eye,
  Shield,
  Layers,
  Activity,
  Settings,
  FolderLock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  FolderTree,
} from 'lucide-react';
import { DocumentItem, DocumentPermissionLevel } from '../types/trustvault';
import { trustVaultStore } from '../services/trustvault-store';
import { S3BucketExplorer } from './S3BucketExplorer';

interface PersonalDashboardProps {
  navigate: (route: string) => void;
  onOpenUpload: () => void;
  onOpenDetails: (doc: DocumentItem, perm: DocumentPermissionLevel) => void;
  onOpenShare: (doc: DocumentItem) => void;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({
  navigate,
  onOpenUpload,
  onOpenDetails,
  onOpenShare,
}) => {
  const [, setDashTick] = useState(0);
  React.useEffect(() => {
    return trustVaultStore.subscribe(() => {
      setDashTick((t) => t + 1);
    });
  }, []);

  const currentUser = trustVaultStore.getCurrentUser();
  const currentWorkspace = trustVaultStore.getCurrentWorkspace();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 's3_bucket' | 'shared' | 'activity' | 'settings'
  >('overview');
  const [documentsViewMode, setDocumentsViewMode] = useState<'table' | 's3_explorer'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Account settings form
  const [nameInput, setNameInput] = useState(currentUser?.fullName || '');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);

  const confirmDeleteDoc = () => {
    if (!docToDelete) return;
    trustVaultStore.deleteDocument(docToDelete.id);
    setDocToDelete(null);
  };

  React.useEffect(() => {
    if (currentUser) {
      setNameInput(currentUser.fullName);
    }
  }, [currentUser]);

  const docsWithPerms = trustVaultStore.getDocumentsForCurrentWorkspace();
  const sharedDocs = trustVaultStore.getSharedWithMeDocuments();
  const auditLogs = trustVaultStore.getAuditEvents(true);
  const pendingOwnerRequests = trustVaultStore.getPendingDownloadRequestsForOwner();

  // Filtered documents
  const filteredDocs = docsWithPerms.filter(({ document }) => {
    const matchesSearch =
      document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      document.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || document.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalBytes = docsWithPerms.reduce((acc, curr) => acc + curr.document.fileSizeBytes, 0);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      currentUser.fullName = nameInput;
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-5 flex flex-col justify-between shadow-xs">
        <div className="space-y-6">
          {/* Workspace Badge */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
              <FolderLock className="w-4 h-4 text-emerald-700" />
              <span className="truncate">{currentWorkspace?.name || 'Personal Vault'}</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">Private zero-knowledge storage</p>
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
                <span>My Documents</span>
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
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
                activeTab === 'activity'
                  ? 'bg-[#0f392b] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Vault Activity</span>
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
              <span>Account Settings</span>
            </button>
          </nav>
        </div>

        {/* Corporate Workspace Link */}
        <div className="pt-4 border-t border-slate-200 mt-6 space-y-2">
          <div className="text-[11px] text-slate-500 font-medium">Need enterprise collaboration?</div>
          <button
            onClick={() => navigate('/corporate/login')}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Switch to Corporate
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Personal Vault</span>
              <span>/</span>
              <span className="capitalize text-slate-800 font-semibold">{activeTab}</span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h1 className="text-2xl font-extrabold text-slate-900">
                Welcome, {currentUser?.fullName || 'User'}
              </h1>
              {currentUser?.isEmailVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <Shield className="w-3 h-3 text-emerald-700" />
                  Verified Identity
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <AlertCircle className="w-3 h-3 text-amber-700" />
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

        {/* Unverified Email Warning Banner */}
        {currentUser && !currentUser.isEmailVerified && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Email Authentication Required
                </h4>
                <p className="text-xs text-amber-900 mt-0.5">
                  Your email (<span className="font-mono font-semibold">{currentUser.email}</span>) has not yet completed cryptographic verification. Document downloads and zero-knowledge encryption require an authenticated email.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/personal/verify-email?email=${encodeURIComponent(currentUser.email)}`)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              Verify Email Now
            </button>
          </div>
        )}

        {/* ==================== TAB: OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Authorised Documents
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2 block">
                  {docsWithPerms.length}
                </span>
                <span className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  100% Private to you
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Storage Consumed
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2 block">
                  {(totalBytes / (1024 * 1024)).toFixed(1)} <span className="text-lg text-slate-500">MB</span>
                </span>
                <span className="text-xs text-slate-500 font-medium mt-1">Encrypted outside web root</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Shared with Me
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2 block">
                  {sharedDocs.length}
                </span>
                <span className="text-xs text-blue-700 font-semibold mt-1">Cross-workspace grants</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Security Integrity
                </span>
                <span className="text-3xl font-extrabold text-emerald-800 mt-2 block">AES-256</span>
                <span className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Zero-Knowledge Active
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

            {/* Recent Documents Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Your Private Vault Records</h3>
                  <p className="text-xs text-slate-500">
                    Documents are private by default. Only you hold OWNER access.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  View All ({docsWithPerms.length})
                </button>
              </div>

              {docsWithPerms.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No documents in your vault. Click &quot;Upload Document&quot; to begin.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {docsWithPerms.slice(0, 5).map(({ document, effectivePermission }) => (
                    <div
                      key={document.id}
                      onClick={() => onOpenDetails(document, effectivePermission)}
                      className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">{document.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {document.category} • {(document.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • Updated{' '}
                            {new Date(document.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {effectivePermission}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenShare(document);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails(document, effectivePermission);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50"
                          title="Preview Content"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {effectivePermission === 'OWNER' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocToDelete(document);
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Mini-Feed */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Recent Vault Activity</h3>
                <button
                  onClick={() => setActiveTab('activity')}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  View Audit History
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {auditLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between text-xs gap-3">
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.outcome === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span>{log.action}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
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

        {/* ==================== TAB: MY DOCUMENTS ==================== */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* View Mode Toggle Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Personal Storage Views</h3>
                <p className="text-xs text-slate-500">
                  Switch between tabular document list and AWS S3 bucket prefix hierarchy
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
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vault documents..."
                  className="w-full pl-10 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                {['All', 'Personal', 'Financial', 'Legal', 'Technical', 'HR'].map((cat) => (
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

            {/* Document Table */}
            {filteredDocs.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No documents match your query.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Document Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Your Access</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocs.map(({ document, effectivePermission }) => (
                      <tr
                        key={document.id}
                        onClick={() => onOpenDetails(document, effectivePermission)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-md">
                            <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                            <span className="font-bold text-slate-900 truncate">{document.title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{document.category}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {(document.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300"
                            title="You own this document (OWNER)"
                          >
                            {effectivePermission}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenShare(document)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-800 hover:bg-emerald-50"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onOpenDetails(document, effectivePermission)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                              title="Preview Document Content (Anti-Screenshot Protected)"
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
            )}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: SHARED WITH ME ==================== */}
        {activeTab === 'shared' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Documents Shared with You</h3>
              <p className="text-xs text-slate-500">
                Cross-workspace or peer documents where you have been granted explicit READ or EDIT access.
              </p>
            </div>

            {sharedDocs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No external documents are currently shared with your personal account.
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
                          From: {document.ownerName} ({workspaceName}) • Granted {grant?.permission || effectivePermission}
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

        {/* ==================== TAB: ACTIVITY ==================== */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Personal Vault Activity Trail</h3>
              <p className="text-xs text-slate-500">
                Chronological security log of all uploads, downloads, sharing grants, and access checks.
              </p>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start justify-between text-xs gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          log.outcome === 'SUCCESS' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        {log.outcome}
                      </span>
                      <span>{log.action}</span>
                      <span className="text-slate-400 font-normal">• {log.resourceType}: {log.resourceName}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
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
              <h3 className="text-base font-bold text-slate-900">Account Security & Settings</h3>
              <p className="text-xs text-slate-500">
                Configure your display identity and review active master authentication parameters.
              </p>
            </div>

            {settingsSaved && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Profile updated successfully.</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address (Primary Identity)
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.email || ''}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-mono"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  <span>Zero-Knowledge Keyring Status</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Your encryption keys are derived on the fly from your master passphrase. Server operators never store
                  or inspect your master password.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0f392b] hover:bg-[#165b44] text-white font-bold shadow-xs transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </form>
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
              <h4 className="text-base font-extrabold text-slate-900">Delete this document?</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900">{docToDelete.title}</strong>? As the owner, deleting will permanently remove this file, its storage keys, and revoke all shared access.
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
