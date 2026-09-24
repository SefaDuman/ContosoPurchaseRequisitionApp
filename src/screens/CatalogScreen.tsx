import { useState } from 'react';
import { CategoryTree } from '../components/CategoryTree';
import { AsyncBoundary } from '../components/common';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { formatMoney } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import type { CategoryNode, Product, ProductDimensions } from '../models';
import {
  getCategoryTree,
  getProductDimensions,
  getProductImage,
  getProductsByCategory,
  searchProducts,
} from '../services';
import { useAppState, type Dimensions } from '../state/AppState';

/** Find a category node anywhere in the tree by name. */
function findNode(nodes: CategoryNode[], name: string): CategoryNode | undefined {
  for (const n of nodes) {
    if (n.name === name) return n;
    const found = findNode(n.children, name);
    if (found) return found;
  }
  return undefined;
}

/** Collect a node and all of its descendants' names (depth-first). */
function collectNames(nodes: CategoryNode[]): string[] {
  const out: string[] = [];
  const walk = (n: CategoryNode) => {
    out.push(n.name);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

export function CatalogScreen({ onGoToCart }: { onGoToCart: () => void }) {
  const { addCatalogItem, cartCount, company } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [detailProduct, setDetailProduct] = useState<Product>();

  const categoriesState = useAsync(() => getCategoryTree(), []);
  const tree = categoriesState.data ?? [];

  // When a search is active it takes precedence over the selected category.
  // Selecting a category shows every product under it and its sub-categories;
  // with no selection we show all products across the procurement hierarchy.
  const productsState = useAsync<Product[]>(() => {
    if (activeSearch.trim()) return searchProducts(activeSearch.trim(), company);
    if (selectedCategory) {
      const node = findNode(tree, selectedCategory);
      return getProductsByCategory(node ? collectNames([node]) : [selectedCategory], company);
    }
    if (tree.length > 0) return getProductsByCategory(collectNames(tree), company);
    return Promise.resolve([]);
    // Depend on the stable `categoriesState.data` ref, not the `tree` fallback
    // array (which is re-allocated every render and would loop the effect).
  }, [activeSearch, selectedCategory, company, categoriesState.data]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setActiveSearch('');
  };

  return (
    <div className="catalog">
      <aside className="catalog-sidebar">
        <h2>Categories</h2>
        <AsyncBoundary
          loading={categoriesState.loading}
          error={categoriesState.error}
          data={categoriesState.data}
          isEmpty={(d) => d.length === 0}
          emptyTitle="No categories"
          emptyHint="No procurement categories were returned from Dataverse."
          onRetry={categoriesState.reload}
          loadingLabel="Loading categories…"
        >
          {(categories) => (
            <CategoryTree
              categories={categories}
              selected={selectedCategory}
              onSelect={(name) => {
                clearSearch();
                setSelectedCategory(name);
              }}
            />
          )}
        </AsyncBoundary>
      </aside>

      <section className="catalog-main">
        <div className="catalog-toolbar">
          <form className="search" onSubmit={submitSearch} role="search">
            <input
              type="search"
              placeholder="Search products by name or number…"
              aria-label="Search products"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn" type="submit">Search</button>
            {activeSearch && (
              <button className="btn ghost" type="button" onClick={clearSearch}>
                Clear
              </button>
            )}
          </form>
          <button className="btn cart-btn" type="button" onClick={onGoToCart}>
            🛒 Cart{cartCount > 0 ? ` (${cartCount})` : ''}
          </button>
        </div>

        <div className="catalog-context">
          {activeSearch ? (
            <span>Search results for “{activeSearch}”</span>
          ) : selectedCategory ? (
            <span>
              Category: <strong>{selectedCategory}</strong> <span className="muted">(incl. sub-categories)</span>
            </span>
          ) : (
            <span>All products</span>
          )}
          <NonCatalogRequest selectedCategory={selectedCategory} />
        </div>

        <AsyncBoundary
          loading={productsState.loading || (!activeSearch && !selectedCategory && categoriesState.loading)}
          error={productsState.error}
          data={productsState.data}
          isEmpty={(d) => d.length === 0}
          emptyTitle="No products found"
          emptyHint="Try another category or search term."
          onRetry={productsState.reload}
          loadingLabel="Loading products…"
        >
          {(products) => (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard
                  key={p.productNumber}
                  product={p}
                  onOpenDetails={() => setDetailProduct(p)}
                  onAdd={(qty, dimensions) =>
                    addCatalogItem(p, qty, selectedCategory ?? p.categoryName ?? '', dimensions)
                  }
                />
              ))}
            </div>
          )}
        </AsyncBoundary>
      </section>

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          categoryName={selectedCategory}
          onClose={() => setDetailProduct(undefined)}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
  onOpenDetails,
}: {
  product: Product;
  onAdd: (qty: number, dimensions?: Dimensions) => void;
  onOpenDetails: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Real product image (base64 Bitmap) with placeholder fallback while loading.
  const imageState = useAsync(() => getProductImage(product.itemNumber), [product.itemNumber]);
  const imgSrc = imageState.data ?? product.imageUrl;

  // Dimensions are loaded lazily on the first add attempt (mirrors the Canvas
  // Product Screen). If the product has variants, the user must pick them.
  const [dims, setDims] = useState<ProductDimensions | null>(null);
  const [loadingDims, setLoadingDims] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [style, setStyle] = useState('');

  const hasDimensions = (d: ProductDimensions) =>
    d.colors.length > 0 ||
    d.sizes.length > 0 ||
    d.configurations.length > 0 ||
    d.styles.length > 0;

  const flash = () => {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  const commit = () => {
    onAdd(qty, {
      color: color || undefined,
      size: size || undefined,
      configuration: configuration || undefined,
      style: style || undefined,
    });
    setShowOptions(false);
    flash();
  };

  const handleAddClick = async () => {
    let d = dims;
    if (!d) {
      setLoadingDims(true);
      try {
        d = await getProductDimensions(product.productNumber);
      } catch {
        d = { colors: [], sizes: [], configurations: [], styles: [] };
      } finally {
        setLoadingDims(false);
      }
      setDims(d);
    }
    if (hasDimensions(d)) setShowOptions(true);
    else {
      onAdd(qty);
      flash();
    }
  };

  // Every dimension the product exposes must be chosen before adding.
  const requiredSelected =
    !dims ||
    ((dims.colors.length === 0 || !!color) &&
      (dims.sizes.length === 0 || !!size) &&
      (dims.configurations.length === 0 || !!configuration) &&
      (dims.styles.length === 0 || !!style));

  return (
    <article className="card">
      <button
        type="button"
        className="card-open"
        onClick={onOpenDetails}
        aria-label={`View details for ${product.name}`}
      >
        <img className="card-img" src={imgSrc} alt="" />
      </button>
      <div className="card-body">
        <button type="button" className="card-title-btn" onClick={onOpenDetails}>
          <h3 className="card-title" title={product.name}>{product.name}</h3>
        </button>
        <div className="card-meta">
          <span className="muted">#{product.productNumber}</span>
          <span className="muted">{product.unit}</span>
        </div>
        <div className="card-price">
          {formatMoney(product.indicativePrice)}
          <span className="indicative" title="Final price is set by D365 trade agreements at PO time">
            indicative
          </span>
        </div>

        {showOptions && dims && (
          <div className="card-dimensions">
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

        <div className="card-actions">
          <label className="qty">
            <span className="sr-only">Quantity</span>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          {showOptions ? (
            <button className="btn primary" type="button" disabled={!requiredSelected} onClick={commit}>
              Add
            </button>
          ) : (
            <button
              className={`btn primary${added ? ' ok' : ''}`}
              type="button"
              disabled={loadingDims}
              onClick={handleAddClick}
            >
              {added ? '✓ Added' : loadingDims ? 'Loading…' : 'Add to cart'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function NonCatalogRequest({ selectedCategory }: { selectedCategory?: string }) {
  const { addNonCatalogItem } = useAppState();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(selectedCategory ?? '');
  const [qty, setQty] = useState(1);

  const canAdd = description.trim() && (category.trim() || selectedCategory);

  const submit = () => {
    if (!canAdd) return;
    addNonCatalogItem(description.trim(), (category || selectedCategory || '').trim(), qty);
    setDescription('');
    setQty(1);
    setOpen(false);
  };

  return (
    <div className="noncatalog">
      <button className="btn ghost" type="button" onClick={() => setOpen((v) => !v)}>
        + Non-catalog request
      </button>
      {open && (
        <div className="noncatalog-panel">
          <label>
            Description
            <textarea
              value={description}
              placeholder="Describe what you need (free text)…"
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            Procurement category
            <input
              type="text"
              value={category || selectedCategory || ''}
              placeholder="e.g. Office supplies"
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <label className="qty">
            Quantity
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          <div className="noncatalog-actions">
            <button className="btn primary" type="button" disabled={!canAdd} onClick={submit}>
              Add to cart
            </button>
            <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
