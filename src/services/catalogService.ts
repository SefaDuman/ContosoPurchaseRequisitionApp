/**
 * Catalog service — category tree, product browsing and search.
 *
 * Wraps the generated Dataverse virtual-entity services and maps their verbose
 * `mserp_*` fields into the clean app models. All product reads are scoped to
 * the active company (default USMF).
 */

import {
  Mserp_ecoresproductcategoryentitiesService,
  Mserp_ecoresproductcategoryassignmententitiesService,
  Mserp_ecoresreleasedproductv2entitiesService,
  Mserp_ecoresproductcategoryhierarchyroleentitiesService,
  Mserp_ecoresreleasedproductdocumentattachmententitiesService,
  Mserp_ecoresproductmastercolorentitiesService,
  Mserp_ecoresproductmastersizeentitiesService,
  Mserp_ecoresproductmasterconfigurationentitiesService,
  Mserp_ecoresproductmasterstyleentitiesService,
} from '../generated';
import type { Mserp_ecoresproductcategoryentities } from '../generated/models/Mserp_ecoresproductcategoryentitiesModel';
import type { Mserp_ecoresproductcategoryassignmententities } from '../generated/models/Mserp_ecoresproductcategoryassignmententitiesModel';
import type { Mserp_ecoresreleasedproductv2entities } from '../generated/models/Mserp_ecoresreleasedproductv2entitiesModel';
import type { Mserp_ecoresproductcategoryhierarchyroleentities } from '../generated/models/Mserp_ecoresproductcategoryhierarchyroleentitiesModel';
import type { Mserp_ecoresreleasedproductdocumentattachmententities } from '../generated/models/Mserp_ecoresreleasedproductdocumentattachmententitiesModel';
import type { Mserp_ecoresproductmastercolorentities } from '../generated/models/Mserp_ecoresproductmastercolorentitiesModel';
import type { Mserp_ecoresproductmastersizeentities } from '../generated/models/Mserp_ecoresproductmastersizeentitiesModel';
import type { Mserp_ecoresproductmasterconfigurationentities } from '../generated/models/Mserp_ecoresproductmasterconfigurationentitiesModel';
import type { Mserp_ecoresproductmasterstyleentities } from '../generated/models/Mserp_ecoresproductmasterstyleentitiesModel';
import type { Category, CategoryNode, Product, ProductDetails, ProductDimensions } from '../models';
import { DEFAULT_COMPANY, odataString } from './config';
import { guard } from './errors';
import { resolveImage } from './imageResolver';
import { fetchAll } from './paging';

// Dataverse-remapped option-set value for the procurement category hierarchy role.
const PROCUREMENT_HIERARCHY_ROLE = 200000000;

// Each `or` condition nests one level and long lists truncate on the F&O
// virtual entity, so product-number equality lists are split into small,
// safe batches per request.
const FILTER_CHUNK_SIZE = 10;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Resolve a product's image as a base64 data URL from the released-product
 * document attachments (mirrors the Canvas LookUp on 'Item number' -> Bitmap;
 * the F&O "Bitmap" field is the `Attachment` binary column). Returns undefined
 * when there is no image or on any failure so callers can fall back to the
 * placeholder.
 */
export async function getProductImage(itemNumber: string): Promise<string | undefined> {
  if (!itemNumber) return undefined;
  try {
    const rows = await fetchAll<Mserp_ecoresreleasedproductdocumentattachmententities>(
      'Load product image',
      (o) => Mserp_ecoresreleasedproductdocumentattachmententitiesService.getAll(o),
      {
        top: 1,
        select: ['mserp_itemnumber', 'mserp_attachment'],
        filter: `mserp_itemnumber eq '${odataString(itemNumber)}'`,
      },
    );
    const bitmap = rows[0]?.mserp_attachment;
    return bitmap ? `data:image/jpeg;base64,${bitmap}` : undefined;
  } catch {
    return undefined;
  }
}

