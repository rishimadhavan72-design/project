import React, { useState } from 'react';
import {
  X,
  Share2,
  UserPlus,
  Trash2,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  User,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { DocumentItem, DocumentPermissionGrant } from '../types/trustvault';
import { trustVaultStore } from '../services/trustvault-store';

interface ShareDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'READ' | 'EDIT'>('READ');
  const [grantToRevoke, setGrantToRevoke] = useState<DocumentPermissionGrant | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !doc) return null;

  const currentGrants = trustVaultStore.getGrantsForDocument(doc.id);
  const workspaceMembers = trustVaultStore.getMembersForCurrentWorkspace();

  const handleGrantPermission = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail.trim() || !emailRegex.test(recipientEmail.trim())) {
      setErrorMessage('Please enter a valid recipient email address.');
      return;
    }

    try {
      trustVaultStore.grantDocumentPermission(
        doc.id,
        recipientEmail,
        recipientName || recipientEmail.split('@')[0],
        permissionLevel
      );
      setRecipientEmail('');
      setRecipientName('');
      setSuccessMessage(`Successfully granted ${permissionLevel} access to ${recipientEmail}.`);
      onRefresh();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to grant permission.');
    }
  };

  const handleModifyGrant = (grantId: string, newLevel: 'READ' | 'EDIT') => {
    try {
      trustVaultStore.modifyDocumentGrant(grantId, newLevel);
      setSuccessMessage(`Updated grant level to ${newLevel}.`);
      onRefresh();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevokeConfirm = () => {
    if (!grantToRevoke) return;
    try {
      trustVaultStore.revokeDocumentGrant(grantToRevoke.id);
      setGrantToRevoke(null);
      setSuccessMessage(`Revoked access from ${grantToRevoke.granteeEmail}. Future requests are immediately denied.`);
      onRefresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0f392b] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Document Access & Sharing</h3>
              <p className="text-xs text-emerald-200/80 truncate max-w-md">{doc.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Owner info banner */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Document Owner:</span>
              <span className="font-bold text-slate-900">{doc.ownerName}</span>
              <span className="text-slate-500 font-mono text-[11px]">({doc.ownerEmail})</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-300">
              OWNER
            </span>
          </div>

          {/* Feedback Messages */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Revoke Confirmation Dialog Overlay */}
          {grantToRevoke && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-950">Confirm Permission Revocation</h4>
                  <p className="mt-1 text-slate-700 leading-relaxed">
                    Revoking access for <strong className="text-slate-900">{grantToRevoke.granteeEmail}</strong> will
                    immediately block all future download, preview, and read requests. Note: Copies previously
                    downloaded to a local device cannot be cryptographically erased after download.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setGrantToRevoke(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-white border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevokeConfirm}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white"
                >
                  Revoke Access Now
                </button>
              </div>
            </div>
          )}

          {/* Grant New Permission Form */}
          <form onSubmit={handleGrantPermission} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>Grant New Access</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Recipient Email</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="block w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Access Level</label>
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value as any)}
                  className="block w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900 font-semibold"
                >
                  <option value="READ">READ (View, preview, download)</option>
                  <option value="EDIT">EDIT (Read + metadata update)</option>
                </select>
              </div>
            </div>

            {/* Quick member suggestions for corporate workspace */}
            {workspaceMembers.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500 font-semibold">Suggested team members:</span>
                {workspaceMembers
                  .filter((m) => m.userId !== doc.ownerId)
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setRecipientEmail(m.userEmail);
                        setRecipientName(m.userName);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 transition-colors"
                    >
                      {m.userName.split(' ')[0]} ({m.role})
                    </button>
                  ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0f392b] hover:bg-[#165b44] text-white shadow-xs transition-colors"
              >
                Grant Access
              </button>
            </div>
          </form>

          {/* Active Grants List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Current Access Grants ({currentGrants.length})
              </h4>
              <span className="text-[11px] text-slate-500">Only Owner can alter grants</span>
            </div>

            {currentGrants.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                This document is strictly private. No active sharing grants exist.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {currentGrants.map((grant) => (
                  <div key={grant.id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{grant.granteeName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{grant.granteeEmail}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Granted: {new Date(grant.grantedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Permission toggle dropdown */}
                      <select
                        value={grant.permission}
                        onChange={(e) => handleModifyGrant(grant.id, e.target.value as any)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                          grant.permission === 'EDIT'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <option value="READ">READ</option>
                        <option value="EDIT">EDIT</option>
                      </select>

                      {/* Revoke button */}
                      <button
                        onClick={() => setGrantToRevoke(grant)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        title="Revoke access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-700" />
            <span>All permission modifications are recorded in the audit log.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
