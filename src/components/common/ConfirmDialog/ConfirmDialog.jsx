import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger', // danger | primary | warning
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      size="sm"
      closeOnOverlayClick={!loading}
    >
      <div className="confirm-dialog-content">
        <div className={`confirm-icon-wrapper confirm-icon-${confirmVariant}`}>
          <FiAlertTriangle />
        </div>
        <div className="confirm-text-area">
          <h3 className="confirm-dialog-title">{title}</h3>
          <p className="confirm-dialog-message">{message}</p>
        </div>
      </div>

      <div className="confirm-dialog-actions">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
