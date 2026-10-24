import React, { useState } from 'react';
import {
  FiBox,
  FiTag,
  FiCalendar,
  FiDollarSign,
  FiShield,
  FiHash,
} from 'react-icons/fi';
import Input from '../common/Input/Input';
import Select from '../common/Select/Select';
import Button from '../common/Button/Button';
import './ProductForm.css';

const DEFAULT_CATEGORIES = [
  { value: 'Laptop', label: 'Laptop' },
  { value: 'Smartphone', label: 'Smartphone' },
  { value: 'Television', label: 'Television' },
  { value: 'Refrigerator', label: 'Refrigerator' },
  { value: 'Washing Machine', label: 'Washing Machine' },
  { value: 'Air Conditioner', label: 'Air Conditioner' },
  { value: 'Microwave', label: 'Microwave' },
  { value: 'Printer', label: 'Printer' },
  { value: 'Dishwasher', label: 'Dishwasher' },
  { value: 'Air Purifier', label: 'Air Purifier' },
  { value: 'Audio & Speakers', label: 'Audio & Speakers' },
  { value: 'Camera', label: 'Camera' },
  { value: 'Other', label: 'Other Appliance' },
];

export default function ProductForm({
  initialValues = null,
  onSubmit,
  onCancel,
  isEdit = false,
  loading = false,
}) {
  const [formData, setFormData] = useState(() => ({
    name: initialValues?.name || '',
    brand: initialValues?.brand || '',
    category: initialValues?.category || 'Laptop',
    modelNumber: initialValues?.modelNumber || '',
    serialNumber: initialValues?.serialNumber || '',
    purchaseDate: initialValues?.purchaseDate || new Date().toISOString().split('T')[0],
    purchasePrice: initialValues?.purchasePrice !== undefined ? String(initialValues.purchasePrice) : '',
    notes: initialValues?.notes || '',
    // Optional initial warranty registration (for new product creation)
    includeWarranty: !isEdit,
    warrantyMonths: initialValues?.warranty?.durationMonths ? String(initialValues.warranty.durationMonths) : '12',
    warrantyProvider: initialValues?.warranty?.provider || '',
    warrantyType: initialValues?.warranty?.type || 'Comprehensive Manufacturer Warranty',
  }));

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

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

    if (!formData.name.trim()) {
      nextErrors.name = 'Product name is required';
    } else if (formData.name.trim().length < 2) {
      nextErrors.name = 'Product name must be at least 2 characters';
    }

    if (!formData.brand.trim()) {
      nextErrors.brand = 'Brand is required';
    }

    if (!formData.category.trim()) {
      nextErrors.category = 'Category is required';
    }

    if (!formData.purchaseDate) {
      nextErrors.purchaseDate = 'Purchase date is required';
    } else {
      const selected = new Date(formData.purchaseDate);
      const now = new Date();
      // Allow today, but not future dates
      now.setHours(23, 59, 59, 999);
      if (selected > now) {
        nextErrors.purchaseDate = 'Purchase date cannot be in the future';
      }
    }

    if (formData.purchasePrice === '' || formData.purchasePrice === null) {
      nextErrors.purchasePrice = 'Purchase price is required';
    } else if (isNaN(formData.purchasePrice) || Number(formData.purchasePrice) < 0) {
      nextErrors.purchasePrice = 'Please enter a valid price (greater than or equal to 0)';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      category: formData.category,
      modelNumber: formData.modelNumber.trim(),
      serialNumber: formData.serialNumber.trim(),
      purchaseDate: formData.purchaseDate,
      purchasePrice: Number(formData.purchasePrice) || 0,
      notes: formData.notes.trim(),
      ...(formData.includeWarranty
        ? {
            warrantyDetails: {
              durationMonths: Number(formData.warrantyMonths) || 12,
              provider: formData.warrantyProvider.trim() || `${formData.brand.trim()} India Service`,
              type: formData.warrantyType.trim() || 'Comprehensive Manufacturer Warranty',
            },
          }
        : {}),
    };

    onSubmit(payload);
  };

  return (
    <form className="product-form" onSubmit={handleSubmit} noValidate>
      <div className="product-form-grid">
        {/* Name */}
        <div className="form-col-span-2">
          <Input
            label="Product Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. MacBook Pro 14 M3, Samsung Smart Refrigerator"
            required
            error={errors.name}
            icon={FiBox}
          />
        </div>

        {/* Brand */}
        <Input
          label="Brand / Manufacturer"
          name="brand"
          value={formData.brand}
          onChange={handleChange}
          placeholder="e.g. Apple, Samsung, Sony, LG"
          required
          error={errors.brand}
          icon={FiTag}
        />

        {/* Category */}
        <Select
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          options={DEFAULT_CATEGORIES}
          required
          error={errors.category}
        />

        {/* Model Number */}
        <Input
          label="Model Number"
          name="modelNumber"
          value={formData.modelNumber}
          onChange={handleChange}
          placeholder="e.g. MRX33HN/A, RF57A5032S9"
          helperText="Found on product label or packaging"
          icon={FiHash}
        />

        {/* Serial Number */}
        <Input
          label="Serial Number"
          name="serialNumber"
          value={formData.serialNumber}
          onChange={handleChange}
          placeholder="e.g. C02G879QMD6T, SN-449102"
          helperText="Needed for warranty claims"
          icon={FiHash}
        />

        {/* Purchase Date */}
        <Input
          label="Purchase Date"
          name="purchaseDate"
          type="date"
          value={formData.purchaseDate}
          onChange={handleChange}
          required
          error={errors.purchaseDate}
          icon={FiCalendar}
        />

        {/* Purchase Price */}
        <Input
          label="Purchase Price (₹ INR)"
          name="purchasePrice"
          type="number"
          min="0"
          step="1"
          value={formData.purchasePrice}
          onChange={handleChange}
          placeholder="e.g. 74990"
          required
          error={errors.purchasePrice}
          icon={FiDollarSign}
        />
      </div>

      {/* Optional Warranty Attachment for New Products */}
      {!isEdit && (
        <div className="warranty-setup-section">
          <label className="warranty-toggle-label">
            <input
              type="checkbox"
              name="includeWarranty"
              checked={formData.includeWarranty}
              onChange={handleChange}
              className="warranty-toggle-checkbox"
            />
            <span className="warranty-toggle-text">
              <FiShield className="warranty-section-icon" />
              <span>Record manufacturer warranty alongside this product</span>
            </span>
          </label>

          {formData.includeWarranty && (
            <div className="warranty-fields-box">
              <div className="warranty-fields-grid">
                <Select
                  label="Warranty Duration"
                  name="warrantyMonths"
                  value={formData.warrantyMonths}
                  onChange={handleChange}
                  options={[
                    { value: '6', label: '6 Months' },
                    { value: '12', label: '1 Year (12 Months)' },
                    { value: '24', label: '2 Years (24 Months)' },
                    { value: '36', label: '3 Years (36 Months)' },
                    { value: '60', label: '5 Years (60 Months)' },
                  ]}
                />

                <Input
                  label="Warranty Provider"
                  name="warrantyProvider"
                  value={formData.warrantyProvider}
                  onChange={handleChange}
                  placeholder={`e.g. ${formData.brand ? formData.brand + ' India' : 'Brand Authorized Service'}`}
                />
              </div>

              <Input
                label="Coverage / Plan Name"
                name="warrantyType"
                value={formData.warrantyType}
                onChange={handleChange}
                placeholder="e.g. Standard Limited Warranty, Comprehensive Care"
              />
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="product-form-notes">
        <label htmlFor="product-notes" className="input-label">
          Notes & Usage Location
        </label>
        <textarea
          id="product-notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="e.g. Located in living room. Bill stored in filing cabinet. Purchased via Amazon."
          rows={3}
          className="product-textarea"
        />
      </div>

      {/* Form Action Buttons */}
      <div className="product-form-actions">
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
          {isEdit ? 'Save Changes' : 'Register Product'}
        </Button>
      </div>
    </form>
  );
}
