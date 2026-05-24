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
  final double totalAmount;
  final VoidCallback onClearCart;
  final VoidCallback onContinue;
  final VoidCallback Function(int index) onRemoveItemAt;
  final Function(int) Function(int index) onQtyChangedAt;
  final int? pendingSyncCount;
  final PaymentMethod? selectedPaymentMethod;

  const CartPanel({
    super.key,
    required this.cartItems,
    required this.itemCount,
    required this.cartIsEmpty,
    required this.subtotal,
    required this.totalAmount,
    required this.onClearCart,
    required this.onContinue,
    required this.onRemoveItemAt,
    required this.onQtyChangedAt,
    this.pendingSyncCount,
    this.selectedPaymentMethod,
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
          _buildFooter(),
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
          const Icon(Icons.shopping_cart_outlined, 
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
              icon: const Icon(Icons.delete_outline, 
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
          const Icon(Icons.sync_outlined, 
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
        selectedPaymentMethod: selectedPaymentMethod,
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: AppColors.surfaceDefault,
        border: Border(
          top: BorderSide(color: AppColors.borderDefault),
        ),
      ),
      child: Column(
        children: [
          // Subtotal
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Subtotal', style: AppTextStyles.bodyMd),
              Text(
                '৳${subtotal.toStringAsFixed(2)}',
                style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          
          const Divider(height: 24),
          
          // Total (calculated based on payment method)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('TOTAL', style: AppTextStyles.headingMd),
              Text(
                '৳${totalAmount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.successDark,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Continue button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: cartIsEmpty ? null : onContinue,
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
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.payment_rounded, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Continue',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CartItemTile extends StatelessWidget {
  final CartItem cartItem;
  final VoidCallback onRemove;
  final Function(int) onQtyChanged;
  final PaymentMethod? selectedPaymentMethod;

  const _CartItemTile({
    required this.cartItem,
    required this.onRemove,
    required this.onQtyChanged,
    this.selectedPaymentMethod,
  });

  @override
  Widget build(BuildContext context) {
    final item = cartItem.item;
    final isCredit = selectedPaymentMethod?.name.toLowerCase().contains('credit') ?? false;
    final unitPrice = isCredit ? item.mrp : item.price;
    final lineTotal = unitPrice * cartItem.qty;

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
                  '৳${unitPrice.toStringAsFixed(0)} each',
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
