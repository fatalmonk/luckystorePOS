import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../models/pos_models.dart';

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
  final VoidCallback Function(int index) onRemoveItemAt;
  final Function(int) Function(int index) onQtyChangedAt;
  final int? pendingSyncCount;

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
    this.pendingSyncCount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surfaceDefault,
      child: Column(
        children: [
          _buildHeader(),
          if (pendingSyncCount != null && pendingSyncCount! > 0)
            _buildSyncBadge(),
          Expanded(
            child: cartIsEmpty
                ? _buildEmptyState()
                : _buildCartList(),
          ),
          _buildTotalsSection(),
          _buildCheckoutButton(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: AppColors.surfaceDefault,
        border: Border(bottom: BorderSide(color: AppColors.borderDefault)),
      ),
      child: Row(
        children: [
          Icon(Icons.shopping_cart_outlined, 
            color: AppColors.primaryDefault, 
            size: 20),
          const SizedBox(width: 8),
          Text(
            'Cart',
            style: AppTextStyles.labelLg.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          if (!cartIsEmpty) ...[
            Text(
              '$itemCount items',
              style: AppTextStyles.bodySm.copyWith(
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: Icon(Icons.delete_outline, 
                color: AppColors.dangerDefault, 
                size: 20),
              onPressed: onClearCart,
              tooltip: 'Clear cart',
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSyncBadge() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: AppColors.warningSubtle,
      child: Row(
        children: [
          Icon(Icons.sync_outlined, 
            color: AppColors.warningDefault, 
            size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '$pendingSyncCount sale${pendingSyncCount == 1 ? '' : 's'} pending sync',
              style: AppTextStyles.bodySm.copyWith(
                color: AppColors.warningDefault,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.shopping_bag_outlined,
            size: 48,
            color: AppColors.textMuted.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'Cart is empty',
            style: AppTextStyles.bodyMd.copyWith(
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Scan or tap products to add',
            style: AppTextStyles.bodySm.copyWith(
              color: AppColors.textMuted.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartList() {
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: cartItems.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) => _CartItemTile(
        cartItem: cartItems[index],
        onRemove: onRemoveItemAt(index),
        onQtyChanged: onQtyChangedAt(index),
      ),
    );
  }

  Widget _buildTotalsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        border: Border(
          top: BorderSide(color: AppColors.borderDefault),
        ),
        boxShadow: AppShadows.elevation1,
      ),
      child: Column(
        children: [
          _buildTotalRow('Subtotal', subtotal, isBold: false),
          if (cartDiscount > 0) ...[
            const SizedBox(height: 8),
            _buildTotalRow('Discount', -cartDiscount, 
              isBold: false, 
              isDiscount: true,
              onTap: onShowDiscountDialog),
          ],
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(height: 1),
          ),
          _buildTotalRow('Total', totalAmount, isBold: true),
        ],
      ),
    );
  }

  Widget _buildTotalRow(String label, double amount, {
    required bool isBold,
    bool isDiscount = false,
    VoidCallback? onTap,
  }) {
    final textStyle = isBold
        ? AppTextStyles.headingMd  // FIX: headingSm undefined, use headingMd
        : AppTextStyles.bodyMd;
    
    final amountText = isDiscount
        ? '-৳${amount.abs().toStringAsFixed(0)}'
        : '৳${amount.toStringAsFixed(0)}';

    Widget content = Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: textStyle.copyWith(
            color: isDiscount ? AppColors.successDefault : AppColors.textPrimary,
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        Text(
          amountText,
          style: textStyle.copyWith(
            color: isDiscount ? AppColors.successDefault : AppColors.textPrimary,
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ],
    );

    if (onTap != null) {
      content = InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderSm,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: content,
        ),
      );
    }

    return content;
  }

  Widget _buildCheckoutButton() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        border: Border(
          top: BorderSide(color: AppColors.borderDefault),
        ),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton(
          onPressed: cartIsEmpty ? null : onCharge,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryDefault,
            foregroundColor: AppColors.primaryOn,
            disabledBackgroundColor: AppColors.backgroundSubtle,
            disabledForegroundColor: AppColors.textMuted,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: AppRadius.borderLg,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.payment_rounded, size: 20),
              const SizedBox(width: 8),
              Text(
                'Charge ৳${totalAmount.toStringAsFixed(0)}',
                style: AppTextStyles.labelLg.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CartItemTile extends StatelessWidget {
  final CartItem cartItem;
  final VoidCallback onRemove;
  final Function(int) onQtyChanged;

  const _CartItemTile({
    required this.cartItem,
    required this.onRemove,
    required this.onQtyChanged,
  });

  @override
  Widget build(BuildContext context) {
    final item = cartItem.item;
    final lineTotal = cartItem.lineTotal;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundDefault,
        borderRadius: AppRadius.borderMd,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: AppTextStyles.labelMd.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  '৳${item.price.toStringAsFixed(0)} each',
                  style: AppTextStyles.bodySm.copyWith(
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _buildQtyControl(),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '৳${lineTotal.toStringAsFixed(0)}',
                style: AppTextStyles.labelMd.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              InkWell(
                onTap: onRemove,
                borderRadius: AppRadius.borderSm,
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Icon(
                    Icons.close_rounded,
                    size: 16,
                    color: AppColors.dangerDefault,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQtyControl() {
    return Container(
      height: 36,
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        borderRadius: AppRadius.borderMd,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _qtyButton(
            icon: Icons.remove_rounded,
            onTap: () => onQtyChanged(cartItem.qty - 1),
          ),
          Container(
            width: 40,
            alignment: Alignment.center,
            child: Text(
              '${cartItem.qty}',
              style: AppTextStyles.labelMd.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          _qtyButton(
            icon: Icons.add_rounded,
            onTap: () => onQtyChanged(cartItem.qty + 1),
          ),
        ],
      ),
    );
  }

  Widget _qtyButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderSm,
        child: Container(
          width: 32,
          height: 36,
          alignment: Alignment.center,
          child: Icon(
            icon,
            size: 16,
            color: AppColors.primaryDefault,
          ),
        ),
      ),
    );
  }
}
