import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { User } from '../types';

interface PublicLayoutProps {
  user: User | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  children: ReactNode;
}

export function PublicLayout({ user, currentPath, onNavigate, children }: PublicLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (path: string, hash?: string) => {
    setMobileOpen(false);
    if (hash && currentPath === '/') {
      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    onNavigate(path);
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/');
            }}
            className="font-display text-lg font-bold tracking-tight text-blue-950 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 rounded"
          >
            TruthGuard AI
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleLink('/');
              }}
              className={`hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                currentPath === '/' ? 'text-blue-700 font-semibold' : ''
              }`}
            >
              Home
            </a>
            <a
              href="/#about"
              onClick={(e) => {
                e.preventDefault();
                handleLink('/', 'about');
              }}
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              About
            </a>
            <a
              href="/#features"
              onClick={(e) => {
                e.preventDefault();
                handleLink('/', 'features');
              }}
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="/analyze"
              onClick={(e) => {
                e.preventDefault();
                handleLink('/analyze');
              }}
              className={`hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                currentPath === '/analyze' ? 'text-blue-700 font-semibold' : ''
              }`}
            >
              Analyze News
            </a>
            {!user && (
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  handleLink('/login');
                }}
                className={`hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                  currentPath === '/login' ? 'text-blue-700 font-semibold' : ''
                }`}
              >
                Login
              </a>
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => handleLink('/dashboard')}
                className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleLink('/register')}
                className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Register
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
            <button
              type="button"
              onClick={() => handleLink('/')}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-lg"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleLink('/', 'about')}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-lg"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => handleLink('/', 'features')}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-lg"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleLink('/analyze')}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-lg"
            >
              Analyze News
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => handleLink('/dashboard')}
                className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                Open Dashboard
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleLink('/login')}
                  className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-lg"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => handleLink('/register')}
                  className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  Register
                </button>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-display text-base font-bold text-blue-950">TruthGuard AI</p>
            <p className="mt-1 text-xs text-slate-600 max-w-md leading-relaxed">
              AI-assisted claim verification combining NLP preprocessing, Groq AI analysis, and live
              browser search. AI assessments support critical reading and do not replace independent
              primary-source verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
            <button
              type="button"
              onClick={() => handleLink('/')}
              className="hover:text-blue-700 cursor-pointer whitespace-nowrap"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleLink('/', 'about')}
              className="hover:text-blue-700 cursor-pointer whitespace-nowrap"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => handleLink('/', 'features')}
              className="hover:text-blue-700 cursor-pointer whitespace-nowrap"
            >
              Features
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => handleLink('/dashboard')}
                className="hover:text-blue-700 cursor-pointer whitespace-nowrap"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleLink('/login')}
                  className="hover:text-blue-700 cursor-pointer whitespace-nowrap"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => handleLink('/register')}
                  className="hover:text-blue-700 cursor-pointer whitespace-nowrap"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
