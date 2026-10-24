/**
 * Regression Test for Product Search and Sibling Search Filters
 * Verifies that searching across products, service records, warranties, documents,
 * and health scores does not throw TypeErrors on numeric IDs or uncoerced properties.
 */
import assert from 'assert';

// 1. PRODUCTS SEARCH
const products = [
  { id: 1, name: 'MacBook Pro 14 M3', brand: 'Apple', modelNumber: 'MRX33HN/A', serialNumber: 'C02G1234MD6R', productId: 'PRD-1', category: 'Electronics', purchasePrice: 199900, purchaseDate: '2024-01-15', warranty: { status: 'active', daysRemaining: 280 }, healthScore: 95 },
  { id: 2, name: 'iPhone 15 Pro', brand: 'Apple', modelNumber: 'A3106', serialNumber: 'DNQX8792K', productId: 'PRD-2', category: 'Electronics', purchasePrice: 134900, purchaseDate: '2023-09-22', warranty: { status: 'expiringSoon', daysRemaining: 18 }, healthScore: 78 },
  { id: 3, name: 'Samsung Neo QLED 65" TV', brand: 'Samsung', modelNumber: 'QA65QN90C', serialNumber: '08343CNM001', productId: 'PRD-3', category: 'Appliances', purchasePrice: 184990, purchaseDate: '2023-11-10', warranty: { status: 'active', daysRemaining: 120 }, healthScore: 90 },
  { id: 4, name: 'Sony WH-1000XM5', brand: 'Sony', modelNumber: 'WH1000XM5/B', serialNumber: '5129841', productId: 'PRD-4', category: 'Audio', purchasePrice: 29990, purchaseDate: '2024-02-01', warranty: { status: 'expired', daysRemaining: 0 }, healthScore: 55 }
];

function filterProducts(items, searchQuery, selectedCategory = 'all', selectedBrand = 'all', selectedWarrantyStatus = 'all') {
  let result = [...items];

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter((p) => {
      const name = String(p.name ?? '').toLowerCase();
      const brand = String(p.brand ?? '').toLowerCase();
      const model = String(p.modelNumber ?? p.model ?? '').toLowerCase();
      const serial = String(p.serialNumber ?? p.serial_number ?? '').toLowerCase();
      const productCode = String(p.productId ?? p.product_code ?? '').toLowerCase();
      const id = String(p.id ?? '').toLowerCase();

      return (
        name.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        serial.includes(q) ||
        productCode.includes(q) ||
        id.includes(q)
      );
    });
  }

  if (selectedCategory !== 'all') {
    result = result.filter(
      (p) => p.category && String(p.category).toLowerCase() === selectedCategory.toLowerCase()
    );
  }

  if (selectedBrand !== 'all') {
    result = result.filter(
      (p) => p.brand && String(p.brand).toLowerCase() === selectedBrand.toLowerCase()
    );
  }

  if (selectedWarrantyStatus !== 'all') {
    result = result.filter((p) => {
      const status = p.warranty?.status || 'expired';
      return String(status).toLowerCase() === selectedWarrantyStatus.toLowerCase();
    });
  }

  return result;
}

// 2. SERVICE RECORDS SEARCH
const serviceRecords = [
  { id: 101, productId: 1, serviceType: 'repair', provider: 'Apple Authorized Service', issueDescription: 'Keyboard replacement', workPerformed: 'Replaced top case', status: 'completed', product: products[0] },
  { id: 102, productId: 2, serviceType: 'maintenance', provider: 'iCare', issueDescription: 'Battery health check', workPerformed: 'Diagnostic pass', status: 'completed', product: products[1] }
];

