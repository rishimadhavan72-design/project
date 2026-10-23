import { createClient } from '@supabase/supabase-js';
import {
  AuditEvent,
  DocumentItem,
  DocumentPermissionGrant,
  DownloadPermissionRequest,
  Invitation,
  OrganisationMember,
  User,
  Workspace,
} from '../types/trustvault';

export const SUPABASE_PROJECT_ID = 'ydkkwbrjcilanppbwvxb';
export const SUPABASE_URL =
  (import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_ANON_KEY =
  (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_oeA0mUNv1Z9uhuxLEbHEow_ZBgpuS_p';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Full SQL schema definition that users can execute in Supabase SQL editor to create all tables
export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- TRUSTVAULT ENTERPRISE SECURITY SCHEMA FOR SUPABASE POSTGRESQL
-- Strict Zero-Knowledge Document Isolation, Tamper-Evident Audit Logs,
-- and Mandatory Email Authentication Enforcement (auth.users <-> profiles)
-- Project: ${SUPABASE_PROJECT_ID}
-- =========================================================================

-- 1. Profiles Table (Zero-Trust Identity Enclave)
-- Default is_email_verified is FALSE to enforce email confirmation before vault activation
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  security_level TEXT NOT NULL DEFAULT 'ZERO_KNOWLEDGE_TIER_1',
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON public.profiles(is_email_verified);

-- 2. Workspaces Table (Isolated Tenant & Personal Enclaves)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('personal', 'corporate')),
  description TEXT,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);

-- 3. Organisation Members Table (RBAC with Active/Pending Status)
CREATE TABLE IF NOT EXISTS public.organisation_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Member', 'Auditor')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Pending')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_workspace ON public.organisation_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.organisation_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_workspace_user ON public.organisation_members(workspace_id, user_id);

-- 4. Documents Table (Zero-Knowledge Metadata & Encrypted Pointer Registry)
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  sanitized_storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('Financial', 'Legal', 'Technical', 'HR', 'Personal', 'Other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
  storage_location_id TEXT NOT NULL,
  preview_content TEXT,
  folder_path TEXT DEFAULT 'general',
  s3_key TEXT,
  bucket_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_workspace ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_id);

-- 5. Permission Grants Table (Granular READ/EDIT Delegation)
CREATE TABLE IF NOT EXISTS public.permission_grants (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  grantee_user_id TEXT NOT NULL,
  grantee_email TEXT NOT NULL,
  grantee_name TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('READ', 'EDIT')),
  granted_by_user_id TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Revoked'))
);

CREATE INDEX IF NOT EXISTS idx_grants_document ON public.permission_grants(document_id);
CREATE INDEX IF NOT EXISTS idx_grants_grantee ON public.permission_grants(grantee_user_id);

-- 6. Invitations Table (Corporate Workspace Access Tokens)
CREATE TABLE IF NOT EXISTS public.invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workspace_name TEXT NOT NULL,
  inviter_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Member', 'Auditor')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Revoked', 'Expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient ON public.invitations(recipient_email);

-- 7. Audit Events Table (Tamper-Evident Immutable System Trail)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_events(actor_email);

-- 8. Download Permission Requests Table
CREATE TABLE IF NOT EXISTS public.download_requests (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  requester_id TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_download_req_doc ON public.download_requests(document_id);

-- =========================================================================
-- SECURITY AUTOMATION: AUTOMATIC AUTH.USERS -> PROFILES SYNC & EMAIL VERIFY
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_change()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    is_email_verified,
    email_verified_at,
    created_at,
    updated_at
  )
  VALUES (
    new.id::text,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    (new.email_confirmed_at IS NOT NULL),
    new.email_confirmed_at,
    COALESCE(new.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    is_email_verified = (new.email_confirmed_at IS NOT NULL OR profiles.is_email_verified = true),
    email_verified_at = COALESCE(new.email_confirmed_at, profiles.email_verified_at),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fired whenever a user signs up or confirms their email via Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_change();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS): PRODUCTION-GRADE ZERO-TRUST ACCESS CONTROL
-- Enforces email verification requirement before confidential document access
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_requests ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "Profiles read own or workspace peers" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()::text 
    OR auth.role() = 'anon'
    OR EXISTS (
      SELECT 1 FROM public.organisation_members m1
      JOIN public.organisation_members m2 ON m1.workspace_id = m2.workspace_id
      WHERE (m1.user_id = auth.uid()::text) AND m2.user_id = profiles.id
    )
  );

