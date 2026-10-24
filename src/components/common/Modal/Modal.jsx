import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import './Modal.css';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md', // sm | md | lg
  closeOnOverlayClick = true,
  className = '',
}) {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className={`modal-dialog modal-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        <div className="modal-header">
          {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <FiX />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
