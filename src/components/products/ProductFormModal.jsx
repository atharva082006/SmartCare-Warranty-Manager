import React from 'react';
import Modal from '../common/Modal/Modal';
import ProductForm from './ProductForm';

export default function ProductFormModal({
  isOpen,
  onClose,
  initialValues = null,
  onSubmit,
  isEdit = false,
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={isEdit ? 'Edit Product Details' : 'Register New Product'}
      size="lg"
      closeOnOverlayClick={!loading}
    >
      <ProductForm
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={onClose}
        isEdit={isEdit}
        loading={loading}
      />
    </Modal>
  );
}