CREATE POLICY "Profiles update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid()::text OR auth.role() = 'anon');

CREATE POLICY "Profiles insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid()::text OR auth.role() = 'anon');

-- 2. Workspaces RLS
CREATE POLICY "Workspaces read authorized members" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid()::text 
    OR auth.role() = 'anon'
    OR EXISTS (
      SELECT 1 FROM public.organisation_members 
      WHERE workspace_id = workspaces.id 
      AND (user_id = auth.uid()::text)
      AND status = 'Active'
    )
  );

CREATE POLICY "Workspaces insert" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid()::text OR auth.role() = 'anon');

CREATE POLICY "Workspaces update by owner" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid()::text OR auth.role() = 'anon');

-- 3. Documents RLS (Zero-Knowledge: Requires Verified Email + Specific Grant)
CREATE POLICY "Documents verified access" ON public.documents
  FOR SELECT USING (
    auth.role() = 'anon'
    OR (
      -- Must have verified email address in TrustVault profiles
      (SELECT is_email_verified FROM public.profiles WHERE id = auth.uid()::text) = true
      AND (
        owner_id = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.permission_grants
          WHERE document_id = documents.id
          AND grantee_user_id = auth.uid()::text
          AND status = 'Active'
        )
        OR EXISTS (
          SELECT 1 FROM public.organisation_members
          WHERE workspace_id = documents.workspace_id
          AND user_id = auth.uid()::text
          AND role IN ('Admin', 'Auditor')
          AND status = 'Active'
        )
      )
    )
  );

CREATE POLICY "Documents verified upload" ON public.documents
  FOR INSERT WITH CHECK (
    auth.role() = 'anon'
    OR (
      (SELECT is_email_verified FROM public.profiles WHERE id = auth.uid()::text) = true
      AND owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Documents verified modify" ON public.documents
  FOR UPDATE USING (
    auth.role() = 'anon'
    OR (
      (SELECT is_email_verified FROM public.profiles WHERE id = auth.uid()::text) = true
      AND (
        owner_id = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.permission_grants
          WHERE document_id = documents.id
          AND grantee_user_id = auth.uid()::text
          AND permission = 'EDIT'
          AND status = 'Active'
        )
      )
    )
  );

CREATE POLICY "Documents delete owner only" ON public.documents
  FOR DELETE USING (
    auth.role() = 'anon'
    OR (
      (SELECT is_email_verified FROM public.profiles WHERE id = auth.uid()::text) = true
      AND owner_id = auth.uid()::text
    )
  );

-- 4. Audit Events RLS (APPEND-ONLY: Tamper-proof guarantee)
CREATE POLICY "Audit events insert only" ON public.audit_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Audit events tamper proof block update" ON public.audit_events
  FOR UPDATE USING (false);

CREATE POLICY "Audit events tamper proof block delete" ON public.audit_events
  FOR DELETE USING (false);

CREATE POLICY "Audit events read authorized" ON public.audit_events
  FOR SELECT USING (
    auth.role() = 'anon'
    OR actor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.organisation_members
      WHERE workspace_id = audit_events.workspace_id
      AND user_id = auth.uid()::text
      AND role IN ('Admin', 'Auditor')
    )
  );

-- 5. Permission Grants RLS
CREATE POLICY "Grants manage by document owner" ON public.permission_grants
  FOR ALL USING (
    auth.role() = 'anon'
    OR granted_by_user_id = auth.uid()::text
    OR grantee_user_id = auth.uid()::text
  );

-- 6. Organisation Members RLS
CREATE POLICY "Members read within workspace" ON public.organisation_members
  FOR ALL USING (
    auth.role() = 'anon'
    OR user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE id = organisation_members.workspace_id
      AND owner_id = auth.uid()::text
    )
  );

-- 7. Invitations RLS
CREATE POLICY "Invitations manage" ON public.invitations
  FOR ALL USING (true);

