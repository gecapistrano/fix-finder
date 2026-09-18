import { SUPER_GLUE_NAME } from "./products";

/**
 * Outbound vendor links.
 *
 * The advisor does not assume a particular manufacturer, so these default to
 * plain web and marketplace searches for a generic adhesive. Deployments tied
 * to a real brand can set the matching NEXT_PUBLIC_VENDOR_* variables; nothing
 * else in the app needs to change.
 *
 * Each variable is read with a literal `process.env.NEXT_PUBLIC_*` expression.
 * That is deliberate: the bundler substitutes these at build time by matching
 * the static text, so a computed lookup like `process.env[key]` would resolve
 * on the server but come back undefined in the browser, and the two renders
 * would disagree.
 */

const webSearch = (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;

const marketplace = (host, q) =>
  `https://${host}/search?keyword=${encodeURIComponent(q)}`;

export const VENDOR = {
  home: process.env.NEXT_PUBLIC_VENDOR_HOME || webSearch(SUPER_GLUE_NAME),

  products:
    process.env.NEXT_PUBLIC_VENDOR_PRODUCTS || webSearch(SUPER_GLUE_NAME),

  knowledge:
    process.env.NEXT_PUBLIC_VENDOR_KNOWLEDGE ||
    webSearch("adhesive repair guides"),

  support:
    process.env.NEXT_PUBLIC_VENDOR_SUPPORT ||
    webSearch(`${SUPER_GLUE_NAME} technical support`),

  contact:
    process.env.NEXT_PUBLIC_VENDOR_CONTACT ||
    webSearch(`${SUPER_GLUE_NAME} customer support`),

  shopee:
    process.env.NEXT_PUBLIC_VENDOR_SHOPEE ||
    marketplace("shopee.ph", SUPER_GLUE_NAME),

  lazada:
    process.env.NEXT_PUBLIC_VENDOR_LAZADA ||
    `https://www.lazada.com.ph/catalog/?q=${encodeURIComponent(SUPER_GLUE_NAME)}`,

  search: (query) => webSearch(query),
};
