using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TrustVault.Api.Data;
using TrustVault.Api.DTOs;
using TrustVault.Api.Entities;
using TrustVault.Api.Services;

namespace TrustVault.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DocumentsController : ControllerBase
    {
        private readonly TrustVaultDbContext _context;
        private readonly IFileStorageService _storageService;
        private readonly IAuditService _auditService;
        private readonly IAuthorizationService _authService;

        public DocumentsController(
            TrustVaultDbContext context,
            IFileStorageService storageService,
            IAuditService auditService,
            IAuthorizationService authService)
        {
            _context = context;
            _storageService = storageService;
            _auditService = auditService;
            _authService = authService;
        }

        private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        private string CurrentUserEmail => User.FindFirstValue(ClaimTypes.Email)!;

        /// <summary>
        /// Retrieves all documents visible to the caller in the specified workspace, calculating effective permissions.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DocumentResponseDto>>> GetDocuments([FromQuery] Guid workspaceId)
        {
            var workspace = await _context.Workspaces.FindAsync(workspaceId);
            if (workspace == null) return NotFound(new { message = "Workspace not found" });

            // Enforce corporate tenant isolation
            if (workspace.WorkspaceType == "Corporate")
            {
                var isMember = await _context.OrganisationMembers
                    .AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == CurrentUserId && m.Status == "Active");
                if (!isMember)
                {
                    await _auditService.LogAsync("ACCESS_DENIED", "Workspace", workspaceId.ToString(), workspace.Name, "DENIED", "User attempted to query documents in foreign workspace.");
                    return Forbid();
                }
            }

            var docs = await _context.Documents
                .Where(d => d.WorkspaceId == workspaceId && d.Status == "Active")
                .Include(d => d.Owner)
                .ToListAsync();

            var grants = await _context.DocumentPermissionGrants
                .Where(g => g.GranteeUserId == CurrentUserId && g.Status == "Active")
                .ToListAsync();

            var result = docs.Select(doc =>
            {
                string effectivePermission = "NONE";
                if (doc.OwnerId == CurrentUserId)
                {
                    effectivePermission = "OWNER";
                }
                else
                {
                    var grant = grants.FirstOrDefault(g => g.DocumentId == doc.Id);
                    if (grant != null)
                    {
                        effectivePermission = grant.PermissionLevel; // "READ" or "EDIT"
                    }
                }

                return new DocumentResponseDto
                {
                    Id = doc.Id,
                    Title = doc.Title,
                    OriginalFilename = doc.OriginalFilename,
                    Category = doc.Category,
                    FileSizeBytes = doc.FileSizeBytes,
                    ContentType = doc.ContentType,
                    OwnerId = doc.OwnerId,
                    OwnerName = doc.Owner.FullName,
                    OwnerEmail = doc.Owner.Email,
                    EffectivePermission = effectivePermission,
                    CreatedAt = doc.CreatedAt,
                    UpdatedAt = doc.UpdatedAt
                };
            });

            return Ok(result);
        }

        /// <summary>
        /// Uploads a document into private storage outside the web root and registers metadata.
        /// </summary>
        [HttpPost]
        [RequestSizeLimit(26_214_400)] // 25 MB
        public async Task<ActionResult<DocumentResponseDto>> UploadDocument([FromForm] UploadDocumentDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
                return BadRequest(new { message = "Empty file submitted." });

            var workspace = await _context.Workspaces.FindAsync(dto.WorkspaceId);
            if (workspace == null) return NotFound(new { message = "Target workspace does not exist." });

            // Validate membership for corporate workspaces
            if (workspace.WorkspaceType == "Corporate")
            {
                var isMember = await _context.OrganisationMembers
                    .AnyAsync(m => m.WorkspaceId == dto.WorkspaceId && m.UserId == CurrentUserId && m.Status == "Active");
                if (!isMember) return Forbid();
            }

            // Stream file to private encrypted storage
            var storageKey = await _storageService.SavePrivateFileAsync(dto.File, workspace.Slug);

            var document = new Document
            {
                Id = Guid.NewGuid(),
                WorkspaceId = dto.WorkspaceId,
                OwnerId = CurrentUserId,
                Title = string.IsNullOrWhiteSpace(dto.Title) ? dto.File.FileName : dto.Title.Trim(),
                OriginalFilename = dto.File.FileName,
                SanitizedStorageKey = storageKey,
                ContentType = dto.File.ContentType,
                FileSizeBytes = dto.File.Length,
                Category = dto.Category,
                Description = dto.Description,
                StorageLocationId = "enc-volume-private-01",
                Status = "Active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _context.Documents.Add(document);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync("DOC_UPLOAD", "Document", document.Id.ToString(), document.Title, "SUCCESS", $"Uploaded {document.OriginalFilename} ({document.FileSizeBytes} bytes). Assigned OWNER.");

            return CreatedAtAction(nameof(GetDocumentById), new { id = document.Id }, new DocumentResponseDto
            {
                Id = document.Id,
                Title = document.Title,
                OriginalFilename = document.OriginalFilename,
                Category = document.Category,
                FileSizeBytes = document.FileSizeBytes,
                EffectivePermission = "OWNER",
                CreatedAt = document.CreatedAt
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<DocumentResponseDto>> GetDocumentById(Guid id)
        {
            var doc = await _context.Documents.Include(d => d.Owner).FirstOrDefaultAsync(d => d.Id == id && d.Status == "Active");
            if (doc == null) return NotFound();

            var authResult = await _authService.AuthorizeAsync(User, doc, "ReadDocumentPolicy");
            if (!authResult.Succeeded) return Forbid();

            return Ok(doc);
        }

        /// <summary>
        /// Streams authorized document content for download.
        /// </summary>
        [HttpGet("{id}/download")]
        public async Task<IActionResult> DownloadDocument(Guid id)
        {
            var doc = await _context.Documents.FirstOrDefaultAsync(d => d.Id == id && d.Status == "Active");
            if (doc == null) return NotFound();

            var authResult = await _authService.AuthorizeAsync(User, doc, "ReadDocumentPolicy");
            if (!authResult.Succeeded)
            {
                await _auditService.LogAsync("ACCESS_DENIED", "Document", doc.Id.ToString(), doc.Title, "DENIED", "Download attempt without READ or OWNER permission.");
                return Forbid();
            }

            var stream = await _storageService.GetFileStreamAsync(doc.SanitizedStorageKey);
            await _auditService.LogAsync("DOC_DOWNLOAD", "Document", doc.Id.ToString(), doc.Title, "SUCCESS", "Document downloaded successfully.");
            return File(stream, doc.ContentType, doc.OriginalFilename);
        }

        /// <summary>
        /// Permanently archives or deletes document. Restricted strictly to document OWNER.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(Guid id)
        {
            var doc = await _context.Documents.FirstOrDefaultAsync(d => d.Id == id && d.Status == "Active");
            if (doc == null) return NotFound();

            if (doc.OwnerId != CurrentUserId)
            {
                await _auditService.LogAsync("ACCESS_DENIED", "Document", doc.Id.ToString(), doc.Title, "DENIED", "Delete attempt by non-owner rejected.");
                return Forbid();
            }

            doc.Status = "Archived";
            doc.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync("DOC_DELETE", "Document", doc.Id.ToString(), doc.Title, "SUCCESS", "Document archived by owner.");
            return NoContent();
        }
    }
}
