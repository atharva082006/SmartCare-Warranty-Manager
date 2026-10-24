import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiShield, FiCheck, FiInfo } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { validators } from '../../utils/validators';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import './AuthPages.css';

export default function LoginPage() {
  const { login, getRememberedEmail } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState(() => {
    const remembered = getRememberedEmail();
    return {
      email: remembered || '',
      password: '',
      rememberMe: Boolean(remembered),
    };
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (authError) setAuthError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!validators.isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    setAuthError('');

    try {
      const user = await login(formData.email, formData.password, formData.rememberMe);
      success(`Welcome back, ${user.fullName}!`);

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.message || 'Failed to sign in. Please try again.';
      setAuthError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoFill = (email, password) => {
    setFormData({
      email,
      password,
      rememberMe: true,
    });
    setErrors({});
    setAuthError('');
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!validators.isValidEmail(forgotEmail)) {
      toastError('Please enter a valid email address.');
      return;
    }
    setForgotSubmitted(true);
    success('Password reset instructions sent to your email.');
    setTimeout(() => {
      setIsForgotModalOpen(false);
      setForgotSubmitted(false);
      setForgotEmail('');
    }, 2000);
  };

  return (
    <div className="auth-container">
      <div className="auth-card-wrapper">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <FiShield />
          </div>
          <div className="auth-brand-info">
            <h1 className="auth-brand-title">SmartCare</h1>
            <p className="auth-brand-tagline">Warranty & Service Record Manager</p>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-title">Sign in to your account</h2>
            <p className="auth-subtitle">
              Enter your credentials to manage your product warranties and services.
            </p>
          </div>

          {/* Quick Demo Fill Callout */}
          <div className="demo-credentials-box">
            <div className="demo-credentials-header">
              <FiInfo className="demo-icon" />
              <span>Demo Quick-Fill:</span>
            </div>
            <div className="demo-buttons">
              <button
                type="button"
                className="demo-chip"
                onClick={() => handleQuickDemoFill('atharvaraykar2006@gmail.com', 'atharv@2006')}
              >
                Atharv Raykar
              </button>
            </div>
          </div>

          {authError && (
            <div className="auth-alert-error" role="alert">
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              icon={FiMail}
              error={errors.email}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              icon={FiLock}
              error={errors.password}
              required
              autoComplete="current-password"
            />

            <div className="auth-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="checkbox-input"
                />
                <span className="checkbox-text">Remember me</span>
              </label>

              <button
                type="button"
                className="auth-link-button"
                onClick={() => setIsForgotModalOpen(true)}
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={submitting}
            >
              Sign In
            </Button>
          </form>

          <div className="auth-footer">
            <p className="auth-switch-text">
              Don't have an account yet?{' '}
              <Link to="/register" className="auth-primary-link">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Password"
        size="sm"
      >
        {forgotSubmitted ? (
          <div className="modal-success-content">
            <div className="modal-success-icon">
              <FiCheck />
            </div>
            <h4>Check your inbox</h4>
            <p>
              We've sent a password reset link to <strong>{forgotEmail}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit}>
            <p className="modal-desc-text">
              Enter your registered email address and we'll send you instructions to reset your password.
            </p>
            <Input
              label="Email Address"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="name@company.com"
              icon={FiMail}
              required
              autoFocus
            />
            <div className="modal-actions-right">
              <Button
                variant="secondary"
                onClick={() => setIsForgotModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Send Reset Link
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
