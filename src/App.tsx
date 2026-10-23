import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { WelcomeView } from './components/WelcomeView';
import { PersonalAuthViews } from './components/PersonalAuthViews';
import { CorporateAuthViews } from './components/CorporateAuthViews';
import { PersonalDashboard } from './components/PersonalDashboard';
import { CorporateDashboard } from './components/CorporateDashboard';
import { UploadDocumentModal } from './components/UploadDocumentModal';
import { DocumentDetailsModal } from './components/DocumentDetailsModal';
import { ShareDocumentModal } from './components/ShareDocumentModal';
import { FullStackExportModal } from './components/FullStackExportModal';
import { SupabaseStatusModal } from './components/SupabaseStatusModal';
import { ProfileModal } from './components/ProfileModal';
import { DocumentItem, DocumentPermissionLevel } from './types/trustvault';
import { trustVaultStore } from './services/trustvault-store';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    return new URLSearchParams(window.location.search);
  });

  // State store synchronization
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = trustVaultStore.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  // Popstate history listener
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Router navigation helper
  const navigate = (to: string) => {
    const [path, query] = to.split('?');
    window.history.pushState({}, '', to);
    setCurrentPath(path);
    setSearchParams(new URLSearchParams(query || ''));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState<DocumentItem | null>(null);
  const [effectivePermForDetails, setEffectivePermForDetails] = useState<DocumentPermissionLevel>('NONE');
  const [selectedDocForShare, setSelectedDocForShare] = useState<DocumentItem | null>(null);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const currentUser = trustVaultStore.getCurrentUser();
  const currentWorkspace = trustVaultStore.getCurrentWorkspace();

  // Handlers for modal opening
  const handleOpenDetails = (doc: DocumentItem, perm: DocumentPermissionLevel) => {
    setSelectedDocForDetails(doc);
    setEffectivePermForDetails(perm);
  };

  const handleOpenShare = (doc: DocumentItem) => {
    setSelectedDocForShare(doc);
  };

  const handleRefresh = () => {
    setTick((t) => t + 1);
  };

  // Render appropriate view based on current route
  const renderCurrentView = () => {
    switch (currentPath) {
      case '/':
        return <WelcomeView navigate={navigate} onOpenCodeExport={() => setIsCodeExportOpen(true)} />;

      case '/personal/login':
        return <PersonalAuthViews view="login" navigate={navigate} />;

      case '/personal/register':
        return <PersonalAuthViews view="register" navigate={navigate} />;

      case '/personal/verify-email':
        return (
          <PersonalAuthViews
            view="verify-email"
            navigate={navigate}
            initialEmail={searchParams.get('email') || ''}
          />
        );

      case '/personal/forgot-password':
        return <PersonalAuthViews view="forgot-password" navigate={navigate} />;

      case '/personal/dashboard':
        return (
          <PersonalDashboard
            navigate={navigate}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenDetails={handleOpenDetails}
            onOpenShare={handleOpenShare}
          />
        );

      case '/corporate/login':
        return <CorporateAuthViews view="login" navigate={navigate} />;

      case '/corporate/register-company':
        return <CorporateAuthViews view="register-company" navigate={navigate} />;

      case '/corporate/verify-email':
        return (
          <CorporateAuthViews
            view="verify-email"
            navigate={navigate}
            initialEmail={searchParams.get('email') || ''}
          />
        );

      case '/corporate/join-company':
        return <CorporateAuthViews view="join-company" navigate={navigate} />;

      case '/corporate/accept-invitation':
        return (
          <CorporateAuthViews
            view="accept-invitation"
            navigate={navigate}
            initialToken={searchParams.get('token') || 'inv_valid_123'}
          />
        );

      case '/corporate/dashboard':
        return (
          <CorporateDashboard
            navigate={navigate}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenDetails={handleOpenDetails}
            onOpenShare={handleOpenShare}
          />
        );

      default:
        // Default fallback to Welcome
        return <WelcomeView navigate={navigate} onOpenCodeExport={() => setIsCodeExportOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased selection:bg-emerald-200 selection:text-emerald-900">
      {/* Global Navbar */}
      <Navbar
        currentRoute={currentPath}
        navigate={navigate}
        onOpenCodeExport={() => setIsCodeExportOpen(true)}
        onOpenSupabaseStatus={() => setIsSupabaseModalOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main View */}
      <div className="flex-1">{renderCurrentView()}</div>

      {/* User Profile & Identity Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onLogout={() => {
          trustVaultStore.logout();
          navigate('/');
        }}
        onRefresh={handleRefresh}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Document Details & Preview Modal */}
      <DocumentDetailsModal
        document={selectedDocForDetails}
        effectivePermission={effectivePermForDetails}
        isOpen={!!selectedDocForDetails}
        onClose={() => setSelectedDocForDetails(null)}
        onOpenShare={handleOpenShare}
        onRefresh={handleRefresh}
      />

      {/* Share Document & Manage Grants Modal */}
      <ShareDocumentModal
        document={selectedDocForShare}
        isOpen={!!selectedDocForShare}
        onClose={() => setSelectedDocForShare(null)}
        onRefresh={handleRefresh}
      />

      {/* Full-Stack Architecture & Code Export Modal */}
      <FullStackExportModal
        isOpen={isCodeExportOpen}
        onClose={() => setIsCodeExportOpen(false)}
      />

      {/* Supabase Database & Auth Live Status Modal */}
      <SupabaseStatusModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}
