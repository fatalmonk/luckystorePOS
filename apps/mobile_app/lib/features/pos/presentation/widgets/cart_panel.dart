import 'package:flutter/material.dart';
import '../../../../models/pos_models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_button_styles.dart';

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
    return Container(
      color: AppColors.surfaceDefault,
      child: Column(
        children: [
          // Cart header
          Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: const BoxDecoration(
              color: AppColors.surfaceDefault,
              border: Border(bottom: BorderSide(color: AppColors.borderDefault)),
            ),
            child: Row(
              children: [
                const Icon(Icons.shopping_cart_rounded, color: AppColors.primaryDefault, size: 20),
                const SizedBox(width: 10),
                Text('Current Order', style: AppTextStyles.headingMd),
                if (itemCount > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primarySubtle,
                      borderRadius: AppRadius.borderFull,
                    ),
                    child: Text(
                      '$itemCount items',
                      style: AppTextStyles.labelXs.copyWith(
                        color: AppColors.primaryDefault,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
                const Spacer(),
                if (!cartIsEmpty)
                  TextButton.icon(
                    onPressed: onClearCart,
                    icon: const Icon(Icons.delete_sweep_rounded, size: 16),
                    label: const Text('Clear'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.dangerDefault,
                      textStyle: AppTextStyles.labelSm.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
          ),

          // Cart items
          Expanded(
            child: cartIsEmpty
                ? _emptyCartPlaceholder()
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: cartItems.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
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
      ),
    );
  }

  Widget _emptyCartPlaceholder() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.shopping_basket_outlined,
              color: AppColors.textMuted.withValues(alpha: 0.1), size: 80),
          const SizedBox(height: 16),
          Text(
            'Order is empty',
            style: AppTextStyles.headingMd.copyWith(color: AppColors.textMuted),
          ),
          const SizedBox(height: 8),
          Text(
            'Add products to begin checkout',
            style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}

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
    return Container(
      padding: AppSpacing.insetLg,
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        boxShadow: AppShadows.elevation3,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.space6)),
      ),
      child: Column(
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Subtotal', style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary)),
            Text('৳ ${subtotal.toStringAsFixed(2)}', style: AppTextStyles.labelMd),
          ]),
          if (cartDiscount > 0) ...[
            const SizedBox(height: AppSpacing.space2),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('Discount', style: AppTextStyles.bodyMd.copyWith(color: AppColors.successDefault)),
              Text('- ৳ ${cartDiscount.toStringAsFixed(2)}',
                  style: AppTextStyles.labelMd.copyWith(color: AppColors.successDefault, fontWeight: FontWeight.bold)),
            ]),
          ],
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.space4),
            child: Divider(color: AppColors.borderDefault, height: 1),
          ),

          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Total Amount', style: AppTextStyles.headingMd),
            Text('৳ ${totalAmount.toStringAsFixed(0)}',
                style: AppTextStyles.headingXl.copyWith(color: AppColors.primaryDefault)),
          ]),
          const SizedBox(height: AppSpacing.space6),

          Row(
            children: [
              // Discount button
              GestureDetector(
                onTap: cartIsEmpty ? null : onShowDiscountDialog,
                child: Container(
                  padding: AppSpacing.insetSquishMd,
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSubtle,
                    borderRadius: AppRadius.borderMd,
                    border: Border.all(color: AppColors.borderDefault),
                  ),
                  child: const Icon(Icons.local_offer_outlined, color: AppColors.primaryDefault, size: AppSpacing.space6),
                ),
              ),
              const SizedBox(width: AppSpacing.space3),

              // Charge button
              Expanded(
                child: ElevatedButton(
                  onPressed: cartIsEmpty ? null : onCharge,
                  style: AppButtonStyles.primary.copyWith(
                    elevation: WidgetStateProperty.all(4),
                    shadowColor: WidgetStateProperty.all(AppColors.primaryDefault.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.bolt_rounded, color: AppColors.primaryOn, size: AppSpacing.space5),
                      const SizedBox(width: AppSpacing.space2),
                      Text(
                        'PLACE ORDER',
                        style: AppTextStyles.labelLg.copyWith(
                          color: AppColors.primaryOn,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.0,
                        ),
                      ),
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
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppColors.dangerDefault,
          borderRadius: AppRadius.borderMd,
        ),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white, size: 28),
      ),
      onDismissed: (_) => onRemove(),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surfaceDefault,
          borderRadius: AppRadius.borderMd,
          border: Border.all(color: AppColors.borderDefault),
          boxShadow: AppShadows.elevation1,
        ),
        child: Row(
          children: [
            // Product info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    cartItem.item.name,
                    style: AppTextStyles.labelMd,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '৳${cartItem.item.price.toStringAsFixed(0)} / unit',
                    style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),

            // Qty control
            Container(
              decoration: BoxDecoration(
                color: AppColors.backgroundSubtle,
                borderRadius: AppRadius.borderSm,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _qtyBtn(Icons.remove_rounded, () => onQtyChanged(cartItem.qty - 1)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      '${cartItem.qty}',
                      style: AppTextStyles.labelMd.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                  _qtyBtn(Icons.add_rounded, () => onQtyChanged(cartItem.qty + 1), color: AppColors.primaryDefault),
                ],
              ),
            ),
            const SizedBox(width: 16),

            // Line total
            SizedBox(
              width: 70,
              child: Text(
                '৳${cartItem.lineTotal.toStringAsFixed(0)}',
                textAlign: TextAlign.right,
                style: AppTextStyles.labelMd.copyWith(
                  color: AppColors.primaryDefault,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap, {Color? color}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        alignment: Alignment.center,
        child: Icon(icon, color: color ?? AppColors.textPrimary, size: 18),
      ),
    );
  }
}