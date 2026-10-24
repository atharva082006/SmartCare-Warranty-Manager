import React from 'react';
import './Badge.css';

export default function Badge({
  children,
  variant = 'neutral', // success | warning | danger | primary | neutral
  size = 'md',        // sm | md
  dot = false,
  className = '',
  ...rest
}) {
  return (
    <span className={`badge badge-${variant} badge-${size} ${className}`} {...rest}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      <span className="badge-text">{children}</span>
    </span>
  );
}