const PRODUCT_SELECT = [
  'mserp_productnumber',
  'mserp_itemnumber',
  'mserp_searchname',
  'mserp_purchaseunitsymbol',
  'mserp_purchaseprice',
  'mserp_dataareaid',
];

function mapProduct(p: Mserp_ecoresreleasedproductv2entities, categoryName?: string): Product {
  const productNumber = p.mserp_productnumber ?? '';
  const itemNumber = p.mserp_itemnumber ?? productNumber;
  const name = p.mserp_searchname || productNumber;
  return {
    productNumber,
    itemNumber,
    name,
    unit: p.mserp_purchaseunitsymbol ?? 'ea',
    // Indicative only — the final price is set by D365 trade agreements at PO time.
    indicativePrice: p.mserp_purchaseprice ?? 0,
    company: p.mserp_dataareaid ?? DEFAULT_COMPANY,
    imageUrl: resolveImage({ productNumber, itemNumber, name }),
    categoryName,
  };
}

function mapCategory(c: Mserp_ecoresproductcategoryentities): Category {
  return {
    name: c.mserp_categoryname,
    parentName: c.mserp_parentproductcategoryname || null,
    hierarchyName: c.mserp_productcategoryhierarchyname,
    description: c.mserp_categorydescription,
  };
}

/**
 * Name of the active procurement category hierarchy.
 *
 * Mirrors the Canvas logic: look up the hierarchy-role record whose role is the
 * procurement hierarchy, then read its category-hierarchy name. Categories are
 * later filtered to this hierarchy so only procurement categories show.
 */
async function getProcurementHierarchyName(): Promise<string | undefined> {
  const roles = await fetchAll<Mserp_ecoresproductcategoryhierarchyroleentities>(
    'Load procurement hierarchy role',
    (o) => Mserp_ecoresproductcategoryhierarchyroleentitiesService.getAll(o),
    {
      top: 1,
      select: ['mserp_productcategoryhierarchyname', 'mserp_hierarchyrole'],
      filter: `mserp_hierarchyrole eq ${PROCUREMENT_HIERARCHY_ROLE}`,
    },
  );
  return roles[0]?.mserp_productcategoryhierarchyname || undefined;
}

