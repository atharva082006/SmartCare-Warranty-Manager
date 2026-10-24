import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal/Modal';
import Button from '../common/Button/Button';
import Select from '../common/Select/Select';
import { DOCUMENT_TYPES } from '../../utils/documentUtils';
import './DocumentUploadForm.css';

export default function DocumentEditModal({
  isOpen,
  onClose,
  document,
  products = [],
  onSubmit,
  loading = false,
}) {
  const [productId, setProductId] = useState('');
  const [documentType, setDocumentType] = useState('Invoice');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (document) {
      setProductId(document.productId || '');
      setDocumentType(document.documentType || 'Invoice');
      setDescription(document.description || '');
    }
  }, [document]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      productId,
      documentType,
      description: description.trim(),
    });
  };

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.brand}${p.modelNumber ? ` • ${p.modelNumber}` : ''})`,
  }));

  const typeOptions = DOCUMENT_TYPES.map((t) => ({ value: t, label: t }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title="Edit Document Metadata"
      size="md"
      closeOnOverlayClick={!loading}
    >
      <form onSubmit={handleSubmit} className="document-upload-form">
        <div className="upload-form-grid">
          <div className="form-col-span-2">
            <p className="doc-editing-filename">
              Editing: <strong>{document?.fileName}</strong>
            </p>
          </div>

          <div className="form-col-span-2">
            <Select
              label="Associated Product"
              name="productId"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              options={productOptions}
              required
            />
          </div>

          <div className="form-col-span-2">
            <Select
              label="Document Category"
              name="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              options={typeOptions}
              required
            />
          </div>

          <div className="form-col-span-2">
            <label htmlFor="edit-doc-desc" className="input-label">
              Notes & Description
            </label>
            <textarea
              id="edit-doc-desc"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="doc-textarea"
            />
          </div>
        </div>

        <div className="upload-form-actions">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
