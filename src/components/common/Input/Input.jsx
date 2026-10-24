import React, { useState, useId } from 'react';
import { FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import './Input.css';

export default function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  icon: Icon = null,
  className = '',
  autoComplete,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const reactGeneratedId = useId();
  const inputId = id || name || reactGeneratedId;
  const isPasswordType = type === 'password';
  const computedType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`input-group ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="required-star" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="input-wrapper">
        {Icon && (
          <span className="input-icon-left" aria-hidden="true">
            <Icon />
          </span>
        )}

        <input
          id={inputId}
          name={name}
          type={computedType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={`input-control ${Icon ? 'with-icon-left' : ''} ${isPasswordType ? 'with-icon-right' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...rest}
        />

        {isPasswordType && (
          <button
            type="button"
            className="input-password-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="input-error-msg" role="alert">
          <FiAlertCircle className="error-icon" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="input-helper-msg">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
