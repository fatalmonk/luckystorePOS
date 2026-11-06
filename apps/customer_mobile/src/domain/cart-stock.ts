export const UNVERIFIED_CART_STOCK_LIMIT = 99;

export function getAvailableCartStock(stock: number | undefined): number {
  return typeof stock === 'number' ? stock : UNVERIFIED_CART_STOCK_LIMIT;
}

export function getEditableCartStockLimit(stock: number | undefined): number {
  return typeof stock === 'number' && stock > 0 ? stock : UNVERIFIED_CART_STOCK_LIMIT;
}
