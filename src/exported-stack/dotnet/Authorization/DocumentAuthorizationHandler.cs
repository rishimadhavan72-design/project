using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TrustVault.Api.Data;
using TrustVault.Api.Entities;

namespace TrustVault.Api.Authorization
{
    public enum DocumentOperation
    {
        Read,
        Preview,
        Download,
        Edit,
        ManagePermissions,
        Delete
    }

    public class DocumentOperationRequirement : IAuthorizationRequirement
    {
        public DocumentOperation Operation { get; }
        public DocumentOperationRequirement(DocumentOperation operation)
        {
            Operation = operation;
        }
    }

    /// <summary>
    /// Enforces the TrustVault Server-Side Authorization Matrix:
    /// - OWNER: Can Read, Preview, Download, Edit, ManagePermissions, Delete
    /// - EDIT: Can Read, Preview, Download, Edit (Cannot delete original or manage permissions)
    /// - READ: Can Read, Preview, Download (Cannot edit, delete, or manage permissions)
    /// - NONE: Blocked from all content actions
    /// - Org Administrators do NOT receive automatic document content access.
    /// </summary>
    public class DocumentAuthorizationHandler : AuthorizationHandler<DocumentOperationRequirement, Document>
    {
        private readonly TrustVaultDbContext _context;

        public DocumentAuthorizationHandler(TrustVaultDbContext context)
        {
            _context = context;
        }

        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            DocumentOperationRequirement requirement,
            Document resource)
        {
            var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                return;
            }

            // 1. If owner, grant all operations
            if (resource.OwnerId == userId)
            {
                context.Succeed(requirement);
                return;
            }

            // 2. Query active direct grants for this user on this document
            var activeGrant = await _context.DocumentPermissionGrants
                .FirstOrDefaultAsync(g => g.DocumentId == resource.Id && g.GranteeUserId == userId && g.Status == "Active");

            if (activeGrant == null)
            {
                // No grant exists. Access denied regardless of organisation admin role.
                return;
            }

            if (activeGrant.PermissionLevel == "EDIT")
            {
                // EDIT allows Read, Preview, Download, Edit. It DOES NOT allow Delete or ManagePermissions!
                if (requirement.Operation == DocumentOperation.Read ||
                    requirement.Operation == DocumentOperation.Preview ||
                    requirement.Operation == DocumentOperation.Download ||
                    requirement.Operation == DocumentOperation.Edit)
                {
                    context.Succeed(requirement);
                    return;
                }
            }
            else if (activeGrant.PermissionLevel == "READ")
            {
                // READ allows Read and Preview. Direct download is restricted unless explicit owner approval was granted!
                if (requirement.Operation == DocumentOperation.Read ||
                    requirement.Operation == DocumentOperation.Preview)
                {
                    context.Succeed(requirement);
                    return;
                }
                else if (requirement.Operation == DocumentOperation.Download)
                {
                    // Check if explicit download request was approved by the document owner
                    var hasApproval = await _context.DownloadPermissionRequests
                        .AnyAsync(r => r.DocumentId == resource.Id && r.RequesterId == userId && r.Status == "Approved");
                    if (hasApproval)
                    {
                        context.Succeed(requirement);
                        return;
                    }
                }
            }
        }
    }
}
