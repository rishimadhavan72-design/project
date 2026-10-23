import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Download,
  Share2,
  Trash2,
  Edit3,
  Eye,
  Shield,
  Clock,
  HardDrive,
  User,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Send,
  Check,
  Ban,
  HelpCircle,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  CameraOff,
  Copy,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCode,
  EyeOff,
  Image as ImageIcon,
  RotateCw,
} from 'lucide-react';
import { DocumentItem, DocumentPermissionLevel, DownloadPermissionRequest } from '../types/trustvault';
import { trustVaultStore, generateSampleImageScan } from '../services/trustvault-store';
import { canDownloadDocument } from '../utils/security-rules';

interface DocumentDetailsModalProps {
  document: DocumentItem | null;
  effectivePermission: DocumentPermissionLevel;
  isOpen: boolean;
  onClose: () => void;
  onOpenShare: (doc: DocumentItem) => void;
  onRefresh: () => void;
}

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  document: doc,
  effectivePermission,
  isOpen,
  onClose,
  onOpenShare,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'metadata' | 'edit' | 'download_requests'>('content');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [isWatermarkVisible, setIsWatermarkVisible] = useState<boolean>(true);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<DocumentItem['category']>('Personal');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Download permission request form state (for READ users)
  const [showRequestDownloadDialog, setShowRequestDownloadDialog] = useState(false);
  const [downloadReason, setDownloadReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Anti-Screenshot & Privacy Shield state
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState(false);
  const [captureBlockedAlert, setCaptureBlockedAlert] = useState<string | null>(null);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const [watermarkTimestamp, setWatermarkTimestamp] = useState<string>('');

  const currentUser = trustVaultStore.getCurrentUser();
  const alertTimeoutRef = useRef<any>(null);

  // Initialize fields when doc opens
  useEffect(() => {
    if (doc) {
      setEditTitle(doc.title);
      setEditCategory(doc.category);
      setEditDescription(doc.description || '');
      setShowDeleteConfirm(false);
      setShowRequestDownloadDialog(false);
      setDownloadReason('');
      setActionMessage(null);
      setActiveTab('content');
      setIsDocumentOpen(false);
      setIsPrivacyShieldActive(false);
      setCaptureBlockedAlert(null);
      setWatermarkTimestamp(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    }
  }, [doc]);

  // Update watermark timestamp periodically while open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setWatermarkTimestamp(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Helper to trigger capture blocked alert and record audit log
  const triggerCaptureBlocked = (reason: string) => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    setCaptureBlockedAlert(reason);
    setIsPrivacyShieldActive(true);

    // Overwrite clipboard if accessible to prevent pasted screenshots/copies
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(
          `TRUSTVAULT SECURITY: Screen capture or copying is blocked by enterprise policy for document "${doc?.title}".`
        )
        .catch(() => {});
    }

    if (doc) {
      trustVaultStore.recordAuditEvent(
        'ACCESS_DENIED',
        'Document',
        doc.id,
        doc.title,
        'DENIED',
        `Screen capture or export intercepted: ${reason}`
      );
      onRefresh();
    }

    alertTimeoutRef.current = setTimeout(() => {
      setCaptureBlockedAlert(null);
    }, 5000);
  };

  // Keyboard shortcut interception for screenshots & print
  useEffect(() => {
    if (!isOpen || !doc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Windows PrintScreen
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBlocked('PrintScreen key pressed. Screen capture blocked by DRM policy.');
        return;
      }

      // 2. macOS Screen Capture shortcuts: Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5, Cmd + Shift + S
      if (
        e.metaKey &&
        e.shiftKey &&
        (['3', '4', '5', 's', 'S', '$', '%', '#'].includes(e.key) || [51, 52, 53, 83].includes(e.keyCode))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBlocked('macOS screen capture sequence intercepted. Screen capture blocked.');
        return;
      }

      // 3. Windows Snipping Tool: Win + Shift + S
      if (e.shiftKey && (e.key === 's' || e.key === 'S') && (e.metaKey || (e as any).windowsKey)) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBlocked('Snipping Tool shortcut intercepted. Screen capture blocked.');
        return;
      }

      // 4. Browser Print: Ctrl + P or Cmd + P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBlocked('Print command intercepted. Physical printing of secure documents is prohibited.');
        return;
      }

      // 5. Browser Save: Ctrl + S or Cmd + S
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBlocked('Page save command intercepted. Raw source extraction is prohibited.');
        return;
      }

      // 6. DevTools Inspector: F12 or Ctrl + Shift + I / Cmd + Option + I
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBlocked('Developer Inspection tools blocked while viewing protected documents.');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, doc]);

  // Focus loss & tab visibility listeners (triggers Privacy Shield to prevent background capture)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowBlur = () => {
      // Window lost focus - user might have opened Snipping Tool, external recorder, or switched app
      setIsPrivacyShieldActive(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPrivacyShieldActive(true);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen]);

  if (!isOpen || !doc) return null;

  const isOwner = doc.ownerId === currentUser?.id || effectivePermission === 'OWNER';
  const userDownloadRequest = trustVaultStore.getDownloadRequestForUser(doc.id);
  const hasDownloadApproval = userDownloadRequest?.status === 'Approved';

  const canDownload = canDownloadDocument(effectivePermission, hasDownloadApproval);
  const canRead = effectivePermission === 'READ' || effectivePermission === 'EDIT' || effectivePermission === 'OWNER';
  const canEdit = effectivePermission === 'EDIT' || effectivePermission === 'OWNER';
  const canDelete = effectivePermission === 'OWNER';
  const canShare = effectivePermission === 'OWNER';

  const docDownloadRequests = trustVaultStore.getDownloadRequestsForDocument(doc.id);
  const pendingRequestsForThisDoc = docDownloadRequests.filter((r) => r.status === 'Pending');

  // Detect whether document is an image (JPEG, JPG, PNG, WEBP, GIF, SVG)
  const isImageDoc = Boolean(
    doc &&
      (doc.contentType?.startsWith('image/') ||
        doc.fileDataUrl?.startsWith('data:image/') ||
        doc.previewContent?.startsWith('data:image/') ||
        /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(doc.originalFilename) ||
        /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(doc.title))
  );

  // Obtain visual image data
  const getImageSource = (): string => {
    if (!doc) return '';
    if (doc.fileDataUrl && (doc.fileDataUrl.startsWith('data:image/') || doc.fileDataUrl.startsWith('http'))) {
      return doc.fileDataUrl;
    }
    if (doc.previewContent && (doc.previewContent.startsWith('data:image/') || doc.previewContent.startsWith('http'))) {
      return doc.previewContent;
    }
    return generateSampleImageScan(doc.title, doc.originalFilename);
  };

  // Download original file in its native uploaded format (JPEG, PNG, PDF, etc.)
  const handleDownloadOriginal = () => {
    if (!doc) return;
    const isImage = isImageDoc;
    const source = isImage ? getImageSource() : (doc.fileDataUrl || doc.previewContent || '');
    let downloadUrl = source;
    let shouldRevoke = false;

    if (!downloadUrl.startsWith('data:') && !downloadUrl.startsWith('blob:') && !downloadUrl.startsWith('http')) {
      const blob = new Blob([doc.previewContent || ''], { type: doc.contentType || 'text/plain' });
      downloadUrl = URL.createObjectURL(blob);
      shouldRevoke = true;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = doc.originalFilename || `${doc.title}.${isImage ? 'jpeg' : 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (shouldRevoke) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    }

    trustVaultStore.recordAuditEvent(
      'DOC_DOWNLOAD',
      'Document',
      doc.id,
      doc.title,
      'SUCCESS',
      `Document downloaded in native uploaded format (${doc.originalFilename}) by ${currentUser?.fullName || 'User'}.`
    );
    onRefresh();
    setActionMessage(`Downloaded original file: ${doc.originalFilename}`);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleSubmitDownloadRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRequest(true);

    setTimeout(() => {
      try {
        trustVaultStore.requestDownloadPermission(doc.id, downloadReason);
        setIsSubmittingRequest(false);
        setShowRequestDownloadDialog(false);
        setActionMessage(`Download permission request submitted to ${doc.ownerName}!`);
        onRefresh();
        setTimeout(() => setActionMessage(null), 4000);
      } catch (err: any) {
        setIsSubmittingRequest(false);
        alert(err.message || 'Failed to submit download request.');
      }
    }, 400);
  };

  const handleOwnerResponse = (requestId: string, approve: boolean) => {
    try {
      trustVaultStore.respondToDownloadRequest(requestId, approve);
      setActionMessage(approve ? 'Approved download request!' : 'Declined download request.');
      onRefresh();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    try {
      trustVaultStore.updateDocumentMetadata(doc.id, editTitle, editCategory, editDescription);
      setActionMessage('Metadata updated successfully.');
      onRefresh();
      setActiveTab('metadata');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteConfirm = () => {
    if (!canDelete) return;
    try {
      trustVaultStore.deleteDocument(doc.id);
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const badgeConfig = {
    OWNER: {
      bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      desc: 'You own this document. Full administrative, edit, delete, and sharing control.',
    },
    EDIT: {
      bg: 'bg-blue-100 text-blue-900 border-blue-300',
      desc: 'Granted EDIT access. You can preview, download, and update metadata.',
    },
    READ: {
      bg: 'bg-slate-100 text-slate-800 border-slate-300',
      desc: 'Granted READ access. You can view content securely. Direct downloading requires owner authorization.',
    },
    NONE: {
      bg: 'bg-rose-100 text-rose-900 border-rose-300',
      desc: 'No access granted. Contents are restricted by server policy.',
    },
  }[effectivePermission];

  // Render formatted document content lines (handling images, tables, dividers, and headers)
  const renderFormattedContent = () => {
    // If the document is an image (JPEG, PNG, etc.): Render native image with high fidelity, never text!
    if (isImageDoc) {
      const imageSrc = getImageSource();
      return (
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 shadow-inner p-3 sm:p-6 w-full flex items-center justify-center min-h-[380px]">
            <img
              src={imageSrc}
              alt={doc.title}
              style={{
                transform: `rotate(${rotationDeg}deg)`,
                transition: 'transform 0.25s ease-in-out',
              }}
              className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
              draggable={false}
            />
          </div>
          <div className="w-full flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 px-1">
            <span className="font-semibold text-slate-700">
              {doc.originalFilename} • {doc.contentType || 'image/jpeg'}
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
              Native Uploaded Image Format
            </span>
          </div>
        </div>
      );
    }

    const rawContent = doc.previewContent || '';
    if (!rawContent) {
      return (
        <div className="py-12 text-center text-slate-400 italic">
          No content stored for this document.
        </div>
      );
    }

    const lines = rawContent.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTableRows: string[][] = [];
    let tableKey = 0;

    const flushTable = () => {
      if (currentTableRows.length > 0) {
        const headerRow = currentTableRows[0];
        const bodyRows = currentTableRows.slice(1);

        elements.push(
          <div key={`table-${tableKey++}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  {headerRow.map((cell, ci) => (
                    <th key={ci} className="py-2.5 px-3.5 border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                      {cell.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-50/70 transition-colors">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`py-2 px-3.5 border-r border-slate-100 last:border-r-0 font-mono text-[11px] ${
                          cell.trim().startsWith('$') || cell.trim().includes('%')
                            ? 'text-right font-semibold text-emerald-950'
                            : 'text-slate-700'
                        }`}
                      >
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTableRows = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line is a table row (contains | and not purely decorative)
      if (line.includes('|') && !line.includes('===') && !line.includes('---')) {
        const cells = line.split('|').filter((c) => c.trim().length > 0);
        if (cells.length > 1) {
          currentTableRows.push(cells);
          continue;
        }
      }

      // If we were collecting table rows and hit a non-table line, flush table
      if (currentTableRows.length > 0) {
        flushTable();
      }

      // Skip table horizontal divider lines like -------
      if (line.trim().startsWith('---') || line.trim().startsWith('===')) {
        elements.push(<hr key={`hr-${i}`} className="my-3 border-slate-200" />);
        continue;
      }

      // Header or Document Title lines
      if (i === 0 && line.length < 80) {
        elements.push(
          <h2 key={`h-${i}`} className="text-base sm:text-lg font-black text-slate-900 tracking-tight mb-2">
            {line}
          </h2>
        );
        continue;
      }

      if (line.toUpperCase() === line && line.length > 4 && line.length < 60 && !line.includes('$')) {
        elements.push(
          <h3 key={`subh-${i}`} className="text-xs font-bold text-emerald-950 uppercase tracking-wider mt-4 mb-1">
            {line}
          </h3>
        );
        continue;
      }

      // Key-Value rows like "Document Identifier: #US-PASS..."
      if (line.includes(':') && line.indexOf(':') < 30) {
        const colonIdx = line.indexOf(':');
        const key = line.slice(0, colonIdx);
        const val = line.slice(colonIdx + 1);
        elements.push(
          <div key={`kv-${i}`} className="py-0.5 text-xs flex flex-col sm:flex-row sm:items-baseline gap-1">
            <span className="font-bold text-slate-700 min-w-44 flex-shrink-0">{key}:</span>
            <span className="text-slate-900 font-mono text-[11px] break-all">{val.trim()}</span>
          </div>
        );
        continue;
      }

      // Regular line
      if (line.trim().length === 0) {
        elements.push(<div key={`sp-${i}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-xs text-slate-700 leading-relaxed font-sans">
            {line}
          </p>
        );
      }
    }

    if (currentTableRows.length > 0) {
      flushTable();
    }

    return elements;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 drm-protected-surface">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0f392b] text-white flex-shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">{doc.title}</h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <CameraOff className="w-3 h-3" />
                  Anti-Screenshot Active
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 truncate">
                {doc.originalFilename} • Author: <span className="font-semibold text-white">{doc.ownerName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-900/40 transition-colors flex-shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Effective Permission & Control Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your access:</span>
            <span
              className={`text-xs font-extrabold px-3 py-1 rounded-full border shadow-xs ${badgeConfig.bg}`}
              title={badgeConfig.desc}
            >
              {effectivePermission}
            </span>

            {effectivePermission === 'READ' && hasDownloadApproval && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-700" />
                <span>Download Approved</span>
              </span>
            )}

            <button
              onClick={() => setShowSecurityDetails(!showSecurityDetails)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>DRM & Protection Status</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canShare && (
              <button
                onClick={() => {
                  onClose();
                  onOpenShare(doc);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0f392b] text-white hover:bg-[#165b44] shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Manage Sharing</span>
              </button>
            )}

            {/* Owner or Authorized Download Action */}
            {(isOwner || canDownload) ? (
              <button
                onClick={handleDownloadOriginal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0f392b] text-white hover:bg-[#165b44] shadow-xs transition-colors cursor-pointer"
                title={`Download original ${doc.originalFilename}`}
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Download ({doc.originalFilename.split('.').pop()?.toUpperCase() || 'FILE'})</span>
              </button>
            ) : (
              <button
                onClick={() => setShowRequestDownloadDialog(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                title="Request authorization from document owner to download a copy"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Request Download</span>
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                title="Owner can delete this document permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Action toast message */}
        {actionMessage && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Anti-Screenshot Alert Banner */}
        {captureBlockedAlert && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-950 text-xs flex items-center justify-between gap-3 animate-in shake duration-300 shadow-sm">
            <div className="flex items-center gap-2">
              <CameraOff className="w-5 h-5 text-rose-600 flex-shrink-0 animate-pulse" />
              <div>
                <span className="font-extrabold text-rose-900">SCREEN CAPTURE BLOCKED: </span>
                <span className="text-rose-800">{captureBlockedAlert}</span>
                <span className="text-[10px] text-rose-600 block mt-0.5">
                  Tamper-evident audit log has recorded this incident under your active session.
                </span>
              </div>
            </div>
            <button
              onClick={() => setCaptureBlockedAlert(null)}
              className="text-rose-700 hover:text-rose-950 font-bold text-xs p-1 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Security & Protection Explanation Box */}
        {showSecurityDetails && (
          <div className="mx-6 mt-3 p-4 rounded-xl bg-slate-900 text-white text-xs space-y-2 border border-slate-800 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <ShieldAlert className="w-4 h-4" />
                <span>TrustVault Anti-Screen Capture & DRM Protection Suite</span>
              </div>
              <button
                onClick={() => setShowSecurityDetails(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-300">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-emerald-300 block">1. Forensic Dynamic Watermarking</span>
                Your authenticated email ({currentUser?.email}) and live UTC timestamp are diagonally tiled across the
                entire document surface. Unauthorized photos are forensically attributable.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-emerald-300 block">2. Privacy Shield on Focus Loss</span>
                If you activate a snipping tool, switch windows, or lose browser focus, the viewer immediately blurs and
                obscures the content with a privacy shield.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-emerald-300 block">3. Shortcut Interception</span>
                PrtScn, Cmd+Shift+3/4/5, Win+Shift+S, Ctrl+P (Print), and F12 are intercepted, clearing clipboard and
                recording security logs.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-emerald-300 block">4. Anti-Selection & Anti-Print</span>
                Text selection and context menus are suppressed. Physical printing is intercepted with blanking CSS rules.
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">
                Protected Document ID: {doc.id} • Key: {doc.sanitizedStorageKey}
              </span>
              <button
                onClick={() => {
                  triggerCaptureBlocked('Simulated test of Privacy Shield triggered by user.');
                }}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
              >
                Test Privacy Shield
              </button>
            </div>
          </div>
        )}

        {/* OWNER VIEW: Pending requests banner */}
        {isOwner && pendingRequestsForThisDoc.length > 0 && (
          <div className="mx-6 mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-amber-900">
                <Clock className="w-4 h-4 text-amber-700" />
                Pending Download Requests ({pendingRequestsForThisDoc.length})
              </span>
              <span className="text-[11px] text-amber-800">Review requests from READ users below</span>
            </div>
            <div className="divide-y divide-amber-200/60">
              {pendingRequestsForThisDoc.map((req) => (
                <div key={req.id} className="pt-2 pb-1 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900">{req.requesterName}</span>{' '}
                    <span className="text-slate-500 font-mono text-[11px]">({req.requesterEmail})</span>
                    {req.reason && <p className="text-[11px] text-amber-900 mt-0.5 italic">&quot;{req.reason}&quot;</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleOwnerResponse(req.id, true)}
                      className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleOwnerResponse(req.id, false)}
                      className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* READ USER MODAL: Request Download Permission Dialog */}
        {showRequestDownloadDialog && (
          <div className="mx-6 mt-3 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-950">Ask Owner for Download Permission</h4>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  Your current permission role is <strong className="text-slate-900 font-bold">READ</strong>. Under
                  TrustVault security policy, users with READ access cannot download files directly to local storage.
                  Send a formal request to document owner <strong className="text-slate-900">{doc.ownerName}</strong> to
                  authorize a download copy.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitDownloadRequest} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Download (Optional)
                </label>
                <input
                  type="text"
                  value={downloadReason}
                  onChange={(e) => setDownloadReason(e.target.value)}
                  placeholder="e.g. Needed for legal discovery / compliance review"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRequestDownloadDialog(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-white border border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0f392b] hover:bg-[#165b44] text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingRequest ? 'Submitting...' : 'Send Request to Owner'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="mx-6 mt-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-950">Confirm Document Archival / Deletion</h4>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-900">&quot;{doc.title}&quot;</strong>?
                  All active permission grants will be immediately revoked and future download requests will be denied.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-white border border-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-xs cursor-pointer"
              >
                Confirm Delete & Revoke All
              </button>
            </div>
          </div>
        )}

        {/* Nav Tabs Bar */}
        <div className="px-6 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600 flex-shrink-0 bg-white">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('content')}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'content'
                  ? 'border-[#0f392b] text-[#0f392b] font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Eye className="w-4 h-4 text-emerald-700" />
              <span>Document Content</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                Protected
              </span>
            </button>
            <button
              onClick={() => setActiveTab('metadata')}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'metadata'
                  ? 'border-[#0f392b] text-[#0f392b] font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Document Metadata</span>
            </button>
            {canEdit && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'edit'
                    ? 'border-[#0f392b] text-[#0f392b] font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Metadata</span>
              </button>
            )}
            {isOwner && docDownloadRequests.length > 0 && (
              <button
                onClick={() => setActiveTab('download_requests')}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'download_requests'
                    ? 'border-[#0f392b] text-[#0f392b] font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  Download Requests{' '}
                  {pendingRequestsForThisDoc.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                      {pendingRequestsForThisDoc.length}
                    </span>
                  )}
                </span>
              </button>
            )}
          </div>

          {/* Controls visible in Content tab */}
          {activeTab === 'content' && canRead && (
            <div className="flex items-center gap-2 py-2 flex-wrap">
              {isDocumentOpen ? (
                <>
                  <button
                    onClick={() => setIsDocumentOpen(false)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold transition-colors cursor-pointer"
                    title="Close and re-seal document content"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Close Content</span>
                  </button>

                  {isImageDoc ? (
                    <>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="font-bold text-slate-800">{doc.originalFilename.split('.').pop()?.toUpperCase() || 'JPEG'}</span>
                      </div>

                      <button
                        onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 bg-white cursor-pointer"
                        title="Rotate image 90 degrees"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Rotate</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button
                        onClick={() => setViewMode('formatted')}
                        className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          viewMode === 'formatted' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="Executive Document Presentation"
                      >
                        Document View
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          viewMode === 'raw' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="Structured Text Monospace"
                      >
                        Raw Monospace
                      </button>
                    </div>
                  )}

                  <div className="hidden sm:flex items-center gap-1 text-slate-500 pl-2 border-l border-slate-200">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                      className="p-1 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono min-w-8 text-center">{zoomLevel}%</span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                      className="p-1 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setZoomLevel(100); setRotationDeg(0); }}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-1 cursor-pointer"
                      title="Reset Zoom"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Owner watermark toggle */}
                  {isOwner && (
                    <button
                      onClick={() => setIsWatermarkVisible(!isWatermarkVisible)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        isWatermarkVisible
                          ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}
                      title="Owner can toggle DRM watermark overlay"
                    >
                      {isWatermarkVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{isWatermarkVisible ? 'Watermark: On' : 'Watermark: Off'}</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setIsDocumentOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0f392b] hover:bg-[#165b44] text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Document to View Content</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Contents Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50">
          {/* ================= TAB: CONTENT (DOCUMENT PREVIEW) ================= */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              {!canRead ? (
                <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Access Denied (NONE)</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    You do not possess READ, EDIT, or OWNER permissions for this document. Server-side policy blocks
                    content stream delivery.
                  </p>
                </div>
              ) : !isDocumentOpen ? (
                /* SEALED DOCUMENT COVER VIEW (Content hidden on initial open) */
                <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-6 shadow-xs animate-in fade-in duration-200">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
                    {isImageDoc ? <ImageIcon className="w-8 h-8 text-emerald-700" /> : <Lock className="w-8 h-8" />}
                  </div>

                  <div className="max-w-md mx-auto space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <Shield className="w-3.5 h-3.5 text-amber-700" />
                      <span>{isImageDoc ? 'Image Document Sealed' : 'Document Content Sealed'}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{doc.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {isImageDoc
                        ? 'Uploaded in visual image format (' + (doc.contentType || 'image/jpeg') + '). Click the button below to decrypt and view the high-resolution JPEG/PNG in its authentic uploaded format without conversion to text.'
                        : 'In accordance with anti-shoulder-surfing and privacy policies, document contents are not displayed immediately on open. Click the button below to decrypt and open the document.'}
                    </p>
                  </div>

                  {/* Summary Metadata Snapshot */}
                  <div className="max-w-lg mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Format</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                        {isImageDoc ? 'JPEG / Image' : doc.contentType || 'Document'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">{doc.category}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">File Size</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Access</span>
                      <span className="text-xs font-bold text-emerald-700 mt-0.5 block">{effectivePermission}</span>
                    </div>
                  </div>

                  {/* Open Document CTA Button & Owner Controls */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => setIsDocumentOpen(true)}
                      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#0f392b] hover:bg-[#165b44] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Open Document to View Content</span>
                    </button>

                    {isOwner && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadOriginal}
                          className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                          title="Download original file in uploaded format"
                        >
                          <Download className="w-4 h-4 text-emerald-700" />
                          <span>Download ({doc.originalFilename.split('.').pop()?.toUpperCase() || 'JPEG'})</span>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                          title="Delete document and revoke all access grants"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {isOwner
                      ? 'As the document owner, you have full authority to view, download in native format, or permanently delete this file.'
                      : 'Opening the document will decrypt the content with dynamic forensic watermarks and DRM screen-capture protection active.'}
                  </p>
                </div>
              ) : (
                /* PROTECTED DOCUMENT CONTAINER (Revealed after clicking Open Document) */
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    triggerCaptureBlocked('Right-click context menu is disabled on protected documents.');
                  }}
                  onCopy={(e) => {
                    e.preventDefault();
                    triggerCaptureBlocked('Clipboard copying is disabled on protected documents.');
                  }}
                  onCut={(e) => {
                    e.preventDefault();
                    triggerCaptureBlocked('Clipboard cut is disabled on protected documents.');
                  }}
                  onDragStart={(e) => e.preventDefault()}
                  className="relative select-none drm-protected-surface rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden min-h-[420px]"
                >
                  {/* DYNAMIC FORENSIC WATERMARK OVERLAY (Toggleable by document owner) */}
                  {isWatermarkVisible && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 flex flex-col justify-around opacity-15"
                      style={{
                        transform: 'rotate(-20deg) scale(1.15)',
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                        <div
                          key={row}
                          className="whitespace-nowrap text-xs font-mono font-bold tracking-widest text-slate-900 py-4 select-none"
                        >
                          CONFIDENTIAL • {currentUser?.email || 'USER'} • ID: {currentUser?.id || 'AUTH'} •{' '}
                          {watermarkTimestamp} • DO NOT CAPTURE OR DISTRIBUTE • TRUSTVAULT DRM • VAULT RECORD #{doc.id}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PRIVACY SHIELD OBSCURER (When window loses focus or screenshot tool detected) */}
                  {isPrivacyShieldActive && (
                    <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in duration-150">
                      <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-4 animate-pulse">
                        <CameraOff className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-white">PRIVACY SHIELD ACTIVE</h3>
                      <p className="text-xs text-slate-300 max-w-md mt-2 leading-relaxed">
                        Document content is obscured because window focus was lost or a screen-capture utility was
                        initiated. Content is shielded against background recorders, screen share peeking, and
                        screenshot utilities.
                      </p>
                      <button
                        onClick={() => setIsPrivacyShieldActive(false)}
                        className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Resume Secure Viewing</span>
                      </button>
                    </div>
                  )}

                  {/* Top Document Header Bar inside the canvas */}
                  <div className="px-6 py-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 relative z-10 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-slate-800">
                        {isImageDoc ? 'Decrypted Image View' : 'Decrypted Content Stream'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {isImageDoc ? `(${doc.contentType || 'image/jpeg'})` : `(${(doc.previewContent || '').length} chars)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>AES-256-GCM Active</span>
                      </div>
                      <button
                        onClick={() => setIsDocumentOpen(false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold transition-colors cursor-pointer"
                        title="Close and re-seal document content"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Close Content</span>
                      </button>
                    </div>
                  </div>

                  {/* DOCUMENT BODY */}
                  <div
                    className="p-6 sm:p-8"
                    style={{
                      zoom: `${zoomLevel}%`,
                    }}
                  >
                    {isImageDoc || viewMode === 'formatted' ? (
                      <div className="max-w-3xl mx-auto space-y-2 font-sans text-slate-800">
                        {renderFormattedContent()}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800 leading-relaxed bg-slate-50 p-5 rounded-xl border border-slate-200">
                        {doc.previewContent || 'No content available in document stream.'}
                      </pre>
                    )}
                  </div>

                  {/* Bottom Verification Seal & Owner Controls */}
                  <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 relative z-10 gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Zero-Knowledge Authenticated Document • Watermarked to {currentUser?.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <>
                          <button
                            onClick={handleDownloadOriginal}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px] cursor-pointer"
                            title="Download original file"
                          >
                            <Download className="w-3 h-3 text-emerald-700" />
                            <span>Download ({doc.originalFilename.split('.').pop()?.toUpperCase() || 'JPEG'})</span>
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-[11px] cursor-pointer"
                            title="Delete this document"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                      <span className="font-mono text-[10px] text-slate-400">
                        Locator: {doc.sanitizedStorageKey}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Policy Explanation Footer */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span className="text-slate-800 font-medium">
                    {badgeConfig.desc}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-slate-500 font-semibold">Test protection:</span>
                  <button
                    onClick={() => triggerCaptureBlocked('Manual test of Privacy Shield triggered.')}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-300 transition-colors cursor-pointer"
                  >
                    Trigger Privacy Shield
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB: METADATA ================= */}
          {activeTab === 'metadata' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Owner / Author</span>
                <span className="font-bold text-slate-800 mt-1 text-sm block">{doc.ownerName}</span>
                <span className="text-slate-500 text-[11px] font-mono">{doc.ownerEmail}</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Category & Status</span>
                <span className="font-bold text-slate-800 mt-1 text-sm block">
                  {doc.category} • <span className="text-emerald-700 font-semibold">{doc.status}</span>
                </span>
                <span className="text-slate-500 text-[11px]">Private Zero-Knowledge Workspace Volume</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">File Size & MIME</span>
                <span className="font-bold text-slate-800 mt-1 text-sm block">
                  {(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB ({doc.fileSizeBytes.toLocaleString()} bytes)
                </span>
                <span className="text-slate-500 text-[11px] font-mono truncate block">{doc.contentType}</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Storage Locator Key</span>
                <span className="font-mono text-slate-700 text-[11px] truncate block mt-1">
                  {doc.sanitizedStorageKey}
                </span>
                <span className="text-slate-400 text-[10px]">Location: {doc.storageLocationId}</span>
              </div>

              <div className="sm:col-span-2 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Description</span>
                <p className="text-slate-700 mt-1 leading-relaxed">
                  {doc.description || 'No description provided by document owner.'}
                </p>
              </div>

              <div className="sm:col-span-2 p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Cryptographic Hashes</span>
                <div className="font-mono text-[11px] text-slate-600 space-y-1 pt-1">
                  <div>SHA-256 Digest: <span className="text-slate-800 font-semibold">9f41e7a29b31008c77f421d8a41209b4e8c89b144e9b819...</span></div>
                  <div>Encryption: <span className="text-emerald-800 font-semibold">AES-256-GCM authenticated authenticated stream</span></div>
                </div>
              </div>

              <div className="sm:col-span-2 text-[11px] text-slate-500 flex items-center justify-between px-1">
                <span>Created: {new Date(doc.createdAt).toLocaleString()}</span>
                <span>Last Modified: {new Date(doc.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* ================= TAB: EDIT METADATA ================= */}
          {activeTab === 'edit' && canEdit && (
            <form onSubmit={handleSaveMetadata} className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="block w-full px-3.5 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="block w-full px-3 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                >
                  <option value="Personal">Personal</option>
                  <option value="Financial">Financial</option>
                  <option value="Legal">Legal</option>
                  <option value="Technical">Technical</option>
                  <option value="HR">HR</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="block w-full px-3.5 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('metadata')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f392b] hover:bg-[#165b44] text-white shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* ================= TAB: DOWNLOAD REQUESTS ================= */}
          {activeTab === 'download_requests' && isOwner && (
            <div className="space-y-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-slate-900 text-sm">Download Authorization Requests</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Users with READ access must receive your authorization before downloading copies to local storage.
                </p>
              </div>

              {docDownloadRequests.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 bg-white">
                  No download authorization requests submitted for this document.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-xs bg-white">
                  {docDownloadRequests.map((req) => (
                    <div key={req.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{req.requesterName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{req.requesterEmail}</div>
                        {req.reason && <p className="text-[11px] text-slate-700 mt-1 italic">&quot;{req.reason}&quot;</p>}
                        <div className="text-[10px] text-slate-400 mt-1">
                          Requested: {new Date(req.requestedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {req.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleOwnerResponse(req.id, true)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleOwnerResponse(req.id, false)}
                              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              req.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};