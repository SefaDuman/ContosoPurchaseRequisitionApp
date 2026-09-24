import { useEffect, useState } from 'react';
import { formatMoney } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import type { Product, ProductDetails, ProductDimensions } from '../models';
import { getProductDetails, getProductDimensions, getProductImage } from '../services';
import { useAppState, type Dimensions } from '../state/AppState';

interface Props {
  product: Product;
  categoryName?: string;
  onClose: () => void;
}

/** A modern product-detail popup: large image, extended data, and add-to-cart. */
export function ProductDetailModal({ product, categoryName, onClose }: Props) {
  const { addCatalogItem, company } = useAppState();

  const detailState = useAsync<ProductDetails | undefined>(
    () => getProductDetails(product.productNumber, company),
    [product.productNumber, company],
  );
  const imageState = useAsync(() => getProductImage(product.itemNumber), [product.itemNumber]);
  const dimsState = useAsync<ProductDimensions>(
    () => getProductDimensions(product.productNumber),
    [product.productNumber],
  );

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [style, setStyle] = useState('');

  // Close on Escape for a natural modal feel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dims = dimsState.data;
  const imgSrc = imageState.data ?? product.imageUrl;
  const details = detailState.data;

  const requiredSelected =
    !dims ||
    ((dims.colors.length === 0 || !!color) &&
      (dims.sizes.length === 0 || !!size) &&
      (dims.configurations.length === 0 || !!configuration) &&
      (dims.styles.length === 0 || !!style));

  const add = () => {
    if (!requiredSelected) return;
    const dimensions: Dimensions = {
      color: color || undefined,
      size: size || undefined,
      configuration: configuration || undefined,
      style: style || undefined,
    };
    addCatalogItem(product, qty, categoryName ?? product.categoryName ?? '', dimensions);
    setAdded(true);
    window.setTimeout(() => onClose(), 700);
  };

  const rows: Array<[string, string | undefined]> = [
    ['Product number', details?.productNumber ?? product.productNumber],
    ['Item number', details?.itemNumber ?? product.itemNumber],
    ['Company', details?.companyCode ?? product.company],
    ['Purchase unit', details?.purchaseUnit ?? product.unit],
    ['Product type', details?.productType],
    ['Vendor', details?.vendor],
    ['Buyer group', details?.buyerGroup],
    ['Coverage group', details?.coverageGroup],
    ['Item group', details?.itemGroup],
    ['Item model group', details?.itemModelGroup],
    ['Product dimension group', details?.productDimensionGroup],
    ['Storage dimension group', details?.storageDimensionGroup],
    ['Tracking dimension group', details?.trackingDimensionGroup],
    ['Category', categoryName ?? product.categoryName],
  ];

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal product-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${product.name} details`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>

        <div className="product-modal-grid">
          <div className="product-modal-media">
            <img className="product-modal-img" src={imgSrc} alt={product.name} />
          </div>

          <div className="product-modal-info">
            <h2 className="product-modal-title">{product.name}</h2>
            <div className="product-modal-price">
              {formatMoney(details?.purchasePrice ?? product.indicativePrice)}
              <span className="indicative" title="Final price is set by D365 trade agreements at PO time">
                indicative
              </span>
            </div>

            {detailState.loading ? (
              <p className="muted">Loading details…</p>
            ) : (
              <dl className="product-modal-specs">
                {rows
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div className="spec" key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
            )}

            {dims &&
              (dims.colors.length > 0 ||
                dims.sizes.length > 0 ||
                dims.configurations.length > 0 ||
                dims.styles.length > 0) && (
                <div className="product-modal-dimensions">
                  {dims.colors.length > 0 && (
                    <label className="dim">
                      <span>Color</span>
                      <select value={color} onChange={(e) => setColor(e.target.value)}>
                        <option value="">— Select —</option>
                        {dims.colors.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {dims.sizes.length > 0 && (
                    <label className="dim">
                      <span>Size</span>
                      <select value={size} onChange={(e) => setSize(e.target.value)}>
                        <option value="">— Select —</option>
                        {dims.sizes.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {dims.configurations.length > 0 && (
                    <label className="dim">
                      <span>Configuration</span>
                      <select value={configuration} onChange={(e) => setConfiguration(e.target.value)}>
                        <option value="">— Select —</option>
                        {dims.configurations.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {dims.styles.length > 0 && (
                    <label className="dim">
                      <span>Style</span>
                      <select value={style} onChange={(e) => setStyle(e.target.value)}>
                        <option value="">— Select —</option>
                        {dims.styles.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}

            <div className="product-modal-actions">
              <label className="qty">
                <span className="sr-only">Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                />
              </label>
              <button
                className={`btn primary${added ? ' ok' : ''}`}
                type="button"
                disabled={!requiredSelected}
                onClick={add}
              >
                {added ? '✓ Added' : 'Add to cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