function filterServiceRecords(records, searchQuery) {
  let result = [...records];
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter((r) => {
      const prod = r.product;
      const issue = String(r.issueDescription || r.description || '').toLowerCase();
      const work = String(r.workPerformed || '').toLowerCase();

      return (
        String(r.id ?? '').toLowerCase().includes(q) ||
        String(r.serviceType ?? '').toLowerCase().includes(q) ||
        String(r.provider ?? '').toLowerCase().includes(q) ||
        String(r.productId ?? '').toLowerCase().includes(q) ||
        String(prod?.name ?? '').toLowerCase().includes(q) ||
        String(prod?.brand ?? '').toLowerCase().includes(q) ||
        String(prod?.productId ?? prod?.product_code ?? '').toLowerCase().includes(q) ||
        issue.includes(q) ||
        work.includes(q)
      );
    });
  }
  return result;
}

// 3. WARRANTIES SEARCH
const warranties = [
  { id: 201, productId: 1, type: 'standard', provider: 'AppleCare', status: 'active', product: products[0] },
  { id: 202, productId: 2, type: 'extended', provider: 'AppleCare+', status: 'expiringSoon', product: products[1] }
];

function filterWarranties(items, searchQuery) {
  let result = [...items];
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter((w) => {
      const prod = w.product;
      return (
        String(w.id ?? '').toLowerCase().includes(q) ||
        String(w.type ?? '').toLowerCase().includes(q) ||
        String(w.provider ?? '').toLowerCase().includes(q) ||
        String(w.productId ?? '').toLowerCase().includes(q) ||
        String(prod?.name ?? '').toLowerCase().includes(q) ||
        String(prod?.brand ?? '').toLowerCase().includes(q) ||
        String(prod?.productId ?? prod?.product_code ?? '').toLowerCase().includes(q)
      );
    });
  }
  return result;
}

// 4. DOCUMENTS SEARCH
const documents = [
  { id: 301, productId: 1, fileName: 'macbook_receipt.pdf', documentType: 'invoice', fileType: 'PDF', description: 'Original purchase receipt', ocrExtractedText: 'Apple Store Total Rs 199,900', product: products[0] },
  { id: 302, productId: 2, fileName: 'iphone_warranty_card.png', documentType: 'warranty_card', fileType: 'PNG', description: 'Apple warranty card', ocrExtractedText: 'AppleCare Protection Plan', product: products[1] }
];

function filterDocuments(docs, searchQuery) {
  let result = [...docs];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter((doc) => {
      const prod = doc.product || {};
      return (
        String(doc.fileName ?? '').toLowerCase().includes(q) ||
        String(doc.id ?? '').toLowerCase().includes(q) ||
        String(doc.documentType ?? '').toLowerCase().includes(q) ||
        String(doc.fileType ?? '').toLowerCase().includes(q) ||
        String(doc.description ?? '').toLowerCase().includes(q) ||
        String(doc.ocrExtractedText ?? '').toLowerCase().includes(q) ||
        String(prod.name ?? '').toLowerCase().includes(q) ||
        String(prod.brand ?? '').toLowerCase().includes(q) ||
        String(prod.category ?? '').toLowerCase().includes(q) ||
        String(doc.productId ?? '').toLowerCase().includes(q) ||
        String(prod.productId ?? prod.product_code ?? '').toLowerCase().includes(q)
      );
    });
  }
  return result;
}

// 5. HEALTH SCORE SEARCH
function filterHealthScore(items, searchQuery, selectedTier = 'all') {
  const q = searchQuery.toLowerCase().trim();
  return items.filter((p) => {
    const matchesSearch =
      q === '' ||
      String(p.name ?? '').toLowerCase().includes(q) ||
      String(p.brand ?? '').toLowerCase().includes(q) ||
      String(p.category ?? '').toLowerCase().includes(q) ||
      String(p.id ?? '').toLowerCase().includes(q) ||
      String(p.productId ?? p.product_code ?? '').toLowerCase().includes(q);

    const matchesTier = selectedTier === 'all' || p.status === selectedTier;
    return matchesSearch && matchesTier;
  });
}

// EXECUTE TESTS
console.log('Running Search Regression Tests...');

// 1. Search "MacBook"
const r1 = filterProducts(products, 'MacBook');
assert.strictEqual(r1.length, 1);
assert.strictEqual(r1[0].name, 'MacBook Pro 14 M3');
console.log('PASS: Search "MacBook" returns 1 product');

