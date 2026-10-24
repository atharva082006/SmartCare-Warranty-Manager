import React from 'react';
import Modal from '../common/Modal/Modal';
import ServiceRecordForm from './ServiceRecordForm';

export default function ServiceRecordFormModal({
  isOpen,
  onClose,
  initialValues = null,
  initialProductId = '',
  products = [],
  onSubmit,
  isEdit = false,
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={isEdit ? 'Edit Service Record' : 'Log New Service Record'}
      size="lg"
      closeOnOverlayClick={!loading}
    >
      <ServiceRecordForm
        initialValues={initialValues}
        initialProductId={initialProductId}
        products={products}
        onSubmit={onSubmit}
        onCancel={onClose}
        isEdit={isEdit}
        loading={loading}
      />
    </Modal>
  );
}
