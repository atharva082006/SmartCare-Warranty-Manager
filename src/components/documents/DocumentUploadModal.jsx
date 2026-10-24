import React from 'react';
import Modal from '../common/Modal/Modal';
import DocumentUploadForm from './DocumentUploadForm';

export default function DocumentUploadModal({
  isOpen,
  onClose,
  products = [],
  initialProductId = '',
  onSubmit,
  loading = false,
  existingDocuments = [],
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title="Upload Product Document"
      size="lg"
      closeOnOverlayClick={!loading}
    >
      <DocumentUploadForm
        products={products}
        initialProductId={initialProductId}
        onSubmit={onSubmit}
        onCancel={onClose}
        loading={loading}
        existingDocuments={existingDocuments}
      />
    </Modal>
  );
}
