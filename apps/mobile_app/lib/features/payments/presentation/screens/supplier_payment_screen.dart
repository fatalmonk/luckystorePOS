import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';

/// Supplier Payment Screen - Quick payment entry for Accounts Payable (AP)
/// Allows payment to suppliers with outstanding balances
/// - Select supplier (show name + balance)
/// - Enter payment amount (max = balance owed)
/// - Payment method: Cash/bKash/Bank Transfer
/// - Reference required for non-cash
/// - Submit → call RPC record_supplier_payment
class SupplierPaymentScreen extends StatefulWidget {
  const SupplierPaymentScreen({super.key});

  @override
  State<SupplierPaymentScreen> createState() => _SupplierPaymentScreenState();
}

class _SupplierPaymentScreenState extends State<SupplierPaymentScreen> {
  final _supabase = Supabase.instance.client;
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();

  bool _isLoading = false;
  bool _isSuppliersLoading = true;
  String? _error;
  String? _successMessage;

  // Suppliers list
  List<Map<String, dynamic>> _suppliers = [];
  Map<String, dynamic>? _selectedSupplier;

  // Payment method
  String _selectedPaymentMethod = 'cash';

  final List<Map<String, String>> _paymentMethods = [
    {'id': 'cash', 'name': 'Cash', 'icon': 'payments'},
    {'id': 'bkash', 'name': 'bKash', 'icon': 'phone_android'},
    {'id': 'bank_transfer', 'name': 'Bank Transfer', 'icon': 'account_balance'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchSuppliers();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    super.dispose();
  }

  Future<void> _fetchSuppliers() async {
    setState(() {
      _isSuppliersLoading = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final storeId = auth.appUser?.storeId;

      if (storeId == null) {
        throw Exception('Store context not found. Please log in again.');
      }

      // Fetch suppliers with outstanding balances (payables)
      final response = await _supabase
          .from('parties')
          .select('''
            id,
            name,
            phone,
            email,
            address,
            outstanding_balance
          ''')
          .eq('store_id', storeId)
          .eq('type', 'supplier')
          .gt('outstanding_balance', 0) // Only suppliers with balance > 0
          .order('name');

      setState(() {
        _suppliers = List<Map<String, dynamic>>.from(response);
        _isSuppliersLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching suppliers: $e');
      setState(() {
        _error = e.toString();
        _isSuppliersLoading = false;
      });
    }
  }

  Future<void> _submitPayment() async {
    // Validation
    if (_selectedSupplier == null) {
      setState(() => _error = 'Please select a supplier');
      return;
    }

    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) {
      setState(() => _error = 'Please enter a valid payment amount');
      return;
    }

    final outstandingBalance = double.tryParse(
          _selectedSupplier!['outstanding_balance']?.toString() ?? '0',
        ) ??
        0;

    if (amount > outstandingBalance) {
      setState(() => _error = 'Payment amount cannot exceed outstanding balance (৳${outstandingBalance.toStringAsFixed(2)})');
      return;
    }

    // Reference check for non-cash
    final reference = _referenceController.text.trim();
    if (_selectedPaymentMethod != 'cash' && reference.isEmpty) {
      setState(() => _error = 'Reference/transaction ID is required for ${_getPaymentMethodName(_selectedPaymentMethod)}');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _successMessage = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final userId = auth.appUser?.id;
      final storeId = auth.appUser?.storeId;

      if (userId == null || storeId == null) {
        throw Exception('Authentication required');
      }

      // Call RPC to record supplier payment
      await _supabase.rpc('record_supplier_payment', params: {
        'p_supplier_id': _selectedSupplier!['id'],
        'p_amount': amount,
        'p_payment_method': _selectedPaymentMethod,
        'p_reference': reference.isEmpty ? null : reference,
        'p_store_id': storeId,
        'p_user_id': userId,
      });

      // Clear form
      setState(() {
        _isLoading = false;
        _successMessage = 'Payment of ৳${amount.toStringAsFixed(2)} recorded successfully';
        _amountController.clear();
        _referenceController.clear();
        _selectedSupplier = null;
      });

      // Refresh suppliers list
      await _fetchSuppliers();
    } catch (e) {
      debugPrint('Error submitting payment: $e');
      setState(() {
        _isLoading = false;
        _error = 'Failed to record payment: ${e.toString()}';
      });
    }
  }

  String _getPaymentMethodName(String method) {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'bkash':
        return 'bKash';
      case 'bank_transfer':
        return 'Bank Transfer';
      default:
        return method;
    }
  }

  String _formatCurrency(dynamic amount) {
    if (amount == null) return '৳0.00';
    return '৳${NumberFormat('#,##0.00').format(double.tryParse(amount.toString()) ?? 0)}';
  }

  IconData _getPaymentMethodIcon(String method) {
    switch (method) {
      case 'cash':
        return Icons.payments_rounded;
      case 'bkash':
        return Icons.phone_android_rounded;
      case 'bank_transfer':
        return Icons.account_balance_rounded;
      default:
        return Icons.payments_rounded;
    }
  }

  void _showSupplierSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceDefault,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceDefault,
                  border: Border(
                    bottom: BorderSide(color: AppColors.borderDefault),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Select Supplier',
                        style: AppTextStyles.headingMd,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _suppliers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.business_outlined,
                              size: 64,
                              color: AppColors.textMuted.withValues(alpha: 0.5),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No suppliers with outstanding balance',
                              style: AppTextStyles.bodyMd.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: scrollController,
                        padding: AppSpacing.insetMd,
                        itemCount: _suppliers.length,
                        itemBuilder: (context, index) {
                          final supplier = _suppliers[index];
                          final outstanding = double.tryParse(
                                supplier['outstanding_balance']?.toString() ??
                                    '0',
                              ) ??
                              0;

                          return InkWell(
                            onTap: () {
                              setState(() => _selectedSupplier = supplier);
                              Navigator.pop(context);
                            },
                            borderRadius: AppRadius.borderLg,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: AppSpacing.insetMd,
                              decoration: BoxDecoration(
                                color: AppColors.backgroundDefault,
                                borderRadius: AppRadius.borderLg,
                                border: Border.all(
                                  color: AppColors.borderDefault,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: AppColors.warningDefault
                                          .withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      Icons.business,
                                      color: AppColors.warningDefault,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          supplier['name'] ?? 'Unknown',
                                          style: AppTextStyles.labelLg,
                                        ),
                                        if (supplier['phone'] != null &&
                                            supplier['phone'].isNotEmpty)
                                          Text(
                                            supplier['phone'],
                                            style: AppTextStyles.bodySm
                                                .copyWith(
                                                  color:
                                                      AppColors.textSecondary,
                                                ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        _formatCurrency(outstanding),
                                        style: AppTextStyles.labelLg.copyWith(
                                          color: AppColors.dangerDefault,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        'Payable',
                                        style: AppTextStyles.bodyXs.copyWith(
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final outstandingBalance = _selectedSupplier != null
        ? (double.tryParse(
                _selectedSupplier!['outstanding_balance']?.toString() ?? '0') ??
            0)
        : 0;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDefault,
        appBar: AppBar(
          backgroundColor: AppColors.surfaceDefault,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Text(
            'Supplier Payment',
            style: AppTextStyles.headingLg,
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: _fetchSuppliers,
              tooltip: 'Refresh suppliers',
            ),
          ],
        ),
        body: _isSuppliersLoading
            ? const Center(
                child: CircularProgressIndicator(
                  color: AppColors.primaryDefault,
                ),
              )
            : _error != null && _suppliers.isEmpty
                ? _buildErrorState()
                : SingleChildScrollView(
                    padding: AppSpacing.insetLg,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Success message
                        if (_successMessage != null) ...[
                          Container(
                            padding: AppSpacing.insetMd,
                            decoration: BoxDecoration(
                              color: AppColors.successDefault.withValues(alpha: 0.1),
                              borderRadius: AppRadius.borderLg,
                              border: Border.all(
                                color: AppColors.successDefault.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.check_circle_rounded,
                                  color: AppColors.successDefault,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    _successMessage!,
                                    style: AppTextStyles.bodyMd.copyWith(
                                      color: AppColors.successDark,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],

                        // Error message
                        if (_error != null) ...[
                          Container(
                            padding: AppSpacing.insetMd,
                            decoration: BoxDecoration(
                              color: AppColors.dangerDefault.withValues(alpha: 0.1),
                              borderRadius: AppRadius.borderLg,
                              border: Border.all(
                                color: AppColors.dangerDefault.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.error_outline_rounded,
                                  color: AppColors.dangerDefault,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    _error!,
                                    style: AppTextStyles.bodySm.copyWith(
                                      color: AppColors.dangerDark,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],

                        // Supplier Selector Card
                        _buildSectionTitle('SELECT SUPPLIER'),
                        const SizedBox(height: 8),
                        InkWell(
                          onTap: _showSupplierSelector,
                          borderRadius: AppRadius.borderLg,
                          child: Container(
                            padding: AppSpacing.insetLg,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceDefault,
                              borderRadius: AppRadius.borderLg,
                              border: Border.all(color: AppColors.borderDefault),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    color: _selectedSupplier != null
                                        ? AppColors.warningDefault.withValues(alpha: 0.1)
                                        : AppColors.primaryDefault.withValues(alpha: 0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    _selectedSupplier != null
                                        ? Icons.business
                                        : Icons.add_business,
                                    color: _selectedSupplier != null
                                        ? AppColors.warningDefault
                                        : AppColors.primaryDefault,
                                    size: 28,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _selectedSupplier != null
                                            ? (_selectedSupplier!['name'] ?? 'Supplier')
                                            : 'Select Supplier',
                                        style: AppTextStyles.headingMd.copyWith(
                                          color: _selectedSupplier != null
                                              ? AppColors.textPrimary
                                              : AppColors.textMuted,
                                        ),
                                      ),
                                        if (_selectedSupplier != null) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            '${_formatCurrency(outstandingBalance)} outstanding',
                                            style: AppTextStyles.bodyMd.copyWith(
                                              color: AppColors.dangerDefault,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ]else ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          'Tap to choose from suppliers with outstanding balance',
                                          style: AppTextStyles.bodySm.copyWith(
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                if (_selectedSupplier != null)
                                  IconButton(
                                    icon: const Icon(Icons.close, color: AppColors.textMuted),
                                    onPressed: () {
                                      setState(() => _selectedSupplier = null);
                                      _amountController.clear();
                                    },
                                  )
                                else
                                  const Icon(
                                    Icons.chevron_right,
                                    color: AppColors.textMuted,
                                  ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Payment Amount
                        if (_selectedSupplier != null) ...[
                          _buildSectionTitle('PAYMENT AMOUNT'),
                          const SizedBox(height: 8),
                          Container(
                            padding: AppSpacing.insetLg,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceDefault,
                              borderRadius: AppRadius.borderLg,
                              border: Border.all(color: AppColors.borderDefault),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                TextFormField(
                                  controller: _amountController,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  inputFormatters: [
                                    FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                                  ],
                                  style: AppTextStyles.headingLg.copyWith(
                                    color: AppColors.successDefault,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  decoration: InputDecoration(
                                    prefixText: '৳ ',
                                    prefixStyle: AppTextStyles.headingLg.copyWith(
                                      color: AppColors.successDefault,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    hintText: '0.00',
                                    hintStyle: AppTextStyles.headingLg.copyWith(
                                      color: AppColors.textMuted,
                                    ),
                                    border: InputBorder.none,
                                    contentPadding: EdgeInsets.zero,
                                  ),
                                  onChanged: (value) {
                                    setState(() {});
                                  },
                                ),
                                const SizedBox(height: 12),
                                // Quick amount buttons
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    _buildQuickAmountButton(
                                      'Full Amount',
                                      outstandingBalance.toDouble(),
                                      isFull: true,
                                    ),
                                    _buildQuickAmountButton(
                                      '50%',
                                      (outstandingBalance * 0.5).toDouble(),
                                    ),
                                    _buildQuickAmountButton(
                                      '25%',
                                      (outstandingBalance * 0.25).toDouble(),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Payment Method
                          _buildSectionTitle('PAYMENT METHOD'),
                          const SizedBox(height: 8),
                          Container(
                            padding: AppSpacing.insetMd,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceDefault,
                              borderRadius: AppRadius.borderLg,
                              border: Border.all(color: AppColors.borderDefault),
                            ),
                            child: Column(
                              children: _paymentMethods.map((method) {
                                final isSelected = _selectedPaymentMethod == method['id'];
                                return InkWell(
                                  onTap: () {
                                    setState(() => _selectedPaymentMethod = method['id']!);
                                    if (method['id'] == 'cash') {
                                      _referenceController.clear();
                                    }
                                  },
                                  borderRadius: AppRadius.borderMd,
                                  child: Container(
                                    padding: AppSpacing.insetMd,
                                    margin: const EdgeInsets.only(bottom: 8),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? AppColors.successDefault.withValues(alpha: 0.1)
                                          : AppColors.backgroundDefault,
                                      borderRadius: AppRadius.borderMd,
                                      border: Border.all(
                                        color: isSelected
                                            ? AppColors.successDefault
                                            : AppColors.borderDefault,
                                        width: isSelected ? 2 : 1,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          _getPaymentMethodIcon(method['id']!),
                                          color: isSelected
                                              ? AppColors.successDefault
                                              : AppColors.textSecondary,
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Text(
                                            method['name']!,
                                            style: AppTextStyles.labelLg.copyWith(
                                              color: isSelected
                                                  ? AppColors.successDefault
                                                  : AppColors.textPrimary,
                                              fontWeight: isSelected
                                                  ? FontWeight.bold
                                                  : FontWeight.normal,
                                            ),
                                          ),
                                        ),
                                        if (isSelected)
                                          Icon(
                                            Icons.check_circle_rounded,
                                            color: AppColors.successDefault,
                                          ),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Reference Number (for non-cash)
                          if (_selectedPaymentMethod != 'cash') ...[
                            _buildSectionTitle('REFERENCE / TRANSACTION ID'),
                            const SizedBox(height: 8),
                            Container(
                              padding: AppSpacing.insetLg,
                              decoration: BoxDecoration(
                                color: AppColors.surfaceDefault,
                                borderRadius: AppRadius.borderLg,
                                border: Border.all(color: AppColors.borderDefault),
                              ),
                              child: TextFormField(
                                controller: _referenceController,
                                keyboardType: TextInputType.text,
                                style: AppTextStyles.bodyMd.copyWith(
                                  color: AppColors.textPrimary,
                                ),
                                decoration: InputDecoration(
                                  hintText: _selectedPaymentMethod == 'bkash'
                                      ? 'bKash Transaction ID'
                                      : 'Bank Transfer Reference Number',
                                  hintStyle: AppTextStyles.bodyMd.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                                  prefixIcon: Icon(
                                    _selectedPaymentMethod == 'bkash'
                                        ? Icons.phone_android
                                        : Icons.receipt,
                                    color: AppColors.textMuted,
                                  ),
                                  border: InputBorder.none,
                                  contentPadding: EdgeInsets.zero,
                                ),
                                onChanged: (value) {
                                  setState(() {});
                                },
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Reference is required for ${_getPaymentMethodName(_selectedPaymentMethod)} payments',
                              style: AppTextStyles.bodyXs.copyWith(
                                color: AppColors.textMuted,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                            const SizedBox(height: 24),
                          ],

                          // Submit Button
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _submitPayment,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.successDefault,
                                foregroundColor: AppColors.successOn,
                                shape: RoundedRectangleBorder(
                                  borderRadius: AppRadius.borderLg,
                                ),
                                elevation: 0,
                              ),
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.payments_rounded),
                                        const SizedBox(width: 12),
                                        Text(
                                          'Record Payment',
                                          style: AppTextStyles.labelLg.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                            ),
                          ),
                          const SizedBox(height: 32),
                        ],
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: TextStyle(
        color: AppColors.textMuted,
        fontSize: 13,
        fontWeight: FontWeight.w700,
        letterSpacing: 1,
      ),
    );
  }

  Widget _buildQuickAmountButton(String label, double amount, {bool isFull = false}) {
    return InkWell(
      onTap: () {
        setState(() {
          _amountController.text = amount.toStringAsFixed(2);
        });
      },
      borderRadius: AppRadius.borderMd,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isFull
              ? AppColors.successDefault.withValues(alpha: 0.15)
              : AppColors.backgroundDefault,
          borderRadius: AppRadius.borderMd,
          border: Border.all(
            color: isFull
                ? AppColors.successDefault.withValues(alpha: 0.5)
                : AppColors.borderDefault,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.labelSm.copyWith(
            color: isFull ? AppColors.successDefault : AppColors.textSecondary,
            fontWeight: isFull ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline_rounded,
            size: 64,
            color: AppColors.dangerDefault.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to load suppliers',
            style: AppTextStyles.headingMd.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          if (_error != null)
            Text(
              _error!,
              style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
              textAlign: TextAlign.center,
            ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _fetchSuppliers,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDefault,
              foregroundColor: AppColors.primaryOn,
            ),
          ),
        ],
      ),
    );
  }
}
