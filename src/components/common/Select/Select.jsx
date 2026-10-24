import React, { useId } from 'react';
import { FiChevronDown, FiAlertCircle } from 'react-icons/fi';
import './Select.css';

export default function Select({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const reactGeneratedId = useId();
  const selectId = id || name || reactGeneratedId;

  return (
    <div className={`select-group ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
          {required && <span className="required-star" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="select-wrapper">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className="select-control"
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <span className="select-chevron" aria-hidden="true">
          <FiChevronDown />
        </span>
      </div>

      {error ? (
        <p id={`${selectId}-error`} className="select-error-msg" role="alert">
          <FiAlertCircle className="error-icon" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={`${selectId}-helper`} className="select-helper-msg">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
