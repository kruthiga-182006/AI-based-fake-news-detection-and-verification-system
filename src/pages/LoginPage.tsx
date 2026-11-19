import { AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import type { User } from '../types';

interface LoginPageProps {
  onSuccess: (user: User) => void;
  onNavigate: (path: string) => void;
}

export function LoginPage({ onSuccess, onNavigate }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryCodeIssued, setRecoveryCodeIssued] = useState('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Please enter your username or email and password.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await api.auth.login({ identifier: identifier.trim(), password });
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryStatus('');
    if (!recoveryIdentifier.trim()) {
      setRecoveryError('Please enter your registered email or username.');
      return;
    }

    setRecoveryBusy(true);
    try {
      const res = await api.auth.forgotPassword(recoveryIdentifier.trim());
      setRecoveryCodeIssued(res.recoveryCode);
      setRecoveryStatus(res.message);
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'Could not initiate password recovery.');
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    if (!recoveryCodeInput.trim() || newPassword.length < 8) {
      setRecoveryError('Enter the 6-digit recovery code and a new password (8+ characters).');
      return;
    }

    setRecoveryBusy(true);
    try {
      const res = await api.auth.resetPassword({
        identifier: recoveryIdentifier.trim(),
        code: recoveryCodeInput.trim(),
        newPassword,
      });
      setRecoveryStatus(res.message);
      setRecoveryCodeIssued('');
      setRecoveryCodeInput('');
      setNewPassword('');
      setTimeout(() => {
        setForgotMode(false);
        setRecoveryStatus('');
      }, 1500);
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8">
        {!forgotMode ? (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-950">Sign in to TruthGuard AI</h1>
              <p className="mt-1.5 text-sm text-slate-600">
                Access your verification dashboard, news analyzer, and saved audit history.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-5" noValidate>
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-sm font-medium text-slate-800 mb-1.5"
                >
                  Username or Email
                </label>
                <div className="relative">
                  <Mail
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-identifier"
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="alex_reporter or alex@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-sm font-medium text-slate-800">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setRecoveryIdentifier(identifier);
                      setError('');
                    }}
                    className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {loading ? 'Signing In...' : 'Login'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/register')}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Register here
              </button>
            </p>
          </>
        ) : (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-950">Reset Password</h1>
              <p className="mt-1.5 text-sm text-slate-600">
                Generate a 6-digit recovery code for your account and set a new password.
              </p>
            </div>

            {recoveryError && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoveryStatus && (
              <div className="mt-5 flex items-start gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p>{recoveryStatus}</p>
                  {recoveryCodeIssued && (
                    <p className="mt-1 font-mono font-bold text-emerald-950 tabular-nums">
                      Recovery Code: {recoveryCodeIssued}
                    </p>
                  )}
                </div>
              </div>
            )}

            {!recoveryCodeIssued ? (
              <form onSubmit={handleRequestCode} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="recovery-id"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Registered Username or Email
                  </label>
                  <input
                    id="recovery-id"
                    type="text"
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recoveryBusy}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
                >
                  {recoveryBusy ? 'Generating Code...' : 'Generate Recovery Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="recovery-code"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    6-Digit Recovery Code
                  </label>
                  <input
                    id="recovery-code"
                    type="text"
                    value={recoveryCodeInput}
                    onChange={(e) => setRecoveryCodeInput(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="recovery-new-pass"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    New Password (min 8 characters)
                  </label>
                  <input
                    id="recovery-new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a new password"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recoveryBusy}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
                >
                  {recoveryBusy ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setRecoveryError('');
                setRecoveryStatus('');
                setRecoveryCodeIssued('');
              }}
              className="mt-5 w-full text-center text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