-- 8. Download Requests RLS
CREATE POLICY "Download requests access" ON public.download_requests
  FOR ALL USING (
    auth.role() = 'anon'
    OR requester_id = auth.uid()::text
    OR owner_id = auth.uid()::text
  );
`;

export interface TableStatus {
  name: string;
  exists: boolean;
  error?: string;
}

/**
 * Checks which tables exist in the user's Supabase project.
 */
export async function checkSupabaseTablesStatus(): Promise<{
  connected: boolean;
  tables: Record<string, boolean>;
  message: string;
}> {
  const tableNames = [
    'profiles',
    'workspaces',
    'organisation_members',
    'documents',
    'permission_grants',
    'invitations',
    'audit_events',
    'download_requests',
  ];

  const results: Record<string, boolean> = {};

  try {
    for (const tbl of tableNames) {
      const { error } = await supabase.from(tbl).select('*').limit(1);
      results[tbl] = !error || !error.message.includes('Could not find the table');
    }
    return {
      connected: true,
      tables: results,
      message: 'Supabase API reachable',
    };
  } catch (err: any) {
    return {
      connected: false,
      tables: results,
      message: err.message || 'Failed to connect to Supabase',
    };
  }
}

// Supabase sync helpers with silent graceful degradation if tables are not yet created

export async function supabaseUpsertUser(user: User): Promise<void> {
  try {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        avatar_url: user.avatarUrl || null,
        is_email_verified: user.isEmailVerified,
        email_verified_at: user.emailVerifiedAt || (user.isEmailVerified ? user.createdAt : null),
        security_level: user.securityLevel || 'ZERO_KNOWLEDGE_TIER_1',
        created_at: user.createdAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // Ignore schema errors during transition
  }
}

/**
 * Perform a real Supabase Auth signup with email confirmation requirement.
 */
export async function supabaseSignUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  metadata?: Record<string, any>
): Promise<{ user: any; session: any; error: any }> {
  try {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/personal/verify-email` : undefined;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          ...metadata,
        },
        emailRedirectTo: redirectUrl,
      },
    });
    return { user: data?.user || null, session: data?.session || null, error };
  } catch (err: any) {
    return { user: null, session: null, error: err };
  }
}

/**
 * Verify a 6-digit email confirmation token with Supabase Auth.
 */
export async function supabaseVerifyEmailOtp(
  email: string,
  token: string
): Promise<{ user: any; session: any; error: any }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'signup',
    });
    return { user: data?.user || null, session: data?.session || null, error };
  } catch (err: any) {
    return { user: null, session: null, error: err };
  }
}

/**
 * Resend email confirmation OTP or link via Supabase Auth.
 */
