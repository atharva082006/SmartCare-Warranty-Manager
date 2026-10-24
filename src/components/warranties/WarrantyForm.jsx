import React, { useState, useEffect } from 'react';
import {
  FiShield,
  FiCalendar,
  FiPhone,
  FiFileText,
} from 'react-icons/fi';
import Input from '../common/Input/Input';
import Select from '../common/Select/Select';
import Button from '../common/Button/Button';
import './WarrantyForm.css';

const DEFAULT_WARRANTY_TYPES = [
  { value: 'Comprehensive Manufacturer Warranty', label: 'Comprehensive Manufacturer Warranty' },
  { value: 'Standard Limited Warranty', label: 'Standard Limited Warranty' },
  { value: 'AppleCare+ Extended Protection', label: 'AppleCare+ Extended Protection' },
  { value: 'Extended Warranty Care', label: 'Extended Warranty Care' },
  { value: 'Annual Maintenance Contract (AMC)', label: 'Annual Maintenance Contract (AMC)' },
  { value: 'Store Replacement Guarantee', label: 'Store Replacement Guarantee' },
  { value: 'Other', label: 'Other Custom Warranty' },
];

export default function WarrantyForm({
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
    const defaultEnd = new Date();
    defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
    const defaultEndStr = defaultEnd.toISOString().split('T')[0];

    return {
      productId: initialValues?.productId || initialProductId || (products[0]?.id || ''),
      type: initialValues?.type || 'Comprehensive Manufacturer Warranty',
      provider: initialValues?.provider || '',
      startDate: initialValues?.startDate || today,
      endDate: initialValues?.endDate || defaultEndStr,
      durationMonths: initialValues?.durationMonths ? String(initialValues.durationMonths) : '12',
      coverageDetails: initialValues?.coverageDetails || '',
      supportContact: initialValues?.supportContact || '',
      terms: initialValues?.terms || '',
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
    const matched = products.find((p) => p.id === selectedProdId || p.productId === selectedProdId);

    setFormData((prev) => ({
      ...prev,
      productId: selectedProdId,
      provider: prev.provider ? prev.provider : matched ? `${matched.brand} India Service` : '',
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
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // If dates change, automatically calculate duration in months
      if (name === 'startDate' || name === 'endDate') {
        const start = new Date(name === 'startDate' ? value : prev.startDate);
        const end = new Date(name === 'endDate' ? value : prev.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
          const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));
          next.durationMonths = String(months);
        }
      }

      return next;
    });

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

    if (!formData.type.trim()) {
      nextErrors.type = 'Warranty type is required';
    }

    if (!formData.provider.trim()) {
      nextErrors.provider = 'Warranty provider is required';
    }

    if (!formData.startDate) {
      nextErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      nextErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      if (isNaN(start.getTime())) {
        nextErrors.startDate = 'Invalid start date format';
      }
      if (isNaN(end.getTime())) {
        nextErrors.endDate = 'Invalid end date format';
      }

      if (start >= end) {
        nextErrors.endDate = 'Warranty end date must be after start date';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      productId: formData.productId,
      type: formData.type.trim(),
      provider: formData.provider.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      durationMonths: Number(formData.durationMonths) || 12,
      coverageDetails: formData.coverageDetails.trim() || 'Comprehensive manufacturer warranty coverage.',
      supportContact: formData.supportContact.trim(),
      terms: formData.terms.trim(),
    };

    onSubmit(payload);
  };

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.brand}${p.modelNumber ? ` • ${p.modelNumber}` : ''})`,
  }));

  return (
    <form className="warranty-form" onSubmit={handleSubmit} noValidate>
      <div className="warranty-form-grid">
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
            disabled={isEdit} // keep product locked on edit
          />
        </div>

        {/* Warranty Type */}
        <Select
          label="Warranty Type / Plan"
          name="type"
          value={formData.type}
          onChange={handleChange}
          options={DEFAULT_WARRANTY_TYPES}
          required
          error={errors.type}
        />

        {/* Provider */}
        <Input
          label="Warranty Provider / Issuer"
          name="provider"
          value={formData.provider}
          onChange={handleChange}
          placeholder="e.g. Apple India, Samsung Brand Care, Voltas Services"
          required
          error={errors.provider}
          icon={FiShield}
        />

        {/* Start Date */}
        <Input
          label="Coverage Start Date"
          name="startDate"
          type="date"
          value={formData.startDate}
          onChange={handleChange}
          required
          error={errors.startDate}
          icon={FiCalendar}
        />

        {/* End Date */}
        <Input
          label="Coverage Expiry Date"
          name="endDate"
          type="date"
          value={formData.endDate}
          onChange={handleChange}
          required
          error={errors.endDate}
          icon={FiCalendar}
        />

        {/* Duration (Months) */}
        <Input
          label="Duration (Months)"
          name="durationMonths"
          type="number"
          min="1"
          value={formData.durationMonths}
          onChange={handleChange}
          placeholder="e.g. 12"
          helperText="Computed from start and end dates"
        />

        {/* Support Contact Helpline */}
        <Input
          label="Support Helpline / Contact"
          name="supportContact"
          type="text"
          value={formData.supportContact}
          onChange={handleChange}
          placeholder="e.g. 1800-425-0744 or support@brand.com"
          icon={FiPhone}
        />

        {/* Coverage Scope */}
        <div className="form-col-span-2">
          <Input
            label="Coverage Details & Scope"
            name="coverageDetails"
            value={formData.coverageDetails}
            onChange={handleChange}
            placeholder="e.g. On-site panel and compressor coverage. Unlimited accidental damage incidents."
            icon={FiFileText}
          />
        </div>
      </div>

      {/* Terms & Notes */}
      <div className="warranty-form-notes">
        <label htmlFor="warranty-terms" className="input-label">
          Terms & Warranty Notes
        </label>
        <textarea
          id="warranty-terms"
          name="terms"
          value={formData.terms}
          onChange={handleChange}
          placeholder="e.g. Keep original invoice copy. Claim requires inspection by authorized technician."
          rows={3}
          className="warranty-textarea"
        />
      </div>

      {/* Action Buttons */}
      <div className="warranty-form-actions">
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
          {isEdit ? 'Save Changes' : 'Register Warranty'}
        </Button>
      </div>
    </form>
  );
}
