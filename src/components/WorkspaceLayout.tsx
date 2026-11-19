import {
  FileSearch,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquarePlus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { User } from '../types';

interface WorkspaceLayoutProps {
  user: User;
  currentPath: string;
  breadcrumb: string;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
  children: ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Analyze News', path: '/analyze', icon: FileSearch },
  { label: 'Analysis History', path: '/history', icon: History },
  { label: 'Feedback', path: '/feedback', icon: MessageSquarePlus },
];

export function WorkspaceLayout({
  user,
  currentPath,
  breadcrumb,
  onNavigate,
  onLogout,
  children,
}: WorkspaceLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigateAndClose = (path: string) => {
    setSidebarOpen(false);
    onNavigate(path);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-blue-950 text-white border-r border-blue-900">
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-blue-900/80">
          <ShieldCheck className="w-5 h-5 text-blue-300 shrink-0" aria-hidden="true" />
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateAndClose('/');
            }}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            TruthGuard AI
          </a>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Workspace Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              currentPath === item.path ||
              (item.path === '/history' && currentPath.startsWith('/results/'));
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigateAndClose(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100/85 hover:bg-blue-900/70 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-900/80 space-y-2">
          <div className="px-2 py-1.5">
            <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
            <p className="text-xs text-blue-200/80 truncate">@{user.username}</p>
          </div>
          <button
            type="button"
            onClick={() => navigateAndClose('/')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-blue-900/70 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Public Home</span>
          </button>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-blue-900/70 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-blue-950 text-white flex flex-col">
            <div className="h-16 px-5 flex items-center justify-between border-b border-blue-900">
              <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
                TruthGuard AI
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                className="p-1.5 rounded-lg text-blue-200 hover:bg-blue-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  currentPath === item.path ||
                  (item.path === '/history' && currentPath.startsWith('/results/'));
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigateAndClose(item.path)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100/85 hover:bg-blue-900/70 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-blue-900 space-y-2">
              <div className="px-2 py-1">
                <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
                <p className="text-xs text-blue-200/80 truncate">@{user.username}</p>
              </div>
              <button
                type="button"
                onClick={() => navigateAndClose('/')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-blue-900/70 cursor-pointer"
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>Public Home</span>
              </button>
              <button
                type="button"
                onClick={() => void onLogout()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-blue-900/70 cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <span className="hidden sm:inline whitespace-nowrap">TruthGuard AI</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">{breadcrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {currentPath !== '/analyze' && (
              <button
                type="button"
                onClick={() => onNavigate('/analyze')}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Analyze News
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
