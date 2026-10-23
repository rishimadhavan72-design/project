import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEffectivePermission,
  canReadDocument,
  canDownloadDocument,
  canEditDocument,
  canDeleteDocument,
  canManagePermissions,
  validateUploadFile,
  validateInvitation,
  MAX_UPLOAD_SIZE_BYTES,
} from './security-rules';
import {
  DocumentItem,
  DocumentPermissionGrant,
  OrganisationMember,
  User,
  Workspace,
  Invitation,
} from '../types/trustvault';

const userA: User = {
  id: 'usr_1',
  fullName: 'User A (Personal)',
  email: 'usera@example.com',
  isEmailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const userB: User = {
  id: 'usr_2',
  fullName: 'User B',
  email: 'userb@example.com',
  isEmailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const orgAdminUser: User = {
  id: 'usr_admin',
  fullName: 'Org Admin',
  email: 'admin@acmecorp.com',
  isEmailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const foreignUser: User = {
  id: 'usr_foreign',
  fullName: 'External Person',
  email: 'external@othercompany.com',
  isEmailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const personalWorkspaceA: Workspace = {
  id: 'ws_personal_a',
  name: 'Personal Workspace',
  slug: 'personal-usera',
  type: 'personal',
  ownerId: userA.id,
  createdAt: '2026-01-01T00:00:00Z',
};

const corporateWorkspaceAcme: Workspace = {
  id: 'ws_corp_acme',
  name: 'Acme Corp',
  slug: 'acme-corp',
  type: 'corporate',
  ownerId: orgAdminUser.id,
  createdAt: '2026-01-01T00:00:00Z',
};

const corporateWorkspaceTechNova: Workspace = {
  id: 'ws_corp_technova',
  name: 'TechNova',
  slug: 'technova',
  type: 'corporate',
  ownerId: foreignUser.id,
  createdAt: '2026-01-01T00:00:00Z',
};

const allWorkspaces = [personalWorkspaceA, corporateWorkspaceAcme, corporateWorkspaceTechNova];

const personalDocA: DocumentItem = {
  id: 'doc_personal_1',
  workspaceId: personalWorkspaceA.id,
  ownerId: userA.id,
  ownerName: userA.fullName,
  ownerEmail: userA.email,
  title: 'Tax_Returns_2025.pdf',
  originalFilename: 'Tax_Returns_2025.pdf',
  sanitizedStorageKey: 'vault/personal/tax.pdf',
  contentType: 'application/pdf',
  fileSizeBytes: 1024 * 500,
  category: 'Financial',
  status: 'Active',
  storageLocationId: 'loc_enc_01',
  createdAt: '2026-01-10T00:00:00Z',
  updatedAt: '2026-01-10T00:00:00Z',
};

const corporateDocAcme: DocumentItem = {
  id: 'doc_corp_1',
  workspaceId: corporateWorkspaceAcme.id,
  ownerId: userB.id,
  ownerName: userB.fullName,
  ownerEmail: userB.email,
  title: 'Q1_Financial_Forecast.xlsx',
  originalFilename: 'Q1_Financial_Forecast.xlsx',
  sanitizedStorageKey: 'vault/acme/q1.xlsx',
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  fileSizeBytes: 1024 * 800,
  category: 'Financial',
  status: 'Active',
  storageLocationId: 'loc_enc_02',
  createdAt: '2026-02-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
};

const acmeMemberships: OrganisationMember[] = [
  {
    id: 'mem_1',
    workspaceId: corporateWorkspaceAcme.id,
    userId: orgAdminUser.id,
    userEmail: orgAdminUser.email,
    userName: orgAdminUser.fullName,
    role: 'Admin',
    status: 'Active',
    joinedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'mem_2',
    workspaceId: corporateWorkspaceAcme.id,
    userId: userB.id,
    userEmail: userB.email,
    userName: userB.fullName,
    role: 'Member',
    status: 'Active',
    joinedAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'mem_3',
    workspaceId: corporateWorkspaceAcme.id,
    userId: userA.id,
    userEmail: userA.email,
    userName: userA.fullName,
    role: 'Member',
    status: 'Active',
    joinedAt: '2026-01-15T00:00:00Z',
  },
];

// Test 1: Unauthenticated user attempts to read a document -> NONE
test('1. Unauthenticated user has effective permission NONE', () => {
  const perm = computeEffectivePermission(personalDocA, null, [], [], allWorkspaces);
  assert.equal(perm, 'NONE');
  assert.equal(canReadDocument(perm), false);
});

// Test 2: NONE user attempts to download -> denied
test('2. NONE user cannot download document', () => {
  assert.equal(canDownloadDocument('NONE'), false);
  assert.equal(canDownloadDocument('NONE', true), false);
});

// Test 2b: READ user cannot download directly, must ask owner permission
test('2b. READ user cannot download directly without explicit owner approval', () => {
  assert.equal(canDownloadDocument('READ', false), false);
  assert.equal(canDownloadDocument('READ'), false);
});

// Test 2c: READ user with explicit owner approval CAN download
test('2c. READ user with explicit owner approval can download', () => {
  assert.equal(canDownloadDocument('READ', true), true);
});

// Test 2d: EDIT and OWNER users can download directly
test('2d. EDIT and OWNER users can download directly without extra approval', () => {
  assert.equal(canDownloadDocument('EDIT'), true);
  assert.equal(canDownloadDocument('OWNER'), true);
});

// Test 3: READ user attempts to edit -> denied
test('3. READ user cannot edit document', () => {
  assert.equal(canReadDocument('READ'), true);
  assert.equal(canEditDocument('READ'), false);
});

// Test 4: READ user attempts to delete -> denied
test('4. READ user cannot delete document', () => {
  assert.equal(canDeleteDocument('READ'), false);
});

// Test 5: EDIT user attempts to manage permissions -> denied
test('5. EDIT user cannot manage permissions', () => {
  assert.equal(canEditDocument('EDIT'), true);
  assert.equal(canManagePermissions('EDIT'), false);
});

// Test 6: EDIT user attempts to delete the original -> denied
test('6. EDIT user cannot delete original document', () => {
  assert.equal(canDeleteDocument('EDIT'), false);
});

// Test 7: OWNER grants READ -> recipient has READ
test('7. OWNER grants READ to another user', () => {
  const grants: DocumentPermissionGrant[] = [
    {
      id: 'g1',
      documentId: corporateDocAcme.id,
      granteeUserId: userA.id,
      granteeEmail: userA.email,
      granteeName: userA.fullName,
      permission: 'READ',
      grantedByUserId: userB.id,
      grantedAt: '2026-02-02T00:00:00Z',
      status: 'Active',
    },
  ];
  const perm = computeEffectivePermission(corporateDocAcme, userA, grants, acmeMemberships, allWorkspaces);
  assert.equal(perm, 'READ');
  assert.equal(canReadDocument(perm), true);
  assert.equal(canEditDocument(perm), false);
});

// Test 8: OWNER grants EDIT -> recipient has EDIT
test('8. OWNER grants EDIT to another user', () => {
  const grants: DocumentPermissionGrant[] = [
    {
      id: 'g2',
      documentId: corporateDocAcme.id,
      granteeUserId: userA.id,
      granteeEmail: userA.email,
      granteeName: userA.fullName,
      permission: 'EDIT',
      grantedByUserId: userB.id,
      grantedAt: '2026-02-02T00:00:00Z',
      status: 'Active',
    },
  ];
  const perm = computeEffectivePermission(corporateDocAcme, userA, grants, acmeMemberships, allWorkspaces);
  assert.equal(perm, 'EDIT');
  assert.equal(canReadDocument(perm), true);
  assert.equal(canEditDocument(perm), true);
  assert.equal(canDeleteDocument(perm), false);
  assert.equal(canManagePermissions(perm), false);
});

// Test 9 & 10: OWNER revokes grant -> recipient reverts to NONE
test('9 & 10. Revoking grant immediately reverts effective permission to NONE', () => {
  const revokedGrants: DocumentPermissionGrant[] = [
    {
      id: 'g1',
      documentId: corporateDocAcme.id,
      granteeUserId: userA.id,
      granteeEmail: userA.email,
      granteeName: userA.fullName,
      permission: 'READ',
      grantedByUserId: userB.id,
      grantedAt: '2026-02-02T00:00:00Z',
      status: 'Revoked',
    },
  ];
  const perm = computeEffectivePermission(corporateDocAcme, userA, revokedGrants, acmeMemberships, allWorkspaces);
  assert.equal(perm, 'NONE');
  assert.equal(canReadDocument(perm), false);
  assert.equal(canDownloadDocument(perm), false);
});

// Test 11: User A attempts to access User B's private document -> NONE
test("11. User B cannot access User A's private personal document", () => {
  const perm = computeEffectivePermission(personalDocA, userB, [], [], allWorkspaces);
  assert.equal(perm, 'NONE');
});

// Test 12: Company A member attempts to access Company B's documents -> NONE (Tenant isolation)
test('12. Cross-tenant isolation: Foreign company user cannot access Acme document', () => {
  const perm = computeEffectivePermission(corporateDocAcme, foreignUser, [], acmeMemberships, allWorkspaces);
  assert.equal(perm, 'NONE');
});

// Test 13: Organisation administrator attempts to read a document without a grant -> NONE
test('13. Org Admin does not automatically gain READ permission on unshared docs', () => {
  const perm = computeEffectivePermission(corporateDocAcme, orgAdminUser, [], acmeMemberships, allWorkspaces);
  assert.equal(perm, 'NONE');
  assert.equal(canReadDocument(perm), false);
});

// Test 14: Dangerous upload file (.exe) rejected
test('14. Prohibits dangerous file extensions', () => {
  const res = validateUploadFile({ name: 'malware.exe', size: 1024 });
  assert.equal(res.valid, false);
  assert.match(res.error || '', /prohibited/i);
});

// Test 15: File upload exceeding size limit
test('15. Prohibits file larger than max size limit (25MB)', () => {
  const res = validateUploadFile({ name: 'huge_backup.pdf', size: MAX_UPLOAD_SIZE_BYTES + 1000 });
  assert.equal(res.valid, false);
  assert.match(res.error || '', /exceeds/i);
});

// Test 16: Expired invitation is rejected
test('16. Rejects expired invitation', () => {
  const inv: Invitation = {
    id: 'inv_1',
    workspaceId: corporateWorkspaceAcme.id,
    workspaceName: 'Acme Corp',
    inviterName: 'Sarah Admin',
    recipientEmail: 'alex@example.com',
    role: 'Member',
    token: 'tok_expired_123',
    status: 'Expired',
    expiresAt: '2026-01-01T00:00:00Z',
    createdAt: '2025-12-01T00:00:00Z',
  };
  const res = validateInvitation(inv, 'alex@example.com');
  assert.equal(res.valid, false);
  assert.match(res.reason || '', /expired/i);
});

// Test 17: Revoked invitation is rejected
test('17. Rejects revoked invitation', () => {
  const inv: Invitation = {
    id: 'inv_2',
    workspaceId: corporateWorkspaceAcme.id,
    workspaceName: 'Acme Corp',
    inviterName: 'Sarah Admin',
    recipientEmail: 'alex@example.com',
    role: 'Member',
    token: 'tok_revoked_123',
    status: 'Revoked',
    expiresAt: '2026-12-31T00:00:00Z',
    createdAt: '2026-02-01T00:00:00Z',
  };
  const res = validateInvitation(inv, 'alex@example.com');
  assert.equal(res.valid, false);
  assert.match(res.reason || '', /revoked/i);
});

// Test 18: Invitation accepted by wrong recipient email is rejected
test('18. Rejects invitation accepted by different email', () => {
  const inv: Invitation = {
    id: 'inv_3',
    workspaceId: corporateWorkspaceAcme.id,
    workspaceName: 'Acme Corp',
    inviterName: 'Sarah Admin',
    recipientEmail: 'intended@example.com',
    role: 'Member',
    token: 'tok_valid_123',
    status: 'Pending',
    expiresAt: '2026-12-31T00:00:00Z',
    createdAt: '2026-02-01T00:00:00Z',
  };
  const res = validateInvitation(inv, 'imposter@example.com');
  assert.equal(res.valid, false);
  assert.match(res.reason || '', /issued to intended@example.com/i);
});

// Test 19: Administrator-rejected invitation is blocked
test('19. Rejects invitation marked as Rejected by Administrator', () => {
  const inv: Invitation = {
    id: 'inv_rejected_1',
    workspaceId: corporateWorkspaceAcme.id,
    workspaceName: 'Acme Corp',
    inviterName: 'Sarah Admin',
    recipientEmail: 'applicant@example.com',
    role: 'Member',
    token: 'tok_rejected_test',
    status: 'Rejected',
    expiresAt: '2026-12-31T00:00:00Z',
    createdAt: '2026-02-01T00:00:00Z',
  };
  const res = validateInvitation(inv, 'applicant@example.com');
  assert.equal(res.valid, false);
  assert.match(res.reason || '', /rejected/i);
});

// Test 20: Unverified user cannot download documents directly
test('20. Unverified user account cannot download documents without verified email', () => {
  const unverifiedUser: User = {
    id: 'usr_unverified',
    fullName: 'Unverified Bob',
    email: 'unverified@example.com',
    isEmailVerified: false,
    createdAt: '2026-01-01T00:00:00Z',
  };

  // Zero-trust verification: unverified accounts are strictly denied permission
  const perm = computeEffectivePermission(
    personalDocA,
    unverifiedUser,
    [],
    [],
    allWorkspaces
  );
  assert.equal(perm, 'NONE');
  const allowed = canDownloadDocument(perm, false);
  assert.equal(allowed, false);
});

// Test 21: Verified user account can download documents when permitted
test('21. Verified user account can download documents when permitted', () => {
  const verifiedUser: User = {
    id: userA.id,
    fullName: userA.fullName,
    email: userA.email,
    isEmailVerified: true,
    createdAt: '2026-01-01T00:00:00Z',
  };

  const perm = computeEffectivePermission(
    personalDocA,
    verifiedUser,
    [],
    [],
    allWorkspaces
  );
  assert.equal(perm, 'OWNER');
  const allowed = canDownloadDocument(perm, false);
  assert.equal(allowed, true);
});