// 2. Search "MacBook Pro 14 M3" (exact)
const r2 = filterProducts(products, 'MacBook Pro 14 M3');
assert.strictEqual(r2.length, 1);
assert.strictEqual(r2[0].id, 1);
console.log('PASS: Search exact "MacBook Pro 14 M3" returns 1 product');

// 3. Case-insensitivity ("macbook", "MACBOOK", "mAcBoOk")
assert.strictEqual(filterProducts(products, 'macbook').length, 1);
assert.strictEqual(filterProducts(products, 'MACBOOK').length, 1);
assert.strictEqual(filterProducts(products, 'mAcBoOk').length, 1);
console.log('PASS: Case-insensitivity verified');

// 4. Search "Samsung"
const r3 = filterProducts(products, 'Samsung');
assert.strictEqual(r3.length, 1);
assert.strictEqual(r3[0].name, 'Samsung Neo QLED 65" TV');
console.log('PASS: Search "Samsung" returns 1 product');

// 5. Search by numeric ID string "1" or "3"
assert.strictEqual(filterProducts(products, '1').length >= 1, true);
assert.strictEqual(filterProducts(products, '3').length >= 1, true);
console.log('PASS: Search by numeric ID works cleanly without throwing TypeError');

// 6. Search non-existent string
const r4 = filterProducts(products, 'XYZ-NONEXISTENT');
assert.strictEqual(r4.length, 0);
console.log('PASS: Search non-existent string returns empty list cleanly without throwing');

// 7. Empty and whitespace searches restore all
assert.strictEqual(filterProducts(products, '').length, 4);
assert.strictEqual(filterProducts(products, '   ').length, 4);
console.log('PASS: Empty and whitespace queries restore full product list');

// 8. Search + category / brand / warranty status filter combinations
const r5 = filterProducts(products, 'Apple', 'Electronics', 'Apple', 'active');
assert.strictEqual(r5.length, 1);
assert.strictEqual(r5[0].id, 1);
console.log('PASS: Combined search + category + brand + warranty status filter works correctly');

// 9. Service Records search tests
assert.strictEqual(filterServiceRecords(serviceRecords, 'Keyboard').length, 1);
assert.strictEqual(filterServiceRecords(serviceRecords, '101').length, 1);
assert.strictEqual(filterServiceRecords(serviceRecords, 'Apple').length, 2);
assert.strictEqual(filterServiceRecords(serviceRecords, 'Apple Authorized').length, 1);
assert.strictEqual(filterServiceRecords(serviceRecords, 'NONEXISTENT').length, 0);
console.log('PASS: Service Records search tests passed');

// 10. Warranties search tests
assert.strictEqual(filterWarranties(warranties, 'AppleCare').length, 2);
assert.strictEqual(filterWarranties(warranties, '201').length, 1);
assert.strictEqual(filterWarranties(warranties, 'MacBook').length, 1);
assert.strictEqual(filterWarranties(warranties, 'NONEXISTENT').length, 0);
console.log('PASS: Warranties search tests passed');

// 11. Documents search tests
assert.strictEqual(filterDocuments(documents, 'receipt').length, 1);
assert.strictEqual(filterDocuments(documents, '301').length, 1);
assert.strictEqual(filterDocuments(documents, 'MacBook').length, 1);
assert.strictEqual(filterDocuments(documents, 'AppleCare').length, 1);
assert.strictEqual(filterDocuments(documents, 'NONEXISTENT').length, 0);
console.log('PASS: Documents search tests passed');

// 12. Health score search tests
assert.strictEqual(filterHealthScore(products, 'MacBook').length, 1);
assert.strictEqual(filterHealthScore(products, 'Apple').length, 2);
assert.strictEqual(filterHealthScore(products, '1').length >= 1, true);
assert.strictEqual(filterHealthScore(products, 'NONEXISTENT').length, 0);
console.log('PASS: Health score search tests passed');

console.log('\n========================================');
console.log('ALL 12 SEARCH REGRESSION TESTS PASSED (12/12)');
console.log('========================================');
