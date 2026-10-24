import React, { useState, useEffect } from 'react';
import {
  FiTool,
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiCheckCircle,
} from 'react-icons/fi';
import Input from '../common/Input/Input';
import Select from '../common/Select/Select';
import Button from '../common/Button/Button';
import { SERVICE_TYPES, SERVICE_STATUSES } from '../../utils/serviceRecordUtils.js';
import './ServiceRecordForm.css';

export default function ServiceRecordForm({
  initialValues = null,
  initialProductId = '',
  products = [],
  onSubmit,
  onCancel,
  isEdit = false,
  loading = false,
}) {
  const [formData, setFormData] = useState(() => {
    const today = new Date().toISOString().split('T')[0];

    const parts = initialValues?.partsReplaced
      ? Array.isArray(initialValues.partsReplaced)
        ? initialValues.partsReplaced.join(', ')
        : String(initialValues.partsReplaced)
      : '';

    return {
      productId: initialValues?.productId || initialProductId || (products[0]?.id || ''),
      serviceType: initialValues?.serviceType || 'Maintenance',
      provider: initialValues?.provider || '',
      serviceDate: initialValues?.serviceDate || today,
      cost: initialValues?.cost !== undefined ? String(initialValues.cost) : '0',
      status: initialValues?.status || 'Completed',
      issueDescription:
        initialValues?.issueDescription || initialValues?.description || '',
      workPerformed: initialValues?.workPerformed || '',
      partsReplaced: parts,
      notes: initialValues?.notes || '',
      nextServiceDate: initialValues?.nextServiceDate || '',
    };
  });

  const [errors, setErrors] = useState({});

  // When initialProductId changes or products load, ensure productId is selected
  useEffect(() => {
    if (!formData.productId && products.length > 0) {
      setFormData((prev) => ({
        ...prev,
        productId: initialProductId || products[0].id,
      }));
    }
  }, [products, initialProductId, formData.productId]);

  // If user picks a product, auto-suggest provider if provider is empty
  const handleProductChange = (e) => {
    const selectedProdId = e.target.value;
    const matched = products.find(
      (p) => p.id === selectedProdId || p.productId === selectedProdId
    );

    setFormData((prev) => ({
      ...prev,
      productId: selectedProdId,
      provider: prev.provider
        ? prev.provider
        : matched
        ? `${matched.brand} Authorized Service Center`
        : '',
    }));

    if (errors.productId) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.productId;
        return next;
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.productId) {
      nextErrors.productId = 'Please select an associated product';
    }

    if (!formData.serviceType || !formData.serviceType.trim()) {
      nextErrors.serviceType = 'Service type is required';
    }

    if (!formData.provider || !formData.provider.trim()) {
      nextErrors.provider = 'Service provider is required';
    }

    if (!formData.serviceDate) {
      nextErrors.serviceDate = 'Service date is required';
    }

    if (
      formData.cost === '' ||
      isNaN(Number(formData.cost)) ||
      Number(formData.cost) < 0
    ) {
      nextErrors.cost = 'Service cost must be a numeric value greater than or equal to 0';
    }

    if (!formData.status) {
      nextErrors.status = 'Service status is required';
    }

    if (!formData.issueDescription || !formData.issueDescription.trim()) {
      nextErrors.issueDescription = 'Issue / problem description is required';
    }

    if (formData.nextServiceDate && formData.serviceDate) {
      const sDate = new Date(formData.serviceDate);
      const nDate = new Date(formData.nextServiceDate);
      if (nDate < sDate) {
        nextErrors.nextServiceDate = 'Next service date cannot be earlier than service date';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const partsArray = formData.partsReplaced
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      productId: formData.productId,
      serviceType: formData.serviceType.trim(),
      provider: formData.provider.trim(),
      serviceDate: formData.serviceDate,
      cost: Number(formData.cost) || 0,
      status: formData.status,
      issueDescription: formData.issueDescription.trim(),
      description: formData.issueDescription.trim(),
      workPerformed: formData.workPerformed.trim() || formData.issueDescription.trim(),
      partsReplaced: partsArray,
      notes: formData.notes.trim(),
      nextServiceDate: formData.nextServiceDate || '',
    };

    onSubmit(payload);
  };

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.brand}${p.modelNumber ? ` • ${p.modelNumber}` : ''})`,
  }));

  const typeOptions = SERVICE_TYPES.map((t) => ({ value: t, label: t }));
  const statusOptions = SERVICE_STATUSES.map((s) => ({ value: s, label: s }));

  return (
    <form className="service-form" onSubmit={handleSubmit} noValidate>
      <div className="service-form-grid">
        {/* Associated Product Selector */}
        <div className="form-col-span-2">
          <Select
            label="Associated Product"
            name="productId"
            value={formData.productId}
            onChange={handleProductChange}
            options={productOptions}
            required
            error={errors.productId}
            placeholder="Select a registered product"
            disabled={isEdit}
          />
        </div>

        {/* Service Type */}
        <Select
          label="Service Type"
          name="serviceType"
          value={formData.serviceType}
          onChange={handleChange}
          options={typeOptions}
          required
          error={errors.serviceType}
        />

        {/* Provider */}
        <Input
          label="Service Provider"
          name="provider"
          value={formData.provider}
          onChange={handleChange}
          placeholder="e.g. LG Direct Technician, Samsung SmartCare Center"
          required
          error={errors.provider}
          icon={FiTool}
        />

        {/* Service Date */}
        <Input
          label="Service Date"
          name="serviceDate"
          type="date"
          value={formData.serviceDate}
          onChange={handleChange}
          required
          error={errors.serviceDate}
          icon={FiCalendar}
        />

        {/* Service Cost */}
        <Input
          label="Service Cost (₹)"
          name="cost"
          type="number"
          min="0"
          step="1"
          value={formData.cost}
          onChange={handleChange}
          required
          error={errors.cost}
          placeholder="0"
          icon={FiCreditCard}
          helperText="Enter 0 if covered under free warranty"
        />

        {/* Status */}
        <Select
          label="Service Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          options={statusOptions}
          required
          error={errors.status}
        />

        {/* Next Service Date */}
        <Input
          label="Next Service Due Date"
          name="nextServiceDate"
          type="date"
          value={formData.nextServiceDate}
          onChange={handleChange}
          error={errors.nextServiceDate}
          icon={FiCalendar}
          helperText="Optional upcoming maintenance date"
        />

        {/* Parts Replaced */}
        <div className="form-col-span-2">
          <Input
            label="Parts Replaced (comma-separated)"
            name="partsReplaced"
            value={formData.partsReplaced}
            onChange={handleChange}
            placeholder="e.g. HEPA Filter, Inverter Fan Motor, Copper Flange"
            icon={FiCheckCircle}
          />
        </div>

        {/* Issue / Problem */}
        <div className="form-col-span-2">
          <label htmlFor="service-issue" className="input-label required-label">
            Issue / Problem Description <span className="req-star">*</span>
          </label>
          <textarea
            id="service-issue"
            name="issueDescription"
            value={formData.issueDescription}
            onChange={handleChange}
            placeholder="Describe the defect, reason for service, or scheduled maintenance check..."
            rows={3}
            className={`service-textarea ${errors.issueDescription ? 'input-error-field' : ''}`}
            required
          />
          {errors.issueDescription && (
            <span className="field-error-msg">{errors.issueDescription}</span>
          )}
        </div>

        {/* Work Performed */}
        <div className="form-col-span-2">
          <label htmlFor="service-work" className="input-label">
            Work Performed / Diagnostic Steps
          </label>
          <textarea
            id="service-work"
            name="workPerformed"
            value={formData.workPerformed}
            onChange={handleChange}
            placeholder="Details of technician diagnostic tests, repairs carried out, or calibration..."
            rows={3}
            className="service-textarea"
          />
        </div>

        {/* Notes */}
        <div className="form-col-span-2">
          <label htmlFor="service-notes" className="input-label">
            Additional Technician Notes & Recommendations
          </label>
          <textarea
            id="service-notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any warranty remarks, operating tips, or follow-up instructions..."
            rows={2}
            className="service-textarea"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="service-form-actions">
        {onCancel && (
          <Button
            variant="secondary"
            type="button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          type="submit"
          loading={loading}
        >
          {isEdit ? 'Save Changes' : 'Record Service'}
        </Button>
      </div>
    </form>
  );
}
