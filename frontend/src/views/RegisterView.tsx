import React, { useState } from 'react';
import { User as UserIcon, Mail, Building2, Lock, UserPlus, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface RegisterViewProps {
  onRegisterSuccess: (user: User) => void;
  onNavigateToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !organizationName.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password and confirmation do not match.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.register({
        full_name: fullName.trim(),
        email: email.trim(),
        organization_name: organizationName.trim(),
        password,
        confirm_password: confirmPassword,
      });
      onRegisterSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper" style={{ maxWidth: '500px' }}>
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
              <h2 className="login-title">Create Account</h2>
              <p className="login-subtitle">Set up your company's feasibility modelling workspace</p>
            </div>
            <div className="login-security-badge" title="Dedicated tenant organization">
              <ShieldCheck size={16} />
              <span>Multi-tenant Isolated</span>
            </div>
          </div>

          {errorMessage && (
            <div className="login-alert-error" role="alert">
              <AlertCircle size={18} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" style={{ gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="reg-fullname" className="form-label">
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="input-with-icon">
                <UserIcon size={18} className="input-field-icon" />
                <input
                  id="reg-fullname"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Marcus Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">
                Work Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-field-icon" />
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="name@company.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-org" className="form-label">
                Organization / Company Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="input-with-icon">
                <Building2 size={18} className="input-field-icon" />
                <input
                  id="reg-org"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Vance Property Group"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={loading}
                  autoComplete="organization"
                  required
                />
              </div>
              <span className="form-helper">A dedicated tenant workspace will be provisioned for your team.</span>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label htmlFor="reg-password" className="form-label">
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-field-icon" />
                  <input
                    id="reg-password"
                    type="password"
                    className="form-input"
                    placeholder="Min 8 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirm-password" className="form-label">
                  Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-field-icon" />
                  <input
                    id="reg-confirm-password"
                    type="password"
                    className="form-input"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={loading}
              style={{ marginTop: '6px' }}
            >
              {loading ? (
                <span>Provisioning Workspace...</span>
              ) : (
                <>
                  <span>Create FeasPro Account</span>
                  <UserPlus size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-switch-prompt" style={{ textAlign: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.86rem', color: '#64748b' }}>
            <span>Already have an account? </span>
            <button
              type="button"
              className="auth-link-btn"
              onClick={onNavigateToLogin}
              style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="login-page-footer">
          <span>FeasPro v1.0 • Multi-Tenant Real Estate Financial Intelligence</span>
        </div>
      </div>
    </div>
  );
};
