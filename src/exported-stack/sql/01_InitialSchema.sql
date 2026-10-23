-- =========================================================================
-- TRUSTVAULT DATABASE SCHEMA (MICROSOFT SQL SERVER 2022 / AZURE SQL)
-- High-security multi-tenant document management with granular RBAC & audit
-- =========================================================================

CREATE DATABASE TrustVaultDb;
GO

USE TrustVaultDb;
GO

-- 1. Users Table
CREATE TABLE [dbo].[Users] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [FullName] NVARCHAR(150) NOT NULL,
    [Email] NVARCHAR(256) NOT NULL,
    [NormalizedEmail] NVARCHAR(256) NOT NULL,
    [PasswordHash] NVARCHAR(MAX) NOT NULL,
    [SecurityStamp] NVARCHAR(MAX) NOT NULL,
    [IsEmailVerified] BIT NOT NULL DEFAULT 0,
    [EmailVerifiedAt] DATETIMEOFFSET NULL,
    [SecurityLevel] NVARCHAR(50) NOT NULL DEFAULT 'ZERO_KNOWLEDGE_TIER_1',
    [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [UpdatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [UQ_Users_NormalizedEmail] UNIQUE ([NormalizedEmail])
);
CREATE NONCLUSTERED INDEX [IX_Users_NormalizedEmail] ON [dbo].[Users] ([NormalizedEmail]);
GO

-- 2. Workspaces Table (Supports Personal & Corporate Workspaces)
CREATE TABLE [dbo].[Workspaces] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name] NVARCHAR(120) NOT NULL,
    [Slug] NVARCHAR(80) NOT NULL,
    [WorkspaceType] NVARCHAR(20) NOT NULL, -- 'Personal' or 'Corporate'
    [Description] NVARCHAR(500) NULL,
    [OwnerId] UNIQUEIDENTIFIER NOT NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [UpdatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [FK_Workspaces_Users_OwnerId] FOREIGN KEY ([OwnerId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [UQ_Workspaces_Slug] UNIQUE ([Slug])
);
CREATE NONCLUSTERED INDEX [IX_Workspaces_Slug] ON [dbo].[Workspaces] ([Slug]);
CREATE NONCLUSTERED INDEX [IX_Workspaces_OwnerId] ON [dbo].[Workspaces] ([OwnerId]);
GO

-- 3. Organisation Memberships (Role: Admin, Member, Auditor)
CREATE TABLE [dbo].[OrganisationMembers] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [WorkspaceId] UNIQUEIDENTIFIER NOT NULL,
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [Role] NVARCHAR(30) NOT NULL, -- 'Admin', 'Member', 'Auditor'
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'Active',
    [JoinedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [FK_OrgMembers_Workspaces] FOREIGN KEY ([WorkspaceId]) REFERENCES [dbo].[Workspaces] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_OrgMembers_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_OrgMembers_Workspace_User] UNIQUE ([WorkspaceId], [UserId])
);
CREATE NONCLUSTERED INDEX [IX_OrgMembers_WorkspaceId] ON [dbo].[OrganisationMembers] ([WorkspaceId]);
CREATE NONCLUSTERED INDEX [IX_OrgMembers_UserId] ON [dbo].[OrganisationMembers] ([UserId]);
GO

-- 4. Documents Table (Metadata only; physical files stored outside web root)
CREATE TABLE [dbo].[Documents] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [WorkspaceId] UNIQUEIDENTIFIER NOT NULL,
    [OwnerId] UNIQUEIDENTIFIER NOT NULL,
    [Title] NVARCHAR(255) NOT NULL,
    [OriginalFilename] NVARCHAR(255) NOT NULL,
    [SanitizedStorageKey] NVARCHAR(500) NOT NULL,
    [ContentType] NVARCHAR(100) NOT NULL,
    [FileSizeBytes] BIGINT NOT NULL,
    [Category] NVARCHAR(50) NOT NULL, -- 'Financial', 'Legal', 'Technical', 'HR', 'Personal', 'Other'
    [Description] NVARCHAR(1000) NULL,
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Archived'
    [StorageLocationId] NVARCHAR(100) NOT NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [UpdatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [FK_Documents_Workspaces] FOREIGN KEY ([WorkspaceId]) REFERENCES [dbo].[Workspaces] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Documents_Users_OwnerId] FOREIGN KEY ([OwnerId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION
);
CREATE NONCLUSTERED INDEX [IX_Documents_WorkspaceId] ON [dbo].[Documents] ([WorkspaceId]);
CREATE NONCLUSTERED INDEX [IX_Documents_OwnerId] ON [dbo].[Documents] ([OwnerId]);
GO

-- 5. Document Permission Grants (Granular READ / EDIT sharing)
CREATE TABLE [dbo].[DocumentPermissionGrants] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [DocumentId] UNIQUEIDENTIFIER NOT NULL,
    [GranteeUserId] UNIQUEIDENTIFIER NOT NULL,
    [PermissionLevel] NVARCHAR(20) NOT NULL, -- 'READ', 'EDIT'
    [GrantedByUserId] UNIQUEIDENTIFIER NOT NULL,
    [GrantedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Revoked'
    CONSTRAINT [FK_Grants_Documents] FOREIGN KEY ([DocumentId]) REFERENCES [dbo].[Documents] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Grants_Users_Grantee] FOREIGN KEY ([GranteeUserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Grants_Users_GrantedBy] FOREIGN KEY ([GrantedByUserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION
);
CREATE NONCLUSTERED INDEX [IX_Grants_DocumentId] ON [dbo].[DocumentPermissionGrants] ([DocumentId]);
CREATE NONCLUSTERED INDEX [IX_Grants_GranteeUserId] ON [dbo].[DocumentPermissionGrants] ([GranteeUserId]);
GO

-- 6. Organisation Invitations
CREATE TABLE [dbo].[Invitations] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [WorkspaceId] UNIQUEIDENTIFIER NOT NULL,
    [RecipientEmail] NVARCHAR(256) NOT NULL,
    [Role] NVARCHAR(30) NOT NULL,
    [TokenHash] NVARCHAR(256) NOT NULL,
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Accepted', 'Revoked', 'Expired'
    [ExpiresAt] DATETIMEOFFSET NOT NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [FK_Invitations_Workspaces] FOREIGN KEY ([WorkspaceId]) REFERENCES [dbo].[Workspaces] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_Invitations_TokenHash] UNIQUE ([TokenHash])
);
CREATE NONCLUSTERED INDEX [IX_Invitations_TokenHash] ON [dbo].[Invitations] ([TokenHash]);
CREATE NONCLUSTERED INDEX [IX_Invitations_RecipientEmail] ON [dbo].[Invitations] ([RecipientEmail]);
GO

-- 7. Audit Events (Tamper-evident system activity log)
CREATE TABLE [dbo].[AuditEvents] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [WorkspaceId] UNIQUEIDENTIFIER NULL,
    [ActorId] UNIQUEIDENTIFIER NULL,
    [ActorEmail] NVARCHAR(256) NOT NULL,
    [Action] NVARCHAR(50) NOT NULL,
    [ResourceType] NVARCHAR(50) NOT NULL,
    [ResourceId] NVARCHAR(100) NOT NULL,
    [ResourceName] NVARCHAR(255) NOT NULL,
    [Outcome] NVARCHAR(20) NOT NULL, -- 'SUCCESS', 'DENIED', 'FAILED'
    [Timestamp] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [Details] NVARCHAR(2000) NOT NULL
);
CREATE NONCLUSTERED INDEX [IX_AuditEvents_WorkspaceId_Timestamp] ON [dbo].[AuditEvents] ([WorkspaceId], [Timestamp] DESC);
CREATE NONCLUSTERED INDEX [IX_AuditEvents_ActorEmail] ON [dbo].[AuditEvents] ([ActorEmail]);
GO