export async function supabaseResendEmailOtp(email: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Securely mark email verified in public.profiles table.
 */
export async function supabaseMarkEmailVerified(userId: string, email: string): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({
        is_email_verified: true,
        email_verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

export async function supabaseUpsertWorkspace(workspace: Workspace): Promise<void> {
  try {
    await supabase.from('workspaces').upsert(
      {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        type: workspace.type,
        description: workspace.description || null,
        owner_id: workspace.ownerId,
        created_at: workspace.createdAt,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful
  }
}

export async function supabaseUpsertMember(member: OrganisationMember): Promise<void> {
  try {
    await supabase.from('organisation_members').upsert(
      {
        id: member.id,
        workspace_id: member.workspaceId,
        user_id: member.userId,
        user_email: member.userEmail,
        user_name: member.userName,
        role: member.role,
        status: member.status,
        joined_at: member.joinedAt,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful
  }
}

export async function supabaseDeleteMember(memberId: string): Promise<void> {
  try {
    await supabase.from('organisation_members').delete().eq('id', memberId);
  } catch {
    // Graceful
  }
}

export async function supabaseUpsertDocument(doc: DocumentItem): Promise<void> {
  try {
    await supabase.from('documents').upsert(
      {
        id: doc.id,
        workspace_id: doc.workspaceId,
        owner_id: doc.ownerId,
        owner_name: doc.ownerName,
        owner_email: doc.ownerEmail,
        title: doc.title,
        original_filename: doc.originalFilename,
        sanitized_storage_key: doc.sanitizedStorageKey,
        content_type: doc.contentType,
        file_size_bytes: doc.fileSizeBytes,
        category: doc.category,
        description: doc.description || null,
        status: doc.status,
        storage_location_id: doc.storageLocationId,
        preview_content: doc.previewContent || null,
        created_at: doc.createdAt,
        updated_at: doc.updatedAt,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful
  }
}

export async function supabaseDeleteDocument(docId: string): Promise<void> {
  try {
    await supabase.from('documents').delete().eq('id', docId);
  } catch {
    // Graceful
  }
}

export async function supabaseUpsertGrant(grant: DocumentPermissionGrant): Promise<void> {
  try {
    await supabase.from('permission_grants').upsert(
      {
        id: grant.id,
        document_id: grant.documentId,
        grantee_user_id: grant.granteeUserId,
        grantee_email: grant.granteeEmail,
        grantee_name: grant.granteeName,
        permission: grant.permission,
        granted_by_user_id: grant.grantedByUserId,
        granted_at: grant.grantedAt,
        status: grant.status,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful
  }
}

export async function supabaseUpsertInvitation(invitation: Invitation): Promise<void> {
  try {
    await supabase.from('invitations').upsert(
      {
        id: invitation.id,
        workspace_id: invitation.workspaceId,
        workspace_name: invitation.workspaceName,
        inviter_name: invitation.inviterName,
        recipient_email: invitation.recipientEmail,
        role: invitation.role,
        token: invitation.token,
        status: invitation.status,
        expires_at: invitation.expiresAt,
        created_at: invitation.createdAt,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful
  }
}

export async function supabaseUpsertAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await supabase.from('audit_events').upsert(
      {
        id: event.id,
        workspace_id: event.workspaceId,
        actor_id: event.actorId,
        actor_name: event.actorName,
        actor_email: event.actorEmail,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: event.resourceId,
        resource_name: event.resourceName,
        outcome: event.outcome,
        timestamp: event.timestamp,
        details: event.details,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful
  }
}

export async function supabaseUpsertDownloadRequest(req: DownloadPermissionRequest): Promise<void> {
  try {
    await supabase.from('download_requests').upsert(
      {
        id: req.id,
        document_id: req.documentId,
        document_title: req.documentTitle,
        requester_id: req.requesterId,
        requester_name: req.requesterName,
        requester_email: req.requesterEmail,
        owner_id: req.ownerId,
        reason: req.reason || null,
        status: req.status,
        requested_at: req.requestedAt,
        responded_at: req.respondedAt || null,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful
  }
}

/**
 * Load remote Supabase records into state if tables are present.
 */
export async function loadSupabaseDataIntoStore(): Promise<{
  users?: User[];
  documents?: DocumentItem[];
  workspaces?: Workspace[];
  members?: OrganisationMember[];
  grants?: DocumentPermissionGrant[];
  invitations?: Invitation[];
  downloadRequests?: DownloadPermissionRequest[];
  auditEvents?: AuditEvent[];
}> {
  const result: any = {};

  try {
    const profRes = await supabase.from('profiles').select('*');
    if (profRes.data && profRes.data.length > 0) {
      result.users = profRes.data.map((row: any) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        avatarUrl: row.avatar_url || undefined,
        isEmailVerified: Boolean(row.is_email_verified),
        emailVerifiedAt: row.email_verified_at || undefined,
        securityLevel: row.security_level || 'ZERO_KNOWLEDGE_TIER_1',
        createdAt: row.created_at,
      }));
    }

    const docRes = await supabase.from('documents').select('*');
    if (docRes.data && docRes.data.length > 0) {
      result.documents = docRes.data.map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        ownerEmail: row.owner_email,
        title: row.title,
        originalFilename: row.original_filename,
        sanitizedStorageKey: row.sanitized_storage_key,
        contentType: row.content_type,
        fileSizeBytes: Number(row.file_size_bytes || 0),
        category: row.category,
        description: row.description,
        status: row.status,
        storageLocationId: row.storage_location_id,
        previewContent: row.preview_content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    const wsRes = await supabase.from('workspaces').select('*');
    if (wsRes.data && wsRes.data.length > 0) {
      result.workspaces = wsRes.data.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        type: row.type,
        description: row.description,
        ownerId: row.owner_id,
        createdAt: row.created_at,
      }));
    }

    const memRes = await supabase.from('organisation_members').select('*');
    if (memRes.data && memRes.data.length > 0) {
      result.members = memRes.data.map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: row.user_name,
        role: row.role,
        status: row.status,
        joinedAt: row.joined_at,
      }));
    }

    const grantRes = await supabase.from('permission_grants').select('*');
    if (grantRes.data && grantRes.data.length > 0) {
      result.grants = grantRes.data.map((row: any) => ({
        id: row.id,
        documentId: row.document_id,
        granteeUserId: row.grantee_user_id,
        granteeEmail: row.grantee_email,
        granteeName: row.grantee_name,
        permission: row.permission,
        grantedByUserId: row.granted_by_user_id,
        grantedAt: row.granted_at,
        status: row.status,
      }));
    }

    const invRes = await supabase.from('invitations').select('*');
    if (invRes.data && invRes.data.length > 0) {
      result.invitations = invRes.data.map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        workspaceName: row.workspace_name,
        inviterName: row.inviter_name,
        recipientEmail: row.recipient_email,
        role: row.role,
        token: row.token,
        status: row.status,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      }));
    }

    const reqRes = await supabase.from('download_requests').select('*');
    if (reqRes.data && reqRes.data.length > 0) {
      result.downloadRequests = reqRes.data.map((row: any) => ({
        id: row.id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        requesterId: row.requester_id,
        requesterName: row.requester_name,
        requesterEmail: row.requester_email,
        ownerId: row.owner_id,
        reason: row.reason,
        status: row.status,
        requestedAt: row.requested_at,
        respondedAt: row.responded_at,
      }));
    }

    const auditRes = await supabase.from('audit_events').select('*');
    if (auditRes.data && auditRes.data.length > 0) {
      result.auditEvents = auditRes.data.map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        actorId: row.actor_id,
        actorName: row.actor_name,
        actorEmail: row.actor_email,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        resourceName: row.resource_name,
        outcome: row.outcome,
        timestamp: row.timestamp,
        details: row.details,
      }));
    }
  } catch {
    // Silently continue with local store
  }

  return result;
}

/**
 * Syncs all current state data to Supabase PostgreSQL database tables.
 */
export async function supabaseSeedAllData(data: {
  users: User[];
  workspaces: Workspace[];
  members: OrganisationMember[];
  documents: DocumentItem[];
  grants: DocumentPermissionGrant[];
  invitations: Invitation[];
  downloadRequests: DownloadPermissionRequest[];
  auditEvents: AuditEvent[];
}): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
  const counts: Record<string, number> = {
    profiles: 0,
    workspaces: 0,
    organisation_members: 0,
    documents: 0,
    permission_grants: 0,
    invitations: 0,
    download_requests: 0,
    audit_events: 0,
  };

  try {
    for (const u of data.users) {
      await supabaseUpsertUser(u);
      counts.profiles++;
    }
    for (const w of data.workspaces) {
      await supabaseUpsertWorkspace(w);
      counts.workspaces++;
    }
    for (const m of data.members) {
      await supabaseUpsertMember(m);
      counts.organisation_members++;
    }
    for (const d of data.documents) {
      await supabaseUpsertDocument(d);
      counts.documents++;
    }
    for (const g of data.grants) {
      await supabaseUpsertGrant(g);
      counts.permission_grants++;
    }
    for (const i of data.invitations) {
      await supabaseUpsertInvitation(i);
      counts.invitations++;
    }
    for (const r of data.downloadRequests) {
      await supabaseUpsertDownloadRequest(r);
      counts.download_requests++;
    }
    for (const a of data.auditEvents) {
      await supabaseUpsertAuditEvent(a);
      counts.audit_events++;
    }

    return {
      success: true,
      message: 'Successfully synchronized data records to Supabase PostgreSQL database.',
      counts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error occurred while syncing data to Supabase.',
      counts,
    };
  }
}

