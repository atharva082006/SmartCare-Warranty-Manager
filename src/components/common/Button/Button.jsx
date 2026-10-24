import React from 'react';
import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  block = false,
  icon: Icon = null,
  iconRight: IconRight = null,
  className = '',
  onClick,
  ...rest
}) {
  const buttonClasses = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    block ? 'btn-block' : '',
    loading ? 'btn-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="btn-icon btn-icon-left" />
      ) : null}

      <span className="btn-text">{children}</span>

      {!loading && IconRight ? (
        <IconRight className="btn-icon btn-icon-right" />
      ) : null}
    </button>
  );
}
