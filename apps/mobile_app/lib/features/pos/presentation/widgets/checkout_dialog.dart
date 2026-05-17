import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../models/pos_models.dart';

class CheckoutDialog extends StatefulWidget {
  final double totalAmount;
  final List<PaymentMethod> paymentMethods;
  final Function(List<PaymentTender>) onConfirm;
  final VoidCallback onCancel;

  const CheckoutDialog({
    super.key,
    required this.totalAmount,
    required this.paymentMethods,
    required this.onConfirm,
    required this.onCancel,
  });

  @override
  State<CheckoutDialog> createState() => _CheckoutDialogState();
}

class _CheckoutDialogState extends State<CheckoutDialog> {
  final _cashController = TextEditingController();
  PaymentMethod? _selectedMethod;
  double _tenderedAmount = 0;

  @override
  void initState() {
    super.initState();
    if (widget.paymentMethods.isNotEmpty) {
      _selectedMethod = widget.paymentMethods.first;
    }
    _cashController.addListener(_onCashChanged);
  }

  void _onCashChanged() {
    final text = _cashController.text.replaceAll(RegExp(r'[^0-9.]'), '');
    setState(() {
      _tenderedAmount = double.tryParse(text) ?? 0;
    });
  }

  double get _changeAmount => _tenderedAmount - widget.totalAmount;
  bool get _canConfirm =>
    _selectedMethod != null &&
    (_selectedMethod!.id != 'cash' || _tenderedAmount >= widget.totalAmount);  // FIX: code -> id

  @override
  void dispose() {
    _cashController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isCash = _selectedMethod?.id == 'cash';  // FIX: code -> id

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
      child: Container(
        width: 400,
        constraints: const BoxConstraints(maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildHeader(),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildTotalSection(),
                    const SizedBox(height: 24),
                    _buildPaymentMethodSection(),
                    if (isCash) ...[
                      const SizedBox(height: 24),
                      _buildCashInputSection(),
                    ],
                  ],
                ),
              ),
            ),
            _buildActions(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        border: Border(bottom: BorderSide(color: AppColors.borderDefault)),
        borderRadius: BorderRadius.vertical(top: AppRadius.borderLg.topLeft),
      ),
      child: Row(
        children: [
          Icon(Icons.payment_rounded, color: AppColors.primaryDefault),
          const SizedBox(width: 12),
          Text(
            'Checkout',
            style: AppTextStyles.headingMd,  // FIX: headingSm -> headingMd
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: widget.onCancel,
          ),
        ],
      ),
    );
  }

  Widget _buildTotalSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.primarySubtle,
        borderRadius: AppRadius.borderLg,
      ),
      child: Column(
        children: [
          Text(
            'Total Amount',
            style: AppTextStyles.bodyMd.copyWith(
              color: AppColors.primaryDefault,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '৳${widget.totalAmount.toStringAsFixed(0)}',
            style: AppTextStyles.headingLg.copyWith(
              color: AppColors.primaryDefault,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Payment Method',
          style: AppTextStyles.labelMd.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: widget.paymentMethods.map((method) {
            final isSelected = _selectedMethod?.id == method.id;
            return _PaymentMethodChip(
              method: method,
              isSelected: isSelected,
              onTap: () => setState(() => _selectedMethod = method),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildCashInputSection() {
    final change = _changeAmount;
    final showChange = _tenderedAmount > 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Cash Tendered',
          style: AppTextStyles.labelMd.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _cashController,
          keyboardType: TextInputType.number,
          style: AppTextStyles.headingMd,
          decoration: InputDecoration(
            prefixText: '৳ ',
            prefixStyle: AppTextStyles.headingMd.copyWith(
              color: AppColors.textMuted,
            ),
            hintText: '0',
            border: OutlineInputBorder(
              borderRadius: AppRadius.borderMd,
              borderSide: BorderSide(color: AppColors.borderDefault),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: AppRadius.borderMd,
              borderSide: BorderSide(color: AppColors.borderDefault),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppRadius.borderMd,
              borderSide: BorderSide(color: AppColors.primaryDefault, width: 2),
            ),
          ),
        ),
        if (showChange) ...[
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: change >= 0 
                  ? AppColors.successSubtle 
                  : AppColors.dangerSubtle,
              borderRadius: AppRadius.borderMd,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  change >= 0 ? 'Change' : 'Remaining',
                  style: AppTextStyles.labelMd.copyWith(
                    color: change >= 0 
                        ? AppColors.successDefault 
                        : AppColors.dangerDefault,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '৳${change.abs().toStringAsFixed(0)}',
                  style: AppTextStyles.headingMd.copyWith(  // FIX: headingSm -> headingMd
                    color: change >= 0
                        ? AppColors.successDefault
                        : AppColors.dangerDefault,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: [50, 100, 500, 1000].map((amount) {
            return _QuickCashButton(
              amount: amount,
              onTap: () {
                final current = double.tryParse(_cashController.text) ?? 0;
                _cashController.text = (current + amount).toStringAsFixed(0);
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildActions() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        border: Border(top: BorderSide(color: AppColors.borderDefault)),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: widget.onCancel,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textPrimary,
                side: BorderSide(color: AppColors.borderDefault),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: AppRadius.borderLg,
                ),
              ),
              child: Text(
                'Cancel',
                style: AppTextStyles.labelLg,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _canConfirm ? _onConfirm : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.successDefault,
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppColors.backgroundSubtle,
                disabledForegroundColor: AppColors.textMuted,
                padding: const EdgeInsets.symmetric(vertical: 16),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: AppRadius.borderLg,
                ),
              ),
              child: Text(
                'Confirm Payment',
                style: AppTextStyles.labelLg.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _onConfirm() {
    if (_selectedMethod == null) return;
    
    final tender = PaymentTender(
      method: _selectedMethod!,
      amount: widget.totalAmount,
      reference: _selectedMethod!.id == 'cash'  // FIX: code -> id
          ? 'Cash: ৳${_tenderedAmount.toStringAsFixed(0)}'
          : null,
    );
    
    widget.onConfirm([tender]);
  }
}

class _PaymentMethodChip extends StatelessWidget {
  final PaymentMethod method;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentMethodChip({
    required this.method,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderMd,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected 
                ? AppColors.primarySubtle 
                : AppColors.backgroundSubtle,
            borderRadius: AppRadius.borderMd,
            border: Border.all(
              color: isSelected 
                  ? AppColors.primaryDefault 
                  : AppColors.borderDefault,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _getIconForMethod(method.id),  // FIX: code -> id
                size: 20,
                color: isSelected
                    ? AppColors.primaryDefault
                    : AppColors.textMuted,
              ),
              const SizedBox(width: 8),
              Text(
                method.name,
                style: AppTextStyles.labelMd.copyWith(
                  color: isSelected 
                      ? AppColors.primaryDefault 
                      : AppColors.textPrimary,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getIconForMethod(String code) {
    switch (code.toLowerCase()) {
      case 'cash':
        return Icons.money_rounded;
      case 'card':
      case 'credit_card':
        return Icons.credit_card_rounded;
      case 'bkash':
      case 'nagad':
      case 'rocket':
        return Icons.account_balance_wallet_rounded;
      default:
        return Icons.payment_rounded;
    }
  }
}

class _QuickCashButton extends StatelessWidget {
  final int amount;
  final VoidCallback onTap;

  const _QuickCashButton({
    required this.amount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderMd,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.backgroundSubtle,
            borderRadius: AppRadius.borderMd,
            border: Border.all(color: AppColors.borderDefault),
          ),
          child: Text(
            '+৳$amount',
            style: AppTextStyles.labelMd.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