/** Build the procurement category hierarchy as a tree of CategoryNodes. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  return guard('Load category tree', async () => {
    const hierarchyName = await getProcurementHierarchyName();
    const rows = await fetchAll(
      'Load category tree',
      (o) => Mserp_ecoresproductcategoryentitiesService.getAll(o),
      {
        select: [
          'mserp_categoryname',
          'mserp_parentproductcategoryname',
          'mserp_productcategoryhierarchyname',
          'mserp_categorydescription',
        ],
        // Show only the active procurement hierarchy's categories when resolved.
        filter: hierarchyName
          ? `mserp_productcategoryhierarchyname eq '${odataString(hierarchyName)}'`
          : undefined,
        orderBy: ['mserp_categoryname'],
      },
    );

    const categories = rows.filter((c) => c.mserp_categoryname).map(mapCategory);
    return buildTree(categories);
  });
}

/** Assemble a flat category list into a parent/child tree. */
function buildTree(categories: Category[]): CategoryNode[] {
  const byName = new Map<string, CategoryNode>();
  for (const c of categories) {
    byName.set(c.name, { ...c, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const node of byName.values()) {
    const parent = node.parentName ? byName.get(node.parentName) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/**
 * Products assigned to one or more procurement categories. Resolves the
 * assignment table to get the product numbers, then loads the released products
 * for the company. Pass a category plus its descendants to browse a whole
 * sub-tree (mirrors selecting a node and seeing everything beneath it).
 */
export async function getProductsByCategory(
  categoryNames: string | string[],
  company: string = DEFAULT_COMPANY,
  top = 200,
  skip = 0,
): Promise<Product[]> {
  const wanted = new Set(
    (Array.isArray(categoryNames) ? categoryNames : [categoryNames]).filter(Boolean),
  );
  if (wanted.size === 0) return [];
  return guard('Load products for category', async () => {
    // A long `or` list of category names silently truncates on the F&O virtual
    // entity, so scope by the (single) procurement hierarchy in one reliable
    // request and match the requested categories client-side instead.
    const hierarchyName = await getProcurementHierarchyName();
    const assignments = await fetchAll<Mserp_ecoresproductcategoryassignmententities>(
      'Load category assignments',
      (o) => Mserp_ecoresproductcategoryassignmententitiesService.getAll(o),
      {
        select: ['mserp_productnumber', 'mserp_productcategoryname'],
        filter: hierarchyName
          ? `mserp_productcategoryhierarchyname eq '${odataString(hierarchyName)}'`
          : undefined,
      },
    );

    // Remember each product's own category so cards show the right label.
    const categoryByProduct = new Map<string, string>();
    for (const a of assignments) {
      if (
        a.mserp_productnumber &&
        wanted.has(a.mserp_productcategoryname) &&
        !categoryByProduct.has(a.mserp_productnumber)
      ) {
        categoryByProduct.set(a.mserp_productnumber, a.mserp_productcategoryname);
      }
    }

    const productNumbers = Array.from(categoryByProduct.keys()).slice(skip, skip + top);
    if (productNumbers.length === 0) return [];

    // Company-scoped OR of product numbers, again batched to stay under the
    // filter-depth limit.
    const productPages = await Promise.all(
      chunk(productNumbers, FILTER_CHUNK_SIZE).map((batch) => {
        const numbersFilter = batch
          .map((n) => `mserp_productnumber eq '${odataString(n)}'`)
          .join(' or ');
        return fetchAll<Mserp_ecoresreleasedproductv2entities>(
          'Load released products',
          (o) => Mserp_ecoresreleasedproductv2entitiesService.getAll(o),
          {
            select: PRODUCT_SELECT,
            filter: `mserp_dataareaid eq '${odataString(company)}' and (${numbersFilter})`,
          },
        );
      }),
    );
    const products = productPages.flat();

    return products.map((p) => mapProduct(p, categoryByProduct.get(p.mserp_productnumber ?? '')));
  });
}

/** Free-text product search over name and product number, company-scoped. */
export async function searchProducts(
  term: string,
  company: string = DEFAULT_COMPANY,
  top = 60,
): Promise<Product[]> {
  const q = term.trim();
  if (!q) return [];
  return guard('Search products', async () => {
    const safe = odataString(q);
    const products = await fetchAll<Mserp_ecoresreleasedproductv2entities>(
      'Search products',
      (o) => Mserp_ecoresreleasedproductv2entitiesService.getAll(o),
      {
        top,
        select: PRODUCT_SELECT,
        filter:
          `mserp_dataareaid eq '${odataString(company)}' and ` +
          `(contains(mserp_searchname,'${safe}') or contains(mserp_productnumber,'${safe}') or contains(mserp_itemnumber,'${safe}'))`,
        orderBy: ['mserp_searchname'],
      },
    );
    return products.map((p) => mapProduct(p));
  });
}

/**
 * Available product dimensions (color/size/configuration/style) for a product.
 * Mirrors the Canvas Product Screen dropdowns, which filter each master-
 * dimension table by product master number. Empty arrays mean the product has
 * no variants for that dimension.
 */
export async function getProductDimensions(productNumber: string): Promise<ProductDimensions> {
  const empty: ProductDimensions = { colors: [], sizes: [], configurations: [], styles: [] };
  if (!productNumber) return empty;
  return guard('Load product dimensions', async () => {
    const filter = `mserp_productmasternumber eq '${odataString(productNumber)}'`;
    const [colors, sizes, configurations, styles] = await Promise.all([
      fetchAll<Mserp_ecoresproductmastercolorentities>(
        'Load product colors',
        (o) => Mserp_ecoresproductmastercolorentitiesService.getAll(o),
        { select: ['mserp_productcolorid', 'mserp_productmasternumber'], filter },
      ),
      fetchAll<Mserp_ecoresproductmastersizeentities>(
        'Load product sizes',
        (o) => Mserp_ecoresproductmastersizeentitiesService.getAll(o),
        { select: ['mserp_productsizeid', 'mserp_productmasternumber'], filter },
      ),
      fetchAll<Mserp_ecoresproductmasterconfigurationentities>(
        'Load product configurations',
        (o) => Mserp_ecoresproductmasterconfigurationentitiesService.getAll(o),
        { select: ['mserp_productconfigurationid', 'mserp_productmasternumber'], filter },
      ),
      fetchAll<Mserp_ecoresproductmasterstyleentities>(
        'Load product styles',
        (o) => Mserp_ecoresproductmasterstyleentitiesService.getAll(o),
        { select: ['mserp_productstyleid', 'mserp_productmasternumber'], filter },
      ),
    ]);
    const uniqSort = (vals: (string | undefined)[]) =>
      Array.from(new Set(vals.filter((v): v is string => Boolean(v)))).sort((a, b) =>
        a.localeCompare(b),
      );
    return {
      colors: uniqSort(colors.map((c) => c.mserp_productcolorid)),
      sizes: uniqSort(sizes.map((s) => s.mserp_productsizeid)),
      configurations: uniqSort(configurations.map((c) => c.mserp_productconfigurationid)),
      styles: uniqSort(styles.map((s) => s.mserp_productstyleid)),
    };
  });
}

const PRODUCT_DETAIL_SELECT = [
  'mserp_productnumber',
  'mserp_itemnumber',
  'mserp_searchname',
  'mserp_purchaseunitsymbol',
  'mserp_purchaseprice',
  'mserp_dataareaid',
  'mserp_primaryvendoraccountnumber',
  'mserp_buyergroupid',
  'mserp_productcoveragegroupid',
  'mserp_productgroupid',
  'mserp_itemmodelgroupid',
  'mserp_producttypename',
  'mserp_productdimensiongroupname',
  'mserp_storagedimensiongroupname',
  'mserp_trackingdimensiongroupname',
];

/**
 * Extended released-product data for the product detail modal. Mirrors the
 * fields shown on the Canvas Product Screen. Returns undefined when no matching
 * released product exists for the company.
 */
export async function getProductDetails(
  productNumber: string,
  company = DEFAULT_COMPANY,
): Promise<ProductDetails | undefined> {
  if (!productNumber) return undefined;
  return guard('Load product details', async () => {
    const rows = await fetchAll<Mserp_ecoresreleasedproductv2entities>(
      'Load product details',
      (o) => Mserp_ecoresreleasedproductv2entitiesService.getAll(o),
      {
        select: PRODUCT_DETAIL_SELECT,
        filter: `mserp_dataareaid eq '${odataString(company)}' and mserp_productnumber eq '${odataString(
          productNumber,
        )}'`,
        top: 1,
      },
    );
    const p = rows[0];
    if (!p) return undefined;
    return {
      productNumber: p.mserp_productnumber ?? productNumber,
      itemNumber: p.mserp_itemnumber ?? '',
      name: p.mserp_searchname || productNumber,
      purchasePrice: p.mserp_purchaseprice ?? 0,
      purchaseUnit: p.mserp_purchaseunitsymbol || undefined,
      companyCode: p.mserp_dataareaid || undefined,
      vendor: p.mserp_primaryvendoraccountnumber || undefined,
      buyerGroup: p.mserp_buyergroupid || undefined,
      coverageGroup: p.mserp_productcoveragegroupid || undefined,
      itemGroup: p.mserp_productgroupid || undefined,
      itemModelGroup: p.mserp_itemmodelgroupid || undefined,
      productType: p.mserp_producttypename || undefined,
      productDimensionGroup: p.mserp_productdimensiongroupname || undefined,
      storageDimensionGroup: p.mserp_storagedimensiongroupname || undefined,
      trackingDimensionGroup: p.mserp_trackingdimensiongroupname || undefined,
    };
  });
}
