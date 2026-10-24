import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import Button from '../Button/Button';
import './ErrorBoundary.css';

/**
 * Global React Error Boundary
 * Catches rendering exceptions, preventing blank/crashed application screens.
 * Exposes zero sensitive tokens, stack traces, or internal server paths.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Intentionally avoid logging error objects containing potential tokens or sensitive form data
    if (process.env.NODE_ENV === 'development') {
      console.warn('SmartCare ErrorBoundary caught a rendering exception.');
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrapper" role="alert">
          <div className="error-boundary-card">
            <div className="error-boundary-icon-wrapper" aria-hidden="true">
              <FiAlertTriangle className="error-boundary-icon" />
            </div>

            <h1 className="error-boundary-title">Something went wrong</h1>
            <p className="error-boundary-subtitle">
              An unexpected error occurred while rendering the page. Your data is safe.
            </p>

            <div className="error-boundary-actions">
              <Button
                variant="primary"
                icon={FiRefreshCw}
                onClick={this.handleReload}
              >
                Reload Application
              </Button>
              <Button
                variant="outline"
                icon={FiHome}
                onClick={this.handleGoHome}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
