import 'package:flutter/material.dart';
import '../../../../theme/app_theme.dart';
import '../../../../shared/providers/pos_provider.dart';
import 'package:provider/provider.dart';
import '../widgets/address_selector.dart';

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
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Checkout')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Delivery Address Card
            _SectionLabel(label: 'Delivery Address'),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.neomorphicDecoration,
              child: Row(
                children: [
                  const Icon(Icons.location_on, color: AppTheme.primaryAccent),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _deliveryAddress?.address ?? 'Tap to select address',
                          style: TextStyle(
                            color: _deliveryAddress != null ? AppTheme.textPrimary : AppTheme.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (_deliveryAddress != null)
                          Text(
                            '${_deliveryAddress!.city}, ${_deliveryAddress!.country}',
                            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                          ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: _openAddressSelector,
                    child: Text(
                      _deliveryAddress != null ? 'Change' : 'Select',
                      style: const TextStyle(color: AppTheme.secondaryAccent),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

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
            const SizedBox(height: 24),

            // Collapsible Order Summary
            _SectionLabel(label: 'Order Summary ($itemCount items)'),
            ...cart.map((cartItem) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      '${cartItem.item.name} × ${cartItem.qty}',
                      style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    '৳${cartItem.lineTotal.toStringAsFixed(0)}',
                    style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            )),
            const Divider(color: AppTheme.shadowLight, height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Delivery Fee', style: TextStyle(color: AppTheme.textSecondary)),
                Text(
                  totalAmount >= 500 ? 'Free 🚚' : '৳40',
                  style: TextStyle(
                    color: totalAmount >= 500 ? const Color(0xFF4EEB9E) : AppTheme.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
                Text(
                  '৳${(totalAmount + (totalAmount >= 500 ? 0 : 40)).toStringAsFixed(0)}',
                  style: const TextStyle(color: AppTheme.primaryAccent, fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Payment Selection (first-class for COD)
            _SectionLabel(label: 'Payment Method'),
            ...List.generate(_paymentOptions.length, (i) {
              final opt = _paymentOptions[i];
              return GestureDetector(
                onTap: () => setState(() => _selectedPayment = i),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: AppTheme.neomorphicDecoration.copyWith(
                    border: _selectedPayment == i
                        ? Border.all(color: opt.color, width: 2)
                        : null,
                  ),
                  child: Row(
                    children: [
                      Icon(opt.icon, color: opt.color),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(opt.label, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
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
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        decoration: BoxDecoration(
          color: AppTheme.backgroundElevated,
          boxShadow: [BoxShadow(color: AppTheme.shadowDark, blurRadius: 10, offset: const Offset(0, -5))],
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
                // COD: go straight to confirmation — bypass payment screens
                Navigator.of(context).pushNamed('/order-confirmed');
              } else if (_selectedPayment == 1) {
                // bKash tokenized flow
                Navigator.of(context).pushNamed('/bkash-checkout');
              } else {
                // SSLCommerz card/wallet flow
                Navigator.of(context).pushNamed('/ssl-checkout');
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryAccent,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text(
              'Place Order',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
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
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        label,
        style: const TextStyle(
          color: AppTheme.textSecondary,
          fontSize: 13,
          fontWeight: FontWeight.w600,
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
        padding: const EdgeInsets.all(14),
        decoration: AppTheme.neomorphicDecoration.copyWith(
          border: isSelected ? Border.all(color: AppTheme.primaryAccent, width: 2) : null,
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? AppTheme.primaryAccent : AppTheme.textSecondary, size: 28),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: isSelected ? AppTheme.textPrimary : AppTheme.textSecondary, fontWeight: FontWeight.bold)),
            Text(subtitle, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
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