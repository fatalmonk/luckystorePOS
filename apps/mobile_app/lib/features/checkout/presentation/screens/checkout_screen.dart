import 'package:flutter/material.dart';
import '../../../../shared/providers/pos_provider.dart';
import 'package:provider/provider.dart';
import '../widgets/address_selector.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_button_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  int _selectedPayment = 0; // 0=COD, 1=bKash, 2=Card
  String _deliveryType = 'standard'; // 'standard' | 'scheduled'
  AddressResult? _deliveryAddress;

  static const List<_PaymentOption> _paymentOptions = [
    _PaymentOption(label: 'Cash on Delivery', icon: Icons.money, color: Color(0xFF4EEB9E)),
    _PaymentOption(label: 'bKash', icon: Icons.account_balance_wallet, color: Color(0xFFE2136E)),
    _PaymentOption(label: 'Card / Nagad / Rocket', icon: Icons.credit_card, color: Color(0xFF3A86FF)),
  ];

  @override
  Widget build(BuildContext context) {
    final posProvider = Provider.of<PosProvider>(context);
    final cart = posProvider.cart;
    final itemCount = posProvider.itemCount;
    final totalAmount = posProvider.totalAmount;

    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(title: const Text('Checkout')),
      body: SingleChildScrollView(
        padding: AppSpacing.insetMd,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Delivery Address Card
            _SectionLabel(label: 'Delivery Address'),
            Container(
              padding: AppSpacing.insetMd,
              decoration: BoxDecoration(
                color: AppColors.surfaceDefault,
                borderRadius: AppRadius.borderMd,
                boxShadow: AppShadows.elevation1,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: Row(
                children: [
                  const Icon(Icons.location_on, color: AppColors.primaryDefault),
                  const SizedBox(width: AppSpacing.space3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _deliveryAddress?.address ?? 'Tap to select address',
                          style: AppTextStyles.labelMd.copyWith(
                            color: _deliveryAddress != null ? AppColors.textPrimary : AppColors.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (_deliveryAddress != null)
                          Text(
                            '${_deliveryAddress!.city}, ${_deliveryAddress!.country}',
                            style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                          ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: _openAddressSelector,
                    child: Text(
                      _deliveryAddress != null ? 'Change' : 'Select',
                      style: const TextStyle(color: AppColors.secondaryDefault),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.space6),

            // Delivery Type
            _SectionLabel(label: 'Delivery Type'),
            Row(
              children: [
                Expanded(
                  child: _DeliveryTypeCard(
                    label: 'Standard',
                    subtitle: '30–60 min',
                    icon: Icons.flash_on,
                    isSelected: _deliveryType == 'standard',
                    onTap: () => setState(() => _deliveryType = 'standard'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DeliveryTypeCard(
                    label: 'Scheduled',
                    subtitle: 'Pick a time slot',
                    icon: Icons.schedule,
                    isSelected: _deliveryType == 'scheduled',
                    onTap: () => setState(() => _deliveryType = 'scheduled'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space6),

            // Collapsible Order Summary
            _SectionLabel(label: 'Order Summary ($itemCount items)'),
            ...cart.map((cartItem) => Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.space1),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      '${cartItem.item.name} × ${cartItem.qty}',
                      style: AppTextStyles.bodySm.copyWith(color: AppColors.textPrimary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    '৳${cartItem.lineTotal.toStringAsFixed(0)}',
                    style: AppTextStyles.labelMd.copyWith(color: AppColors.textPrimary),
                  ),
                ],
              ),
            )),
            Divider(color: AppColors.borderDefault, height: AppSpacing.space6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Delivery Fee', style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
                Text(
                  totalAmount >= 500 ? 'Free 🚚' : '৳40',
                  style: AppTextStyles.labelMd.copyWith(
                    color: totalAmount >= 500 ? AppColors.successDefault : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space2),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total', style: AppTextStyles.headingLg.copyWith(color: AppColors.textPrimary)),
                Text(
                  '৳${(totalAmount + (totalAmount >= 500 ? 0 : 40)).toStringAsFixed(0)}',
                  style: AppTextStyles.headingXl.copyWith(color: AppColors.primaryDefault),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space6),

            // Payment Selection (first-class for COD)
            _SectionLabel(label: 'Payment Method'),
            ...List.generate(_paymentOptions.length, (i) {
              final opt = _paymentOptions[i];
              return GestureDetector(
                onTap: () => setState(() => _selectedPayment = i),
                child: Container(
                  margin: const EdgeInsets.only(bottom: AppSpacing.space3),
                  padding: AppSpacing.insetSquishMd,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDefault,
                    borderRadius: AppRadius.borderMd,
                    boxShadow: AppShadows.elevation1,
                    border: Border.all(
                      color: _selectedPayment == i ? opt.color : AppColors.borderDefault,
                      width: _selectedPayment == i ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(opt.icon, color: opt.color),
                      const SizedBox(width: AppSpacing.space4),
                      Expanded(
                        child: Text(opt.label, style: AppTextStyles.labelMd.copyWith(color: AppColors.textPrimary)),
                      ),
                      if (_selectedPayment == i)
                        Icon(Icons.check_circle, color: opt.color),
                    ],
                  ),
                ),
              );
            }),

            const SizedBox(height: 12),
          ],
        ),
      ),
      bottomSheet: Container(
        padding: AppSpacing.insetMd.copyWith(bottom: AppSpacing.space8),
        decoration: BoxDecoration(
          color: AppColors.surfaceRaised,
          boxShadow: AppShadows.elevation2,
        ),
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              if (_deliveryAddress == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please select a delivery address')),
                );
                return;
              }
              if (_selectedPayment == 0) {
                Navigator.of(context).pushNamed('/order-confirmed');
              } else if (_selectedPayment == 1) {
                Navigator.of(context).pushNamed('/bkash-checkout');
              } else {
                Navigator.of(context).pushNamed('/ssl-checkout');
              }
            },
            style: AppButtonStyles.primary,
            child: Text(
              'Place Order',
              style: AppTextStyles.labelLg.copyWith(color: AppColors.primaryOn, fontSize: 18),
            ),
          ),
        ),
      ),
    );
  }

  void _openAddressSelector() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AddressSelector(
          initialAddress: _deliveryAddress?.formattedAddress,
          onAddressSelected: (address) {
            setState(() => _deliveryAddress = address);
          },
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.space3),
      child: Text(
        label,
        style: AppTextStyles.labelSm.copyWith(
          color: AppColors.textSecondary,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _DeliveryTypeCard extends StatelessWidget {
  final String label;
  final String subtitle;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _DeliveryTypeCard({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: AppSpacing.insetMd,
        decoration: BoxDecoration(
          color: AppColors.surfaceDefault,
          borderRadius: AppRadius.borderMd,
          boxShadow: AppShadows.elevation1,
          border: Border.all(
            color: isSelected ? AppColors.primaryDefault : AppColors.borderDefault,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? AppColors.primaryDefault : AppColors.textSecondary, size: 28),
            const SizedBox(height: AppSpacing.space2),
            Text(label, style: AppTextStyles.labelMd.copyWith(color: isSelected ? AppColors.textPrimary : AppColors.textSecondary)),
            Text(subtitle, style: AppTextStyles.bodyXs.copyWith(color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _PaymentOption {
  final String label;
  final IconData icon;
  final Color color;
  const _PaymentOption({required this.label, required this.icon, required this.color});
}