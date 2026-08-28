import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, ShieldCheck, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onNavigateToRegister?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
}) => {
  const [email, setEmail] = useState('developer@apexdev.com.au');
  const [password, setPassword] = useState('FeasPro2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim() || 'developer@apexdev.com.au';
    const cleanPassword = password.trim() || 'FeasPro2026!';

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.login({ email: cleanEmail, password: cleanPassword });
      onLoginSuccess(res.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message || 'Login failed. Please check your credentials.');
      } else {
        setErrorMessage('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setEmail('developer@apexdev.com.au');
    setPassword('FeasPro2026!');
    setErrorMessage(null);
    try {
      setLoading(true);
      const res = await api.login({
        email: 'developer@apexdev.com.au',
        password: 'FeasPro2026!',
      });
      onLoginSuccess(res.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message || 'Quick login failed.');
      } else {
        setErrorMessage('Quick login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        <div className="login-brand-header">
          <div className="login-logo-badge">FP</div>
          <div className="login-brand-info">
            <h1 className="login-brand-name">FeasPro</h1>
            <p className="login-brand-sub">Development Feasibility Platform</p>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-title-row">
            <div>
              <h2 className="login-title">Sign In</h2>
              <p className="login-subtitle">Access your organization's feasibility portfolio</p>
            </div>
            <div className="login-security-badge" title="Tenant-isolated workspace access">
              <ShieldCheck size={16} />
              <span>Multi-tenant Secure</span>
            </div>
          </div>

          {errorMessage && (
            <div className="login-alert-error" role="alert">
              <AlertCircle size={18} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Work Email Address
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-field-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="name@company.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={18} className="input-field-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          {onNavigateToRegister && (
            <div className="auth-switch-prompt" style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', fontSize: '0.86rem', color: '#64748b' }}>
              <span>Don't have an account? </span>
              <button
                type="button"
                className="auth-link-btn"
                onClick={onNavigateToRegister}
                style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Create one
              </button>
            </div>
          )}

          <div className="demo-credentials-card">
            <div className="demo-credentials-header">
              <span className="demo-badge">Demo Account (Dev Mode)</span>
              <button
                type="button"
                className="demo-fill-btn"
                onClick={handleQuickDemoLogin}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <Sparkles size={14} />
                <span>1-Click Sign In</span>
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="demo-credentials-body">
              <div className="demo-row">
                <span className="demo-label">Email:</span>
                <code className="demo-val">developer@apexdev.com.au</code>
              </div>
              <div className="demo-row">
                <span className="demo-label">Password:</span>
                <code className="demo-val">FeasPro2026!</code>
              </div>
              <div className="demo-row">
                <span className="demo-label">Tenant Org:</span>
                <span className="demo-val-text">Apex Property Group</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-page-footer">
          <span>FeasPro v1.0 • Multi-Tenant Real Estate Financial Intelligence</span>
        </div>
      </div>
    </div>
  );
};
