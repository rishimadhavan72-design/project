import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  Edit,
  Trash2,
  Upload,
  Plus,
  ChevronRight,
  HardDrive,
  Check,
  Copy,
  Info,
  Users,
  Layers,
  Database,
  Search,
  ExternalLink,
  X,
  FileCode,
  Image as ImageIcon,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  DocumentItem,
  DocumentPermissionLevel,
  FolderPermissionPolicy,
  OrganisationMember,
} from '../types/trustvault';
import { trustVaultStore } from '../services/trustvault-store';

interface S3BucketExplorerProps {
  onOpenUploadToFolder?: (folderPath: string) => void;
  onOpenDetails: (doc: DocumentItem, perm: DocumentPermissionLevel) => void;
  onOpenShare?: (doc: DocumentItem) => void;
}

export const S3BucketExplorer: React.FC<S3BucketExplorerProps> = ({
  onOpenUploadToFolder,
  onOpenDetails,
}) => {
  const currentUser = trustVaultStore.getCurrentUser();
  const currentWorkspace = trustVaultStore.getCurrentWorkspace();
  const currentRole = trustVaultStore.getActiveWorkspaceRole();
  const members = trustVaultStore.getMembersForCurrentWorkspace();

  const [currentFolder, setCurrentFolder] = useState<string>(''); // '' means root
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderForPolicy, setSelectedFolderForPolicy] = useState<string | null>(null);

  // Policy Modal State
  const [policyGranteeEmail, setPolicyGranteeEmail] = useState('');
  const [policyGranteeName, setPolicyGranteeName] = useState('');
  const [policyMode, setPolicyMode] = useState<'TOTAL_FOLDER' | 'SELECTIVE_ITEMS'>('TOTAL_FOLDER');
  const [policyPermission, setPolicyPermission] = useState<'READ' | 'EDIT'>('READ');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [policyMessage, setPolicyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedPolicyJson, setCopiedPolicyJson] = useState(false);

  // New folder creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const bucketName = currentWorkspace?.type === 'corporate'
    ? 'acme-corporate-vault'
    : `${currentWorkspace?.slug || 'my'}-vault`;

  const allDocsWithPerms = trustVaultStore.getDocumentsForCurrentWorkspace();
  const folderPolicies = trustVaultStore.getFolderPoliciesForCurrentWorkspace();

  // All folders in workspace
  const folderStats = trustVaultStore.getFoldersInCurrentWorkspace();

  // Filter documents in the currently active folder
  const docsInFolder = allDocsWithPerms.filter(({ document }) => {
    const docFolder = (document.folderPath || '').replace(/^\/+|\/+$/g, '').trim().toLowerCase();
    const currentClean = currentFolder.replace(/^\/+|\/+$/g, '').trim().toLowerCase();
    
    // In root, matches if doc has no folder or is in root
    if (!currentClean) {
      return !docFolder || docFolder === 'root';
    }
    return docFolder === currentClean;
  });

  // Filtered by search if any
  const filteredDocs = docsInFolder.filter(({ document }) => {
    if (!searchQuery) return true;
    return (
      document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      document.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (document.s3Key && document.s3Key.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Calculate folder statistics
  const totalBucketObjects = allDocsWithPerms.length;
  const totalBucketBytes = allDocsWithPerms.reduce((acc, curr) => acc + (curr.document.fileSizeBytes || 0), 0);

  // Policy modal openers
  const openPolicyModal = (folderPath: string) => {
    setSelectedFolderForPolicy(folderPath);
    setPolicyGranteeEmail(members.find((m) => m.userId !== currentUser?.id)?.userEmail || '');
    setPolicyGranteeName(members.find((m) => m.userId !== currentUser?.id)?.userName || '');
    setPolicyMode('TOTAL_FOLDER');
    setPolicyPermission('READ');
    setPolicyMessage(null);

    // Preselect all docs in this folder for selective items mode
    const docsInTarget = allDocsWithPerms
      .filter(({ document }) => (document.folderPath || '').toLowerCase() === folderPath.toLowerCase())
      .map(({ document }) => document.id);
    setSelectedDocIds(docsInTarget.slice(0, 1)); // Default select 1 item for demonstration
  };

  const handleToggleDocSelect = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocsInFolder = () => {
    if (!selectedFolderForPolicy) return;
    const allIds = allDocsWithPerms
      .filter(({ document }) => (document.folderPath || '').toLowerCase() === selectedFolderForPolicy.toLowerCase())
      .map(({ document }) => document.id);
    setSelectedDocIds(allIds);
  };

  const handleDeselectAllDocs = () => {
    setSelectedDocIds([]);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderForPolicy || !policyGranteeEmail) {
      setPolicyMessage({ type: 'error', text: 'Grantee email is required.' });
      return;
    }

    if (policyMode === 'SELECTIVE_ITEMS' && selectedDocIds.length === 0) {
      setPolicyMessage({
        type: 'error',
        text: 'Selective Items mode requires selecting at least one document.',
      });
      return;
    }

    try {
      trustVaultStore.saveFolderPolicy(
        selectedFolderForPolicy,
        policyGranteeEmail,
        policyGranteeName,
        policyPermission,
        policyMode,
        policyMode === 'SELECTIVE_ITEMS' ? selectedDocIds : undefined
      );

      setPolicyMessage({
        type: 'success',
        text: `AWS S3 bucket policy updated for prefix "${selectedFolderForPolicy}/*"! Access granted to ${policyGranteeEmail}.`,
      });
      setTimeout(() => {
        setPolicyMessage(null);
      }, 4000);
    } catch (err: any) {
      setPolicyMessage({ type: 'error', text: err.message || 'Failed to save folder policy.' });
    }
  };

  const handleDeletePolicy = (policyId: string) => {
    try {
      trustVaultStore.deleteFolderPolicy(policyId);
      setPolicyMessage({ type: 'success', text: 'Folder policy revoked successfully.' });
      setTimeout(() => setPolicyMessage(null), 3000);
    } catch (err: any) {
      setPolicyMessage({ type: 'error', text: err.message || 'Failed to delete policy.' });
    }
  };

  // Generate AWS IAM S3 Bucket Policy JSON preview
  const generateAwsPolicyJson = (folderPath: string) => {
    const clean = folderPath.replace(/^\/+|\/+$/g, '').trim();
    const actions = policyPermission === 'EDIT'
      ? ['s3:GetObject', 's3:PutObject', 's3:DeleteObject']
      : ['s3:GetObject'];

    let resources: string[];
    if (policyMode === 'TOTAL_FOLDER') {
      resources = [`arn:aws:s3:::${bucketName}/${clean}/*`];
    } else {
      const selectedDocs = allDocsWithPerms
        .filter(({ document }) => selectedDocIds.includes(document.id))
        .map(({ document }) => `arn:aws:s3:::${bucketName}/${clean}/${document.originalFilename}`);
      resources = selectedDocs.length > 0 ? selectedDocs : [`arn:aws:s3:::${bucketName}/${clean}/[selective-items-selected]`];
    }

    return JSON.stringify(
      {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: `TrustVaultFolderPolicy_${clean.toUpperCase()}`,
            Effect: 'Allow',
            Principal: {
              AWS: `arn:aws:iam::trustvault-tenant:user/${policyGranteeEmail || 'viewer@company.com'}`,
            },
            Action: actions,
            Resource: resources,
            Condition: {
              StringEquals: {
                's3:x-amz-server-side-encryption': 'AES256',
              },
            },
          },
        ],
      },
      null,
      2
    );
  };

  const copyAwsPolicy = (json: string) => {
    navigator.clipboard.writeText(json);
    setCopiedPolicyJson(true);
    setTimeout(() => setCopiedPolicyJson(false), 2500);
  };

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFolderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!clean) return;
    setIsCreatingFolder(false);
    setNewFolderName('');
    setCurrentFolder(clean);
  };

  // Policies for currently opened folder modal
  const activeFolderPolicies = selectedFolderForPolicy
    ? folderPolicies.filter(
        (p) => p.folderPath.toLowerCase() === selectedFolderForPolicy.toLowerCase()
      )
    : [];

  const targetDocsForSelection = selectedFolderForPolicy
    ? allDocsWithPerms.filter(
        ({ document }) => (document.folderPath || '').toLowerCase() === selectedFolderForPolicy.toLowerCase()
      )
    : [];

  const canManagePolicies = currentRole === 'Admin' || currentRole === 'Member';

  return (
    <div className="space-y-6">
      {/* Top AWS S3 Bucket Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0f392b] text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
                  AWS S3 Standard
                </span>
                <span className="text-xs text-slate-300 font-mono">us-east-1 (AES-256 SSE)</span>
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Bucket Policy Enforced
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
                <HardDrive className="w-5 h-5 text-amber-400" />
                s3://{bucketName}/
              </h2>
              <p className="text-xs text-slate-300">
                Hierarchical folder prefixes with IAM bucket policies. Grant granular read/edit access to full folders or individual items.
              </p>
            </div>

            {/* Storage Metrics */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Objects</p>
                <p className="text-base font-extrabold text-white font-mono">{totalBucketObjects}</p>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Total Size</p>
                <p className="text-base font-extrabold text-emerald-300 font-mono">
                  {(totalBucketBytes / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">S3 Policies</p>
                <p className="text-base font-extrabold text-amber-300 font-mono">{folderPolicies.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb Path & Navigation Bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 font-semibold">URI:</span>
            <button
              onClick={() => setCurrentFolder('')}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 font-bold ${
                !currentFolder
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-500" />
              <span>s3://{bucketName}</span>
            </button>

            {currentFolder && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                  {currentFolder}/*
                </span>
              </>
            )}
          </div>

          {/* Quick Actions in current prefix */}
          <div className="flex items-center gap-2">
            {currentFolder && (
              <button
                onClick={() => setCurrentFolder('')}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium transition-colors"
              >
                ← Back to Bucket Root
              </button>
            )}

            {currentFolder && canManagePolicies && (
              <button
                onClick={() => openPolicyModal(currentFolder)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 text-xs font-bold transition-colors shadow-xs"
              >
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                <span>Folder Policy ({folderPolicies.filter((p) => p.folderPath.toLowerCase() === currentFolder.toLowerCase()).length})</span>
              </button>
            )}

            {onOpenUploadToFolder && (
              <button
                onClick={() => onOpenUploadToFolder(currentFolder || 'general')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f392b] text-white hover:bg-[#165b44] text-xs font-bold transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-300" />
                <span>Upload to {currentFolder ? `/${currentFolder}` : 'Bucket'}</span>
              </button>
            )}

            <button
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>New Folder Prefix</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Folder Modal / Prompt */}
      {isCreatingFolder && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 animate-in fade-in">
          <form onSubmit={handleCreateNewFolder} className="flex-1 flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-900">s3://{bucketName}/</span>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. audit-reports or contracts-2026"
              className="px-3 py-1.5 text-xs font-mono border border-amber-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 w-64"
            />
            <span className="text-xs font-mono text-amber-800">/*</span>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700"
            >
              Create Prefix
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs hover:bg-slate-300"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Folders Overview Grid (Visible at Root or as Directory Cards) */}
      {!currentFolder && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-500" />
              <span>S3 Directory Prefixes ({folderStats.length} Folders)</span>
            </h3>
            <span className="text-xs text-slate-500">
              Click a folder to view objects and configure AWS S3 access policies
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {folderStats.map((f) => {
              const activePolCount = folderPolicies.filter(
                (p) => p.folderPath.toLowerCase() === f.folderPath.toLowerCase()
              ).length;

              return (
                <div
                  key={f.folderPath}
                  className="bg-white rounded-xl border border-slate-200/90 hover:border-amber-400 p-4 shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {activePolCount > 0 ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {activePolCount} {activePolCount === 1 ? 'Policy' : 'Policies'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Default (Owner/Admin)
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-mono font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                        {f.folderPath}/
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        s3://{bucketName}/{f.folderPath}/*
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 pt-1 border-t border-slate-100 font-medium">
                      <span>{f.objectCount} {f.objectCount === 1 ? 'Object' : 'Objects'}</span>
                      <span>•</span>
                      <span>{(f.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
                    <button
                      onClick={() => setCurrentFolder(f.folderPath)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>Browse Objects</span>
                    </button>

                    {canManagePolicies && (
                      <button
                        onClick={() => openPolicyModal(f.folderPath)}
                        title="Configure S3 Policy for this folder"
                        className="py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-colors flex items-center justify-center"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-700" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Document Objects in Current Prefix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Objects in {currentFolder ? `s3://${bucketName}/${currentFolder}/*` : `Bucket Root (${filteredDocs.length} Objects)`}
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter objects by key or title..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">No objects found in this S3 prefix</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload files or entire folders to store encrypted objects under this prefix.
              </p>
            </div>
            {onOpenUploadToFolder && (
              <button
                onClick={() => onOpenUploadToFolder(currentFolder || 'general')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0f392b] text-white text-xs font-bold hover:bg-[#165b44]"
              >
                <Upload className="w-4 h-4 text-emerald-300" />
                <span>Upload Object to This Prefix</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Object Name & S3 Key</th>
                  <th className="px-4 py-3">Format / Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Storage Class</th>
                  <th className="px-4 py-3">Owner / Access</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {filteredDocs.map(({ document, effectivePermission }) => {
                  const isImage =
                    document.contentType?.startsWith('image/') ||
                    document.fileDataUrl?.startsWith('data:image/') ||
                    /\.(jpe?g|png|webp|gif|svg)$/i.test(document.originalFilename);

                  const s3Uri =
                    document.s3Key ||
                    `s3://${bucketName}/${document.folderPath ? document.folderPath + '/' : ''}${document.originalFilename}`;

                  return (
                    <tr key={document.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isImage ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{document.title}</span>
                              {effectivePermission === 'OWNER' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                  OWNER
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                              <span>{s3Uri}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-slate-100 text-slate-800 border border-slate-200">
                          {document.originalFilename.split('.').pop()?.toUpperCase() || 'FILE'}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono">
                        {(document.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Lock className="w-3 h-3 text-emerald-600" />
                          STANDARD (SSE-S3)
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">{document.ownerName}</div>
                        <div className="text-[10px] text-slate-400">{document.ownerEmail}</div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenDetails(document, effectivePermission)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-bold text-xs flex items-center gap-1"
                            title="Preview secure document content"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* S3 FOLDER POLICY MODAL: Total Folder vs Selective Items */}
      {selectedFolderForPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0f392b] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center">
                  <Shield className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">AWS S3 Bucket & Folder Policy</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold">
                      s3://{bucketName}/{selectedFolderForPolicy}/*
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Define who can access this folder, and choose between Total Folder access or Selective Item permissions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFolderForPolicy(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {policyMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    policyMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                      : 'bg-rose-50 border-rose-300 text-rose-900 font-medium'
                  }`}
                >
                  {policyMessage.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{policyMessage.text}</span>
                </div>
              )}

              {/* Policy Creation Form */}
              <form onSubmit={handleSavePolicy} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>Configure New Policy Statement</span>
                </h4>

                {/* Grantee Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Grantee / Member
                    </label>
                    <select
                      value={policyGranteeEmail}
                      onChange={(e) => {
                        setPolicyGranteeEmail(e.target.value);
                        const m = members.find((mem) => mem.userEmail === e.target.value);
                        if (m) setPolicyGranteeName(m.userName);
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Select Workspace Member or enter custom --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.userEmail}>
                          {m.userName} ({m.userEmail}) — {m.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Grantee Email / Principal ARN
                    </label>
                    <input
                      type="email"
                      required
                      value={policyGranteeEmail}
                      onChange={(e) => setPolicyGranteeEmail(e.target.value)}
                      placeholder="e.g. auditor@company.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Permission Level (READ vs EDIT) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Permission Level (Owner Decision)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      onClick={() => setPolicyPermission('READ')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${
                        policyPermission === 'READ'
                          ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Eye className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold">READ (s3:GetObject)</p>
                        <p className="text-[11px] text-slate-500 font-normal">
                          Can view encrypted document previews and request native download
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setPolicyPermission('EDIT')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${
                        policyPermission === 'EDIT'
                          ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Edit className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold">EDIT (s3:PutObject & Edit)</p>
                        <p className="text-[11px] text-slate-500 font-normal">
                          Can edit document metadata, body content, and update S3 key attributes
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Policy Mode: TOTAL_FOLDER vs SELECTIVE_ITEMS */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Policy Scope (Total Folder vs. Selective Items)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Option 1: TOTAL_FOLDER */}
                    <div
                      onClick={() => setPolicyMode('TOTAL_FOLDER')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        policyMode === 'TOTAL_FOLDER'
                          ? 'border-[#0f392b] bg-emerald-50/60 ring-2 ring-emerald-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-slate-900">Total Folder Access</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                        Grants access to <strong>all items</strong> in prefix <code className="text-emerald-800 font-mono">s3://{bucketName}/{selectedFolderForPolicy}/*</code>. Any newly added files in this folder will automatically inherit this permission.
                      </p>
                    </div>

                    {/* Option 2: SELECTIVE_ITEMS */}
                    <div
                      onClick={() => setPolicyMode('SELECTIVE_ITEMS')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        policyMode === 'SELECTIVE_ITEMS'
                          ? 'border-[#0f392b] bg-emerald-50/60 ring-2 ring-emerald-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold text-slate-900">Selective Items Access</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                        Owner selectively clicks which specific files in this folder to allow. All unselected files in this folder remain strictly blocked (403 Forbidden).
                      </p>
                    </div>
                  </div>

                  {/* If SELECTIVE_ITEMS mode, show interactive document checklist! */}
                  {policyMode === 'SELECTIVE_ITEMS' && (
                    <div className="p-3.5 bg-white rounded-xl border border-slate-300 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-emerald-700" />
                          <span>Select allowed documents ({selectedDocIds.length} of {targetDocsForSelection.length} selected):</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllDocsInFolder}
                            className="text-[11px] text-emerald-700 font-bold hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={handleDeselectAllDocs}
                            className="text-[11px] text-slate-500 font-bold hover:underline"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      {targetDocsForSelection.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          No documents currently in this folder. Upload items first to grant selective access.
                        </p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 pr-1">
                          {targetDocsForSelection.map(({ document }) => {
                            const isChecked = selectedDocIds.includes(document.id);
                            return (
                              <div
                                key={document.id}
                                onClick={() => handleToggleDocSelect(document.id)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                  isChecked ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  )}
                                  <div className="truncate">
                                    <p className="text-xs truncate">{document.title}</p>
                                    <p className="text-[10px] text-slate-400 font-mono truncate">{document.originalFilename}</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex-shrink-0">
                                  {(document.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Save Policy Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0f392b] text-white hover:bg-[#165b44] text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Apply Policy Statement</span>
                  </button>
                </div>
              </form>

              {/* Existing Active Policies on this Folder */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>Existing Policies for {selectedFolderForPolicy}/* ({activeFolderPolicies.length})</span>
                </h4>

                {activeFolderPolicies.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                    No active S3 policies for this prefix yet. Only Workspace Admins and document Owners have access.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeFolderPolicies.map((pol) => (
                      <div
                        key={pol.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{pol.granteeEmail}</span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                pol.permission === 'EDIT'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              {pol.permission}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {pol.mode === 'TOTAL_FOLDER'
                                ? 'TOTAL_FOLDER (All items)'
                                : `SELECTIVE_ITEMS (${pol.allowedDocumentIds?.length || 0} allowed)`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Prefix: s3://{bucketName}/{pol.folderPath}/* • Granted: {new Date(pol.grantedAt).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDeletePolicy(pol.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition-colors text-xs flex items-center gap-1 font-semibold"
                          title="Revoke S3 Policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AWS S3 IAM Policy JSON Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-900">AWS IAM S3 Policy Preview (JSON)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyAwsPolicy(generateAwsPolicyJson(selectedFolderForPolicy))}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors"
                  >
                    {copiedPolicyJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy AWS Policy JSON</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
                  <pre>{generateAwsPolicyJson(selectedFolderForPolicy)}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedFolderForPolicy(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
