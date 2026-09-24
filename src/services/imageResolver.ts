/**
 * Pluggable product image resolver.
 *
 * F&O product images are NOT exposed on the Dataverse virtual entities, so the
 * app resolves images itself. The default returns an inline SVG placeholder;
 * host apps can override with a CDN base URL or an explicit product->URL map.
 */

export interface ImageResolverInput {
  productNumber: string;
  itemNumber: string;
  name: string;
}

export type ImageResolver = (input: ImageResolverInput) => string;

/** Deterministic pastel colour from a string, so cards look stable per product. */
function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 82%)`;
}

/** Inline SVG placeholder showing the product initials — no network needed. */
export const placeholderImageResolver: ImageResolver = ({ name, productNumber }) => {
  const label = (name || productNumber || '?').trim();
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const bg = colorFor(productNumber || label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180">
    <rect width="240" height="180" fill="${bg}"/>
    <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
      font-family="Segoe UI, sans-serif" font-size="56" font-weight="600" fill="#374151">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

let activeResolver: ImageResolver = placeholderImageResolver;

/** Override the global image resolver (e.g. from app bootstrap). */
export function setImageResolver(resolver: ImageResolver): void {
  activeResolver = resolver;
}

/**
 * Convenience override: resolve images from a CDN using the product number,
 * falling back to the placeholder when the CDN has no image.
 */
export function useCdnImageResolver(baseUrl: string, extension = 'png'): void {
  const trimmed = baseUrl.replace(/\/$/, '');
  activeResolver = (input) =>
    input.productNumber
      ? `${trimmed}/${encodeURIComponent(input.productNumber)}.${extension}`
      : placeholderImageResolver(input);
}

/** Convenience override: resolve images from an explicit product->URL map. */
export function useImageMap(map: Record<string, string>): void {
  activeResolver = (input) => map[input.productNumber] ?? placeholderImageResolver(input);
}

/** Resolve an image URL for a product using the active resolver. */
export function resolveImage(input: ImageResolverInput): string {
  return activeResolver(input);
}
