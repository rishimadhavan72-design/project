import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Building2,
  User as UserIcon,
  ChevronDown,
  LogOut,
  FolderGit2,
  CheckCircle2,
  Code2,
  Database,
} from 'lucide-react';
import { trustVaultStore } from '../services/trustvault-store';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  onOpenCodeExport: () => void;
  onOpenSupabaseStatus: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  navigate,
  onOpenCodeExport,
  onOpenSupabaseStatus,
  onOpenProfile,
}) => {
  const [, setNavTick] = useState(0);
  React.useEffect(() => {
    return trustVaultStore.subscribe(() => {
      setNavTick((t) => t + 1);
    });
  }, []);

  const currentUser = trustVaultStore.getCurrentUser();
  const currentWorkspace = trustVaultStore.getCurrentWorkspace();
  const userWorkspaces = trustVaultStore.getUserWorkspaces();
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    trustVaultStore.logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  const handleSwitchWorkspace = (id: string) => {
    try {
      trustVaultStore.switchWorkspace(id);
      setIsWorkspaceMenuOpen(false);
      const target = userWorkspaces.find((w) => w.id === id);
      if (target?.type === 'personal') {
        navigate('/personal/dashboard');
      } else {
        navigate('/corporate/dashboard');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f392b] text-white shadow-md border-b border-[#1b5e47]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 group text-left focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg p-1"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-[#165b44] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6 text-[#0f392b] stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  TrustVault
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-800/80 text-emerald-200 font-semibold border border-emerald-600/40">
                    SaaS
                  </span>
                </span>
                <p className="text-xs text-emerald-200/80 font-medium">Your documents. Your control.</p>
              </div>
            </button>

            {/* Main Navigation Links - Security Model & Full Stack Architecture are only visible when NOT logged in */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <button
                onClick={() => navigate('/')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  currentRoute === '/'
                    ? 'bg-emerald-950 text-emerald-200 font-semibold'
                    : 'text-emerald-100/90 hover:bg-[#165b44] hover:text-white'
                }`}
              >
                Home
              </button>
              {!currentUser && (
                <>
                  <button
                    onClick={() => {
                      if (currentRoute === '/') {
                        document.getElementById('security-section')?.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        navigate('/#security');
                      }
                    }}
                    className="px-3 py-1.5 rounded-md text-emerald-100/90 hover:bg-[#165b44] hover:text-white transition-colors"
                  >
                    Security Model
                  </button>
                  <button
                    onClick={onOpenCodeExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-emerald-100/90 hover:bg-[#165b44] hover:text-white transition-colors"
                  >
                    <Code2 className="w-4 h-4 text-emerald-300" />
                    <span>Full-Stack Architecture (.NET / Angular)</span>
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Right Section: Supabase DB status, Profile, Workspace Selector, User Menu */}
          <div className="flex items-center gap-2.5">
            {/* Supabase Status Indicator Button */}
            <button
              onClick={onOpenSupabaseStatus}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#165b44] hover:bg-[#1c7255] border border-emerald-500/40 text-xs font-semibold text-emerald-100 transition-colors shadow-xs"
              title="Supabase Database Status, Project ID & SQL Schema"
            >
              <Database className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Supabase DB</span>
              <span className="relative flex h-2 w-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
            </button>

            {currentUser ? (
              <>
                {/* Dedicated Profile Button on Taskbar */}
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#165b44] hover:bg-[#1c7255] border border-emerald-500/40 text-xs font-semibold text-emerald-100 transition-colors shadow-xs"
                  title="View and edit profile overview, name, and email address"
                >
                  <UserIcon className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden sm:inline">Profile</span>
                </button>

                {/* Workspace Selector */}
                {userWorkspaces.length > 0 && currentWorkspace && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen);
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#165b44] hover:bg-[#1c7255] border border-emerald-600/40 text-xs font-semibold text-emerald-100 transition-colors"
                    >
                      {currentWorkspace.type === 'personal' ? (
                        <Lock className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-blue-300" />
                      )}
                      <span className="max-w-[130px] sm:max-w-[160px] truncate">{currentWorkspace.name}</span>
                      <ChevronDown className="w-3 h-3 text-emerald-300" />
                    </button>

                    {isWorkspaceMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white text-slate-800 shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1.5 border-b border-slate-100">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Your Authorised Workspaces
                          </p>
                        </div>
                        <div className="p-1 space-y-1">
                          {userWorkspaces.map((ws) => (
                            <button
                              key={ws.id}
                              onClick={() => handleSwitchWorkspace(ws.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                                ws.id === currentWorkspace.id
                                  ? 'bg-emerald-50 text-emerald-900 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {ws.type === 'personal' ? (
                                  <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                ) : (
                                  <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                )}
                                <span className="truncate">{ws.name}</span>
                              </div>
                              {ws.id === currentWorkspace.id && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* User Profile Avatar & Menu */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                      setIsWorkspaceMenuOpen(false);
                    }}
                    className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-emerald-400 focus:outline-none transition-all"
                    title={`${currentUser.fullName} - Account & Profile`}
                  >
                    <img
                      src={
                        currentUser.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.fullName}&backgroundColor=165b44`
                      }
                      alt={currentUser.fullName}
                      className="w-8 h-8 rounded-full border border-emerald-400 object-cover"
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white text-slate-800 shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="px-4 py-2.5 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                        title="Click to view and edit profile"
                      >
                        <p className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 text-[10px] text-emerald-700 font-medium hover:underline">
                          View & Edit Profile →
                        </span>
                      </div>
                      <div className="p-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenProfile();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2"
                        >
                          <UserIcon className="w-4 h-4 text-emerald-700" />
                          <span>Profile & Identity Overview</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (currentWorkspace?.type === 'personal') {
                              navigate('/personal/dashboard');
                            } else {
                              navigate('/corporate/dashboard');
                            }
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <FolderGit2 className="w-4 h-4 text-emerald-700" />
                          Dashboard
                        </button>
                        <div className="border-t border-slate-100 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Signed Out Navigation Buttons */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/personal/login')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-100 hover:text-white hover:bg-[#165b44] transition-colors"
                >
                  Personal Sign In
                </button>
                <button
                  onClick={() => navigate('/corporate/login')}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-[#0f392b] shadow-sm hover:shadow transition-all"
                >
                  Corporate Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
