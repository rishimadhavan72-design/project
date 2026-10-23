import {
  DocumentItem,
  DocumentPermissionGrant,
  DocumentPermissionLevel,
  FileValidationResult,
  FolderPermissionPolicy,
  Invitation,
  OrganisationMember,
  User,
  Workspace,
} from '../types/trustvault';

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'doc',
  'xlsx',
  'xls',
  'pptx',
  'txt',
  'csv',
  'md',
  'png',
  'jpg',
  'jpeg',
  'webp',
]);

const DANGEROUS_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'sh',
  'bin',
  'vbs',
  'scr',
  'dll',
  'so',
  'msi',
  'js',
  'jar',
  'py',
]);

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Calculates the user's effective document permission level according to the server-side authorization matrix:
 * 1. An unauthenticated user has NONE.
 * 2. Tenant isolation: for corporate documents, user must be an active member of that workspace.
 * 3. Document owner receives OWNER.
 * 4. Active direct permission grant dictates EDIT or READ.
 * 5. Organisation Administrators do NOT automatically inherit document read/edit access without a grant.
 * 6. Default fallback is NONE.
 */
export function computeEffectivePermission(
  document: DocumentItem,
  user: User | null,
  grants: DocumentPermissionGrant[],
  memberships: OrganisationMember[],
  workspaces: Workspace[],
  folderPolicies?: FolderPermissionPolicy[]
): DocumentPermissionLevel {
  // Zero-trust security: Unverified accounts have zero access to documents until email verification
  if (!user || user.isEmailVerified === false) return 'NONE';

  const docWorkspace = workspaces.find((w) => w.id === document.workspaceId);
  const isCorporate = docWorkspace?.type === 'corporate';

  // For corporate workspaces, enforce tenant membership boundary
  if (isCorporate) {
    const isMember = memberships.some(
      (m) =>
        m.workspaceId === document.workspaceId &&
        (m.userId === user.id || m.userEmail.toLowerCase() === user.email.toLowerCase()) &&
        m.status === 'Active'
    );
    if (!isMember) {
      return 'NONE';
    }
  } else {
    // Personal workspace: if not owner and no active grant or folder policy, strictly NONE
    if (document.ownerId !== user.id) {
      const activeGrant = grants.find(
        (g) =>
          g.documentId === document.id &&
          (g.granteeUserId === user.id || g.granteeEmail.toLowerCase() === user.email.toLowerCase()) &&
          g.status === 'Active'
      );
      if (activeGrant) {
        return activeGrant.permission;
      }

      // Check folder policy for personal workspace shared folders
      if (folderPolicies && document.folderPath) {
        const matchingPolicy = folderPolicies.find(
          (p) =>
            p.workspaceId === document.workspaceId &&
            p.folderPath === document.folderPath &&
            (p.granteeUserId === user.id || p.granteeEmail.toLowerCase() === user.email.toLowerCase())
        );
        if (matchingPolicy) {
          if (matchingPolicy.mode === 'TOTAL_FOLDER') {
            return matchingPolicy.permission;
          } else if (matchingPolicy.mode === 'SELECTIVE_ITEMS') {
            if (matchingPolicy.allowedDocumentIds?.includes(document.id)) {
              return matchingPolicy.permission;
            }
          }
        }
      }

      return 'NONE';
    }
  }

  // Document owner is OWNER
  if (document.ownerId === user.id) {
    return 'OWNER';
  }

  // 1. Check active direct permission grants (explicit document-level grant)
  const activeGrant = grants.find(
    (g) =>
      g.documentId === document.id &&
      (g.granteeUserId === user.id || g.granteeEmail.toLowerCase() === user.email.toLowerCase()) &&
      g.status === 'Active'
  );

  if (activeGrant) {
    return activeGrant.permission;
  }

  // 2. Check AWS S3 Folder / Bucket Prefix Policy
  if (folderPolicies && document.folderPath) {
    const matchingPolicy = folderPolicies.find(
      (p) =>
        p.workspaceId === document.workspaceId &&
        p.folderPath === document.folderPath &&
        (p.granteeUserId === user.id || p.granteeEmail.toLowerCase() === user.email.toLowerCase())
    );

    if (matchingPolicy) {
      if (matchingPolicy.mode === 'TOTAL_FOLDER') {
        return matchingPolicy.permission;
      } else if (matchingPolicy.mode === 'SELECTIVE_ITEMS') {
        if (matchingPolicy.allowedDocumentIds?.includes(document.id)) {
          return matchingPolicy.permission;
        }
      }
    }
  }

  // Administrators and members without explicit grant or folder policy receive NONE for document contents
  return 'NONE';
}

