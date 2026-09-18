/**
 * The adhesive this advisor recommends.
 *
 * Fix Finder is deliberately vendor-agnostic. Every product-specific string,
 * image, and link lives here or in `vendor.js`, so the same engine can be
 * pointed at a different adhesive by editing two files and nothing else. The
 * defaults describe a generic cyanoacrylate rather than a particular brand.
 */

export const SUPER_GLUE_NAME =
  process.env.NEXT_PUBLIC_PRODUCT_NAME || "Universal Super Glue";

export const SUPER_GLUE_IMAGE =
  process.env.NEXT_PUBLIC_PRODUCT_IMAGE || "/products/adhesive.svg";

/** Grams per retail pack, used to turn a dose into a shopping quantity. */
export const PACK_GRAMS = Number(process.env.NEXT_PUBLIC_PACK_GRAMS) || 3;

export function productImage() {
  return SUPER_GLUE_IMAGE;
}

export function buyLabel() {
  return `Buy ${SUPER_GLUE_NAME}`;
}

export function formatGrams(grams) {
  if (grams == null || Number.isNaN(Number(grams))) {
    return "";
  }
  const value = Number(grams);
  return Number.isInteger(value) ? String(value) : String(value);
}

export function packsNeeded(grams) {
  const value = Number(grams);
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(value / PACK_GRAMS));
}
