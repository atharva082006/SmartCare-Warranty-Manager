import React, { createContext, useState, useCallback } from 'react';
import { FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';
import './Toast.css';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg, duration) => showToast(msg, 'success', duration), [showToast]);
  const error = useCallback((msg, duration) => showToast(msg, 'danger', duration), [showToast]);
  const warning = useCallback((msg, duration) => showToast(msg, 'warning', duration), [showToast]);
  const info = useCallback((msg, duration) => showToast(msg, 'info', duration), [showToast]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="toast-icon success" />;
      case 'danger':
      case 'error':
        return <FiAlertCircle className="toast-icon danger" />;
      case 'warning':
        return <FiAlertTriangle className="toast-icon warning" />;
      default:
        return <FiInfo className="toast-icon info" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item toast-${toast.type}`}>
            <div className="toast-content">
              {getIcon(toast.type)}
              <span className="toast-message">{toast.message}</span>
            </div>
            <button
              className="toast-close-btn"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <FiX />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { useToast } from '../hooks/useToast';
