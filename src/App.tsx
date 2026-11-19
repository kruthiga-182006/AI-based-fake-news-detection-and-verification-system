import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { PublicLayout } from './components/PublicLayout';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { AnalyzePage } from './pages/AnalyzePage';
import { DashboardPage } from './pages/DashboardPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResultsPage } from './pages/ResultsPage';
import type { User } from './types';

function getCurrentLocation(): { pathname: string; search: string } {
  return {
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  };
}

export default function App() {
  const [location, setLocation] = useState(getCurrentLocation);
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setLocation(getCurrentLocation());
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onPopState = () => setLocation(getCurrentLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    api.auth
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setAuthChecking(false));
  }, []);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      navigate('/');
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
          <Loader2 className="w-5 h-5 text-blue-700 animate-spin" aria-hidden="true" />
          <span>Loading TruthGuard AI...</span>
        </div>
      </div>
    );
  }

  const { pathname, search } = location;

  // Protected workspace routes (Dashboard, History, Feedback require login; Analyze & Results are open)
  const isProtected =
    pathname === '/dashboard' ||
    pathname === '/history' ||
    pathname === '/feedback';

  if (isProtected && !user) {
    return (
      <PublicLayout user={null} currentPath="/login" onNavigate={navigate}>
        <LoginPage
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            navigate(pathname);
          }}
          onNavigate={navigate}
        />
      </PublicLayout>
    );
  }

  // Auth pages redirect already logged-in users to /dashboard
  if ((pathname === '/login' || pathname === '/register') && user) {
    return (
      <WorkspaceLayout
        user={user}
        currentPath="/dashboard"
        breadcrumb="Dashboard"
        onNavigate={navigate}
        onLogout={handleLogout}
      >
        <DashboardPage user={user} onNavigate={navigate} />
      </WorkspaceLayout>
    );
  }

  // Public routes
  if (pathname === '/login') {
    return (
      <PublicLayout user={user} currentPath="/login" onNavigate={navigate}>
        <LoginPage
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            navigate('/dashboard');
          }}
          onNavigate={navigate}
        />
      </PublicLayout>
    );
  }

  if (pathname === '/register') {
    return (
      <PublicLayout user={user} currentPath="/register" onNavigate={navigate}>
        <RegisterPage
          onSuccess={(registeredUser) => {
            setUser(registeredUser);
            navigate('/dashboard');
          }}
          onNavigate={navigate}
        />
      </PublicLayout>
    );
  }

  if (pathname === '/analyze') {
    if (user) {
      return (
        <WorkspaceLayout
          user={user}
          currentPath="/analyze"
          breadcrumb="Analyze News"
          onNavigate={navigate}
          onLogout={handleLogout}
        >
          <AnalyzePage user={user} onNavigate={navigate} />
        </WorkspaceLayout>
      );
    }
    return (
      <PublicLayout user={null} currentPath="/analyze" onNavigate={navigate}>
        <AnalyzePage user={null} onNavigate={navigate} />
      </PublicLayout>
    );
  }

  if (pathname.startsWith('/results/')) {
    const id = Number(pathname.replace('/results/', '').split('/')[0]);
    if (user) {
      return (
        <WorkspaceLayout
          user={user}
          currentPath={pathname}
          breadcrumb={`Analysis Report #${Number.isNaN(id) ? '' : id}`}
          onNavigate={navigate}
          onLogout={handleLogout}
        >
          <ResultsPage analysisId={id} user={user} onNavigate={navigate} />
        </WorkspaceLayout>
      );
    }
    return (
      <PublicLayout user={null} currentPath={pathname} onNavigate={navigate}>
        <ResultsPage analysisId={id} user={null} onNavigate={navigate} />
      </PublicLayout>
    );
  }

  if (pathname === '/' || !isProtected) {
    return (
      <PublicLayout user={user} currentPath="/" onNavigate={navigate}>
        <HomePage user={user} onNavigate={navigate} />
      </PublicLayout>
    );
  }

  // Authenticated Workspace routes
  if (pathname === '/dashboard' && user) {
    return (
      <WorkspaceLayout
        user={user}
        currentPath="/dashboard"
        breadcrumb="Dashboard"
        onNavigate={navigate}
        onLogout={handleLogout}
      >
        <DashboardPage user={user} onNavigate={navigate} />
      </WorkspaceLayout>
    );
  }

  if (pathname === '/history' && user) {
    return (
      <WorkspaceLayout
        user={user}
        currentPath="/history"
        breadcrumb="Analysis History"
        onNavigate={navigate}
        onLogout={handleLogout}
      >
        <HistoryPage onNavigate={navigate} />
      </WorkspaceLayout>
    );
  }

  if (pathname === '/feedback' && user) {
    const params = new URLSearchParams(search);
    const rawAid = params.get('analysisId');
    const initialAnalysisId = rawAid ? Number(rawAid) : null;
    return (
      <WorkspaceLayout
        user={user}
        currentPath="/feedback"
        breadcrumb="Feedback"
        onNavigate={navigate}
        onLogout={handleLogout}
      >
        <FeedbackPage
          initialAnalysisId={
            initialAnalysisId && !Number.isNaN(initialAnalysisId) ? initialAnalysisId : null
          }
        />
      </WorkspaceLayout>
    );
  }

  return (
    <PublicLayout user={user} currentPath="/" onNavigate={navigate}>
      <HomePage user={user} onNavigate={navigate} />
    </PublicLayout>
  );
}
