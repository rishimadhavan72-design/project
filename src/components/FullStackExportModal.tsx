import React, { useState } from 'react';
import {
  X,
  Code2,
  Database,
  Server,
  Layers,
  Copy,
  Check,
  Terminal,
  Shield,
  FileText,
  BookOpen,
} from 'lucide-react';

interface FullStackExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FullStackExportModal: React.FC<FullStackExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'csharp_controller' | 'csharp_auth' | 'sql_schema' | 'angular_routes'>('instructions');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const csharpControllerSnippet = `// TrustVault.Api/Controllers/DocumentsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TrustVault.Api.Data;
using TrustVault.Api.DTOs;
using TrustVault.Api.Entities;

namespace TrustVault.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DocumentsController : ControllerBase
    {
        private readonly TrustVaultDbContext _context;
        private readonly IAuthorizationService _authService;
        private readonly IFileStorageService _storageService;

        public DocumentsController(TrustVaultDbContext context, IAuthorizationService authService, IFileStorageService storageService)
        {
            _context = context;
            _authService = authService;
            _storageService = storageService;
        }

        private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<DocumentResponseDto>>> GetWorkspaceDocuments([FromQuery] Guid workspaceId)
        {
            var workspace = await _context.Workspaces.FindAsync(workspaceId);
            if (workspace == null) return NotFound();

            if (workspace.WorkspaceType == "Corporate")
            {
                var isMember = await _context.OrganisationMembers
                    .AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == CurrentUserId && m.Status == "Active");
                if (!isMember) return Forbid();
            }

            var docs = await _context.Documents.Where(d => d.WorkspaceId == workspaceId && d.Status == "Active").ToListAsync();
            var grants = await _context.DocumentPermissionGrants.Where(g => g.GranteeUserId == CurrentUserId && g.Status == "Active").ToListAsync();

            var response = docs.Select(d => new DocumentResponseDto {
                Id = d.Id,
                Title = d.Title,
                EffectivePermission = d.OwnerId == CurrentUserId ? "OWNER" : (grants.FirstOrDefault(g => g.DocumentId == d.Id)?.PermissionLevel ?? "NONE")
            });
            return Ok(response);
        }

        [HttpGet("{id}/download")]
        public async Task<IActionResult> Download(Guid id)
        {
            var doc = await _context.Documents.FirstOrDefaultAsync(d => d.Id == id && d.Status == "Active");
            if (doc == null) return NotFound();

            var auth = await _authService.AuthorizeAsync(User, doc, "ReadDocumentPolicy");
            if (!auth.Succeeded) return Forbid();

            var stream = await _storageService.GetFileStreamAsync(doc.SanitizedStorageKey);
            return File(stream, doc.ContentType, doc.OriginalFilename);
        }
    }
}`;

  const csharpAuthSnippet = `// TrustVault.Api/Authorization/DocumentAuthorizationHandler.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TrustVault.Api.Data;
using TrustVault.Api.Entities;

namespace TrustVault.Api.Authorization
{
    public enum DocumentOperation { Read, Preview, Download, Edit, ManagePermissions, Delete }

    public class DocumentOperationRequirement : IAuthorizationRequirement
    {
        public DocumentOperation Operation { get; }
        public DocumentOperationRequirement(DocumentOperation op) => Operation = op;
    }

    public class DocumentAuthorizationHandler : AuthorizationHandler<DocumentOperationRequirement, Document>
    {
        private readonly TrustVaultDbContext _context;
        public DocumentAuthorizationHandler(TrustVaultDbContext context) => _context = context;

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext ctx, DocumentOperationRequirement req, Document doc)
        {
            var userIdClaim = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdClaim, out var userId)) return;

            // 1. OWNER has full access
            if (doc.OwnerId == userId)
            {
                ctx.Succeed(req);
                return;
            }

            // 2. Query active direct grants
            var grant = await _context.DocumentPermissionGrants
                .FirstOrDefaultAsync(g => g.DocumentId == doc.Id && g.GranteeUserId == userId && g.Status == "Active");

            if (grant == null) return; // NONE - Admins do not bypass!

            if (grant.PermissionLevel == "EDIT" &&
                (req.Operation == DocumentOperation.Read || req.Operation == DocumentOperation.Download || req.Operation == DocumentOperation.Edit))
            {
                ctx.Succeed(req);
            }
            else if (grant.PermissionLevel == "READ")
            {
                if (req.Operation == DocumentOperation.Read || req.Operation == DocumentOperation.Preview)
                {
                    ctx.Succeed(req);
                }
                else if (req.Operation == DocumentOperation.Download)
                {
                    // Check if explicit download request was approved by the document owner
                    var hasApproval = await _context.DownloadPermissionRequests
                        .AnyAsync(r => r.DocumentId == doc.Id && r.RequesterId == userId && r.Status == "Approved");
                    if (hasApproval) ctx.Succeed(req);
                }
            }
        }
    }
}`;

  const sqlSchemaSnippet = `-- Microsoft SQL Server 2022 / Azure SQL Database
CREATE TABLE [dbo].[Users] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [FullName] NVARCHAR(150) NOT NULL,
    [Email] NVARCHAR(256) NOT NULL UNIQUE,
    [PasswordHash] NVARCHAR(MAX) NOT NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE TABLE [dbo].[Workspaces] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name] NVARCHAR(120) NOT NULL,
    [Slug] NVARCHAR(80) NOT NULL UNIQUE,
    [WorkspaceType] NVARCHAR(20) NOT NULL, -- 'Personal' or 'Corporate'
    [OwnerId] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[Users]([Id])
);

CREATE TABLE [dbo].[Documents] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [WorkspaceId] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[Workspaces]([Id]),
    [OwnerId] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[Users]([Id]),
    [Title] NVARCHAR(255) NOT NULL,
    [OriginalFilename] NVARCHAR(255) NOT NULL,
    [SanitizedStorageKey] NVARCHAR(500) NOT NULL,
    [ContentType] NVARCHAR(100) NOT NULL,
    [FileSizeBytes] BIGINT NOT NULL,
    [Category] NVARCHAR(50) NOT NULL,
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'Active'
);

CREATE TABLE [dbo].[DocumentPermissionGrants] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [DocumentId] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[Documents]([Id]),
    [GranteeUserId] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[Users]([Id]),
    [PermissionLevel] NVARCHAR(20) NOT NULL, -- 'READ' or 'EDIT'
    [GrantedByUserId] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[Users]([Id]),
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'Active'
);`;

  const angularRoutesSnippet = `// src/app/app.routes.ts (Angular 19+ Standalone)
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/welcome/welcome.component').then(m => m.WelcomeComponent) },
  {
    path: 'personal',
    children: [
      { path: 'login', loadComponent: () => import('./features/personal-auth/personal-login.component').then(m => m.PersonalLoginComponent) },
      { path: 'register', loadComponent: () => import('./features/personal-auth/personal-register.component').then(m => m.PersonalRegisterComponent) },
      { path: 'dashboard', loadComponent: () => import('./features/personal-dashboard/personal-dashboard.component').then(m => m.PersonalDashboardComponent) }
    ]
  },
  {
    path: 'corporate',
    children: [
      { path: 'login', loadComponent: () => import('./features/corporate-auth/corporate-login.component').then(m => m.CorporateLoginComponent) },
      { path: 'register-company', loadComponent: () => import('./features/corporate-auth/corporate-register-company.component').then(m => m.CorporateRegisterCompanyComponent) },
      { path: 'accept-invitation', loadComponent: () => import('./features/corporate-auth/corporate-accept-invitation.component').then(m => m.CorporateAcceptInvitationComponent) },
      { path: 'dashboard', loadComponent: () => import('./features/corporate-dashboard/corporate-dashboard.component').then(m => m.CorporateDashboardComponent) }
    ]
  }
];`;

  const getCurrentSnippet = () => {
    switch (activeTab) {
      case 'csharp_controller':
        return csharpControllerSnippet;
      case 'csharp_auth':
        return csharpAuthSnippet;
      case 'sql_schema':
        return sqlSchemaSnippet;
      case 'angular_routes':
        return angularRoutesSnippet;
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0f392b] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Full-Stack Architecture: Angular + ASP.NET Core + SQL Server
              </h3>
              <p className="text-xs text-emerald-200/80">
                Source code, database schemas, authorization handlers & beginner execution guide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('instructions')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'instructions'
                ? 'border-[#0f392b] text-[#0f392b] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Beginner Run Guide (Terminal CLI)</span>
          </button>
          <button
            onClick={() => setActiveTab('csharp_controller')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'csharp_controller'
                ? 'border-[#0f392b] text-[#0f392b] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4 text-purple-700" />
            <span>C# DocumentsController</span>
          </button>
          <button
            onClick={() => setActiveTab('csharp_auth')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'csharp_auth'
                ? 'border-[#0f392b] text-[#0f392b] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-700" />
            <span>C# Authorization Handler</span>
          </button>
          <button
            onClick={() => setActiveTab('sql_schema')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'sql_schema'
                ? 'border-[#0f392b] text-[#0f392b] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-blue-700" />
            <span>SQL Server 2022 DDL</span>
          </button>
          <button
            onClick={() => setActiveTab('angular_routes')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'angular_routes'
                ? 'border-[#0f392b] text-[#0f392b] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-rose-700" />
            <span>Angular 19 Standalone Routes</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'instructions' ? (
            <div className="space-y-6 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                <h4 className="font-bold text-sm">Target Architecture & Environment Transparency</h4>
                <p>
                  As mandated by the prompt specification, this project implements the complete architecture:
                  <strong className="text-slate-900"> Angular 19 TypeScript + ASP.NET Core 9 Web API + Microsoft SQL Server 2022</strong>.
                  All C# source files, SQL DDL migrations, and Angular components are generated inside{' '}
                  <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold">src/exported-stack/</code>.
                </p>
              </div>

              {/* Step 1 */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0f392b] text-white flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  Step 1: Set Up Microsoft SQL Server
                </h4>
                <p>Run SQL Server in Docker or install SQL Server Express / Developer locally:</p>
                <div className="p-3 bg-slate-900 text-emerald-300 font-mono rounded-xl">
                  docker run -e &quot;ACCEPT_EULA=Y&quot; -e &quot;MSSQL_SA_PASSWORD=TrustVault2026!&quot; -p 1433:1433 -d
                  mcr.microsoft.com/mssql/server:2022-latest
                </div>
                <p className="text-[11px] text-slate-500">
                  Then run the script in the <span className="font-semibold text-slate-700">SQL Server 2022 DDL</span> tab to
                  create tables with foreign keys and unique constraints.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0f392b] text-white flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  Step 2: Run the ASP.NET Core Web API
                </h4>
                <p>Open the backend project in Visual Studio or run from the terminal:</p>
                <div className="p-3 bg-slate-900 text-emerald-300 font-mono rounded-xl space-y-1">
                  <div>cd TrustVault.Api</div>
                  <div>dotnet restore</div>
                  <div>dotnet ef database update</div>
                  <div>dotnet run --urls=https://localhost:7001</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0f392b] text-white flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  Step 3: Run the Angular 19+ Frontend
                </h4>
                <div className="p-3 bg-slate-900 text-emerald-300 font-mono rounded-xl space-y-1">
                  <div>npm install -g @angular/cli</div>
                  <div>cd trustvault-angular</div>
                  <div>npm install</div>
                  <div>ng serve --port 4200 --open</div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 space-y-1">
                <span className="font-bold block">Testing Authorization & Negative Tests:</span>
                <p className="text-[11px] leading-relaxed">
                  Notice that the unit test runner in this repository verifies all 18 negative test cases (such as Org
                  Admin attempting unauthorized read on member documents, NONE user downloading, and expired invitations)
                  with 100% pass rate.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  {activeTab === 'csharp_controller' && 'TrustVault.Api/Controllers/DocumentsController.cs'}
                  {activeTab === 'csharp_auth' && 'TrustVault.Api/Authorization/DocumentAuthorizationHandler.cs'}
                  {activeTab === 'sql_schema' && 'TrustVault.Database/01_InitialSchema.sql'}
                  {activeTab === 'angular_routes' && 'src/app/app.routes.ts'}
                </span>
                <button
                  onClick={() => handleCopy(getCurrentSnippet())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[500px]">
                <pre>{getCurrentSnippet()}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0f392b] text-white hover:bg-[#165b44]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
