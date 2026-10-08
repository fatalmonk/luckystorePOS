export const FREE_DELIVERY_THRESHOLD = 500;
export const STANDARD_DELIVERY_FEE = 40;

export function calculateCartTotals(items: { price: number; qty: number }[]) {
  const totalItems = items.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const deliveryFee = items.length === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const total = items.length === 0 ? 0 : subtotal + deliveryFee;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  return { totalItems, subtotal, deliveryFee, total, amountToFreeDelivery };
}
