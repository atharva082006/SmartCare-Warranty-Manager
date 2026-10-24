import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner({
  size = 'md', // sm | md | lg
  text = 'Loading...',
  fullPage = false,
  className = '',
}) {
  const content = (
    <div className={`spinner-container spinner-${size} ${className}`} role="status">
      <div className="spinner-circle" aria-hidden="true" />
      {text && <span className="spinner-text">{text}</span>}
      <span className="sr-only">Loading</span>
    </div>
  );

  if (fullPage) {
    return <div className="spinner-fullpage-overlay">{content}</div>;
  }

  return content;
}