export function canReadDocument(permission: DocumentPermissionLevel): boolean {
  return permission === 'READ' || permission === 'EDIT' || permission === 'OWNER';
}

export function canPreviewDocument(permission: DocumentPermissionLevel): boolean {
  return canReadDocument(permission);
}

/**
 * Download authorization policy:
 * - OWNER: Full download rights.
 * - EDIT: Download rights enabled.
 * - READ: Direct download is restricted by default! The user must ask permission from the document owner.
 *         Only enabled if explicit owner approval is granted (hasExplicitDownloadApproval === true).
 * - NONE: Download prohibited.
 */
export function canDownloadDocument(
  permission: DocumentPermissionLevel,
  hasExplicitDownloadApproval = false
): boolean {
  if (permission === 'OWNER' || permission === 'EDIT') {
    return true;
  }
  if (permission === 'READ') {
    return hasExplicitDownloadApproval;
  }
  return false;
}

export function canEditDocument(permission: DocumentPermissionLevel): boolean {
  return permission === 'EDIT' || permission === 'OWNER';
}

export function canManagePermissions(permission: DocumentPermissionLevel): boolean {
  return permission === 'OWNER';
}

export function canDeleteDocument(permission: DocumentPermissionLevel): boolean {
  return permission === 'OWNER';
}

/**
 * Validates uploaded file against extension allowlist, dangerous extension denylist, and size limits.
 */
export function validateUploadFile(file: { name: string; size: number }): FileValidationResult {
  if (!file || !file.name) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'File is empty (0 bytes)' };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 25MB limit (current: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
    };
  }

  const parts = file.name.split('.');
  if (parts.length < 2) {
    return { valid: false, error: 'File has no extension' };
  }

  const ext = parts[parts.length - 1].toLowerCase();

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Executable or script file type .${ext} is prohibited` };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension .${ext}. Allowed formats: PDF, DOCX, XLSX, PPTX, TXT, CSV, MD, Images`,
    };
  }

  return { valid: true };
}

/**
 * Validates corporate invitations: check token, expiry, revocation, and recipient email match.
 */
export function validateInvitation(
  invitation: Invitation | null | undefined,
  currentUserEmail: string
): { valid: boolean; reason?: string } {
  if (!invitation) {
    return { valid: false, reason: 'Invitation not found' };
  }

  if (invitation.status === 'Revoked') {
    return { valid: false, reason: 'This invitation has been revoked by the organisation administrator' };
  }

  if (invitation.status === 'Rejected') {
    return { valid: false, reason: 'This invitation has been rejected by the organisation administrator' };
  }

  if (invitation.status === 'Accepted') {
    return { valid: false, reason: 'This invitation has already been accepted' };
  }

  const isExpired = new Date(invitation.expiresAt).getTime() < Date.now();
  if (isExpired || invitation.status === 'Expired') {
    return { valid: false, reason: 'This invitation has expired' };
  }

  if (invitation.recipientEmail.toLowerCase() !== currentUserEmail.toLowerCase()) {
    return {
      valid: false,
      reason: `This invitation was issued to ${invitation.recipientEmail}, not ${currentUserEmail}`,
    };
  }

  return { valid: true };
}
