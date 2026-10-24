import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Card from '../components/common/Card/Card';
import ProductForm from '../components/products/ProductForm';
import { productService } from '../services/productService';
import { warrantyService } from '../services/warrantyService';
import { useToast } from '../hooks/useToast';
import './ProductDetailPage.css';

export default function ProductNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    if (loading) return;
    try {
      setLoading(true);
      const newProduct = await productService.createProduct({
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        modelNumber: formData.modelNumber,
        serialNumber: formData.serialNumber,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        notes: formData.notes,
      });

      if (formData.warrantyDetails) {
        const purchaseDate = new Date(formData.purchaseDate);
        const endDate = new Date(purchaseDate);
        endDate.setMonth(endDate.getMonth() + formData.warrantyDetails.durationMonths);

        await warrantyService.createWarranty({
          productId: newProduct.id,
          provider: formData.warrantyDetails.provider,
          type: formData.warrantyDetails.type,
          durationMonths: formData.warrantyDetails.durationMonths,
          startDate: formData.purchaseDate,
          endDate: endDate.toISOString().split('T')[0],
          coverageDetails: `Comprehensive coverage provided by ${formData.warrantyDetails.provider}.`,
        });
      }

      toast.success(`"${newProduct.name}" registered successfully!`);
      navigate(`/products/${newProduct.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to register product. Please check form inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-detail-page">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/products" className="breadcrumb-link">
          <FiArrowLeft /> Products
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Add New Product</span>
      </nav>

      <PageHeader
        title="Add New Product"
        subtitle="Register an electronic device or home appliance with warranty information."
      />

      <Card style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <ProductForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/products')}
          isEdit={false}
          loading={loading}
        />
      </Card>
    </div>
  );
}
