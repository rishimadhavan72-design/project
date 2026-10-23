export type WorkspaceType = 'personal' | 'corporate';

export type DocumentPermissionLevel = 'NONE' | 'READ' | 'EDIT' | 'OWNER';

export type OrganisationRole = 'Admin' | 'Member' | 'Auditor';

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: string;
  securityLevel?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: WorkspaceType;
  description?: string;
  ownerId: string;
  createdAt: string;
}

export interface OrganisationMember {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: OrganisationRole;
  status: 'Active' | 'Pending';
  joinedAt: string;
}

export interface DocumentPermissionGrant {
  id: string;
  documentId: string;
  granteeUserId: string;
  granteeEmail: string;
  granteeName: string;
  permission: 'READ' | 'EDIT';
  grantedByUserId: string;
  grantedAt: string;
  status: 'Active' | 'Revoked';
}

export interface FolderPermissionPolicy {
  id: string;
  workspaceId: string;
  folderPath: string; // e.g. "finance", "legal", "engineering/specs"
  granteeUserId: string;
  granteeEmail: string;
  granteeName: string;
  permission: 'READ' | 'EDIT' | 'NONE';
  mode: 'TOTAL_FOLDER' | 'SELECTIVE_ITEMS';
  allowedDocumentIds?: string[]; // If mode is SELECTIVE_ITEMS, which specific document IDs are allowed
  grantedByUserId: string;
  grantedAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  workspaceId: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  title: string;
  originalFilename: string;
  sanitizedStorageKey: string;
  contentType: string;
  fileSizeBytes: number;
  category: 'Financial' | 'Legal' | 'Technical' | 'HR' | 'Personal' | 'Other';
  description?: string;
  status: 'Active' | 'Archived';
  storageLocationId: string;
  createdAt: string;
  updatedAt: string;
  previewContent?: string;
  fileDataUrl?: string;
  folderPath?: string; // S3 folder prefix e.g. "finance" or "engineering/blueprints"
  s3Key?: string; // e.g. "s3://acme-corporate-vault/finance/q1_balance_sheet.pdf"
  bucketName?: string; // e.g. "acme-corporate-vault"
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  action:
    | 'AUTH_LOGIN'
    | 'AUTH_FAILED'
    | 'AUTH_LOGOUT'
    | 'DOC_UPLOAD'
    | 'DOC_PREVIEW'
    | 'DOC_DOWNLOAD'
    | 'DOC_METADATA_UPDATE'
    | 'DOC_DELETE'
    | 'PERMISSION_GRANT'
    | 'PERMISSION_MODIFY'
    | 'PERMISSION_REVOKE'
    | 'MEMBER_INVITE'
    | 'MEMBER_JOIN'
    | 'MEMBER_ROLE_CHANGE'
    | 'MEMBER_REMOVE'
    | 'ACCESS_DENIED';
  resourceType: 'Document' | 'Workspace' | 'Member' | 'Invitation' | 'Auth';
  resourceId: string;
  resourceName: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
  timestamp: string;
  details: string;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  recipientEmail: string;
  role: OrganisationRole;
  token: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Revoked' | 'Expired';
  expiresAt: string;
  createdAt: string;
}

export interface DownloadPermissionRequest {
  id: string;
  documentId: string;
  documentTitle: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  ownerId: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Declined';
  requestedAt: string;
  respondedAt?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}
