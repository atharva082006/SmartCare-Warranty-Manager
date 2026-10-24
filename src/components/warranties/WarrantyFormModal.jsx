import React from 'react';
import Modal from '../common/Modal/Modal';
import WarrantyForm from './WarrantyForm';

export default function WarrantyFormModal({
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
      title={isEdit ? 'Edit Warranty Policy' : 'Register New Warranty'}
      size="lg"
      closeOnOverlayClick={!loading}
    >
      <WarrantyForm
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
