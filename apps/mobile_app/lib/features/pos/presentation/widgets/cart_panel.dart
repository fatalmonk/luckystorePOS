import 'package:flutter/material.dart';
import '../../../../models/pos_models.dart';

/// Right panel with cart items and order summary for the POS screen.
class CartPanel extends StatelessWidget {
  final List<CartItem> cartItems;
  final int itemCount;
  final bool cartIsEmpty;
  final double subtotal;
  final double cartDiscount;
  final double totalAmount;
  final VoidCallback onClearCart;
  final VoidCallback onShowDiscountDialog;
  final VoidCallback onCharge;

  /// Per-item callbacks (identified by list index).
  final VoidCallback Function(int index) onRemoveItemAt;
  final ValueChanged<int> Function(int index) onQtyChangedAt;

  const CartPanel({
    super.key,
    required this.cartItems,
    required this.itemCount,
    required this.cartIsEmpty,
    required this.subtotal,
    required this.cartDiscount,
    required this.totalAmount,
    required this.onClearCart,
    required this.onShowDiscountDialog,
    required this.onCharge,
    required this.onRemoveItemAt,
    required this.onQtyChangedAt,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Cart header
        Container(
          height: 56,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: const Color(0xFF161B22),
            border: Border(
                bottom: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
          ),
          child: Row(
            children: [
              const Icon(Icons.shopping_cart_rounded,
                  color: Color(0xFFE8B84B), size: 18),
              const SizedBox(width: 8),
              const Text('Cart',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600)),
              if (itemCount > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
                  decoration: BoxDecoration(
                      color: const Color(0xFFE8B84B),
                      borderRadius: BorderRadius.circular(10)),
                  child: Text('$itemCount',
                      style: const TextStyle(
                          color: Colors.black,
                          fontSize: 11,
                          fontWeight: FontWeight.w800)),
                ),
              ],
              const Spacer(),
              if (!cartIsEmpty)
                TextButton(
                  onPressed: onClearCart,
                  child: Text('Clear',
                      style: TextStyle(
                          color: Colors.red.withValues(alpha: 0.8), fontSize: 12)),
                ),
            ],
          ),
        ),

        // Cart items
        Expanded(
          child: cartIsEmpty
              ? _emptyCartPlaceholder()
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: cartItems.length,
                  itemBuilder: (ctx, i) => CartLine(
                    cartItem: cartItems[i],
                    onRemove: () => onRemoveItemAt(i),
                    onQtyChanged: (q) => onQtyChangedAt(i)(q),
                  ),
                ),
        ),

        // Totals + Charge button
        OrderSummary(
          subtotal: subtotal,
          cartDiscount: cartDiscount,
          totalAmount: totalAmount,
          cartIsEmpty: cartIsEmpty,
          onShowDiscountDialog: onShowDiscountDialog,
          onCharge: onCharge,
        ),
      ],
    );
  }

  Widget _emptyCartPlaceholder() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.shopping_cart_outlined,
              color: Colors.white.withValues(alpha: 0.1), size: 56),
          const SizedBox(height: 8),
          Text('Cart is empty',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.25), fontSize: 14)),
          const SizedBox(height: 4),
          Text('Tap a product or scan a barcode',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.15), fontSize: 12)),
        ],
      ),
    );
  }
}

/// Order summary section with subtotal, discount, total, and action buttons.
class OrderSummary extends StatelessWidget {
  final double subtotal;
  final double cartDiscount;
  final double totalAmount;
  final bool cartIsEmpty;
  final VoidCallback onShowDiscountDialog;
  final VoidCallback onCharge;

  const OrderSummary({
    super.key,
    required this.subtotal,
    required this.cartDiscount,
    required this.totalAmount,
    required this.cartIsEmpty,
    required this.onShowDiscountDialog,
    required this.onCharge,
  });

  @override
  Widget build(BuildContext context) {
    const tStyle = TextStyle(color: Colors.white70, fontSize: 13);
    const vStyle = TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
      ),
      child: Column(
        children: [
          // Subtotal
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Subtotal', style: tStyle),
            Text('৳ ${subtotal.toStringAsFixed(2)}', style: vStyle),
          ]),
          if (cartDiscount > 0) ...[
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Discount', style: tStyle),
              Text('- ৳ ${cartDiscount.toStringAsFixed(2)}',
                  style: const TextStyle(
                      color: Color(0xFF2ECC71), fontSize: 13, fontWeight: FontWeight.w600)),
            ]),
          ],
          const Divider(color: Color(0xFF30363D), height: 16),

          // Total
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('TOTAL',
                style: TextStyle(
                    color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
            Text('৳ ${totalAmount.toStringAsFixed(2)}',
                style: const TextStyle(
                    color: Color(0xFFE8B84B),
                    fontSize: 20,
                    fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 14),

          // Discount + Charge buttons
          Row(
            children: [
              // Quick discount button
              OutlinedButton(
                onPressed: cartIsEmpty ? null : onShowDiscountDialog,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF30363D)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Icon(Icons.local_offer_outlined,
                    color: Color(0xFFE8B84B), size: 18),
              ),
              const SizedBox(width: 10),

              // Charge button
              Expanded(
                child: ElevatedButton(
                  onPressed: cartIsEmpty ? null : onCharge,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE8B84B),
                    disabledBackgroundColor: const Color(0xFF30363D),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.payment_rounded, color: Colors.black, size: 18),
                      SizedBox(width: 6),
                      Text('CHARGE',
                          style: TextStyle(
                              color: Colors.black,
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// One item row in the cart panel.
class CartLine extends StatelessWidget {
  final CartItem cartItem;
  final VoidCallback onRemove;
  final ValueChanged<int> onQtyChanged;

  const CartLine({
    super.key,
    required this.cartItem,
    required this.onRemove,
    required this.onQtyChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(cartItem.item.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: Colors.red.withValues(alpha: 0.8),
        child: const Icon(Icons.delete_outline_rounded,
            color: Colors.white, size: 22),
      ),
      onDismissed: (_) => onRemove(),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1C2128),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            // Item info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(cartItem.item.name,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w500),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text('৳${cartItem.item.price.toStringAsFixed(2)} each',
                      style: const TextStyle(
                          color: Colors.white38, fontSize: 11)),
                ],
              ),
            ),

            // Qty control
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _qtyBtn(Icons.remove_rounded,
                    () => onQtyChanged(cartItem.qty - 1)),
                const SizedBox(width: 10),
                Text('${cartItem.qty}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600)),
                const SizedBox(width: 10),
                _qtyBtn(Icons.add_rounded,
                    () => onQtyChanged(cartItem.qty + 1)),
              ],
            ),
            const SizedBox(width: 10),

            // Line total
            Flexible(
              child: Text('৳${cartItem.lineTotal.toStringAsFixed(0)}',
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                      color: Color(0xFFE8B84B),
                      fontSize: 14,
                      fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, color: Colors.white70, size: 14),
      ),
    );
  }
}