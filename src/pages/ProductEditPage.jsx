import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Card from '../components/common/Card/Card';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Button from '../components/common/Button/Button';
import ProductForm from '../components/products/ProductForm';
import { productService } from '../services/productService';
import { useToast } from '../hooks/useToast';
import './ProductDetailPage.css';

export default function ProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchProduct = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getProductById(id);
      if (!data) {
        setError(`Product with ID "${id}" could not be found.`);
        return;
      }
      setProduct(data);
    } catch (err) {
      setError(err.message || `Product with ID "${id}" could not be found.`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleSubmit = async (formData) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await productService.updateProduct(id, {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        modelNumber: formData.modelNumber,
        serialNumber: formData.serialNumber,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        notes: formData.notes,
      });

      toast.success(`"${formData.name}" details updated successfully!`);
      navigate(`/products/${id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update product details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <Card className="detail-loading-card">
          <LoadingSpinner text="Loading product details..." />
        </Card>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <Card className="detail-error-card">
          <FiAlertCircle className="detail-error-icon" />
          <h2>Product Not Found</h2>
          <p>{error || 'The requested product could not be found.'}</p>
          <div className="detail-error-actions">
            <Button variant="secondary" onClick={fetchProduct}>
              Retry
            </Button>
            <Button variant="primary" icon={FiArrowLeft} onClick={() => navigate('/products')}>
              Back to Products
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/products" className="breadcrumb-link">
          <FiArrowLeft /> Products
        </Link>
        <span className="breadcrumb-separator">/</span>
        <Link to={`/products/${id}`} className="breadcrumb-link">
          {product.name}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Edit</span>
      </nav>

      <PageHeader
        title={`Edit ${product.name}`}
        subtitle="Update product specifications, purchase details, or serial numbers."
      />

      <Card style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <ProductForm
          initialValues={product}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/products/${id}`)}
          isEdit={true}
          loading={isSubmitting}
        />
      </Card>
    </div>
  );
}
