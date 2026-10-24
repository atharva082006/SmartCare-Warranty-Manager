import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiLock, FiShield } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { validators } from '../../utils/validators';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import './AuthPages.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

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

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!validators.isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (formData.phone && !validators.isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Terms of Service to continue.';
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
      const user = await register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      success(`Account created successfully! Welcome, ${user.fullName}.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'Registration failed. Please check your information.';
      setAuthError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
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
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtitle">
              Start managing your appliances, warranties, and invoices in one secure place.
            </p>
          </div>

          {authError && (
            <div className="auth-alert-error" role="alert">
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Vinay Raykar"
              icon={FiUser}
              error={errors.fullName}
              required
              autoComplete="name"
            />

            <div className="form-row-two-col">
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                icon={FiMail}
                error={errors.email}
                required
                autoComplete="email"
              />

              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                icon={FiPhone}
                error={errors.phone}
                autoComplete="tel"
              />
            </div>

            <div className="form-row-two-col">
              <Input
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 6 characters"
                icon={FiLock}
                error={errors.password}
                required
                autoComplete="new-password"
              />

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                icon={FiLock}
                error={errors.confirmPassword}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="terms-checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="checkbox-input"
                />
                <span className="checkbox-text">
                  I agree to the{' '}
                  <button
                    type="button"
                    className="terms-modal-trigger"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsTermsModalOpen(true);
                    }}
                  >
                    Terms of Service
                  </button>{' '}
                  and Privacy Policy.
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="input-error-msg" role="alert">
                  {errors.agreeTerms}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={submitting}
            >
              Create Account
            </Button>
          </form>

          <div className="auth-footer">
            <p className="auth-switch-text">
              Already have an account?{' '}
              <Link to="/login" className="auth-primary-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Terms of Service Modal */}
      <Modal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        title="Terms of Service"
        size="md"
        footer={
          <Button variant="primary" onClick={() => setIsTermsModalOpen(false)}>
            I Understand
          </Button>
        }
      >
        <div className="terms-modal-body">
          <h4>1. Purpose of SmartCare</h4>
          <p>
            SmartCare is designed as an educational and prototype product warranty and service record
            management system. It enables users to catalogue home appliances, track warranty periods,
            record service visits, upload invoices, and monitor maintenance costs.
          </p>
          <h4>2. Data Security & Storage</h4>
          <p>
            All records, documents, and credentials currently operate within secure local state and
            session storage. In future releases, backend persistence will adhere to standard REST API
            safeguards.
          </p>
          <h4>3. User Responsibility</h4>
          <p>
            Users are responsible for ensuring that uploaded invoices and warranty documents reflect
            legitimate purchases.
          </p>
        </div>
      </Modal>
    </div>
  );
}
