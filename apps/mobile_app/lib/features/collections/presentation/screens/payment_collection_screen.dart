import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';

/// Payment Collection Screen - Collect outstanding payments from customers
/// Entry: FAB on CustomerLedgerScreen or menu option in POS
/// Records payments via record_customer_payment RPC and updates party balance
class PaymentCollectionScreen extends StatefulWidget {
  /// Optional pre-selected customer (from customer ledger screen)
  final Map<String, dynamic>? preSelectedCustomer;

  const PaymentCollectionScreen({
    super.key,
    this.preSelectedCustomer,
  });

  @override
  State<PaymentCollectionScreen> createState() => _PaymentCollectionScreenState();
}

class _PaymentCollectionScreenState extends State<PaymentCollectionScreen> {
  final _supabase = Supabase.instance.client;
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();
  final _searchController = TextEditingController();

  // Loading states
  bool _isSubmitting = false;
  bool _isSearching = false;

  // Data
  List<PaymentMethodOption> _paymentMethods = [];
  PaymentMethodOption? _selectedPaymentMethod;
  Map<String, dynamic>? _selectedCustomer;
  List<Map<String, dynamic>> _searchResults = [];
  String? _error;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _loadPaymentMethods();

    // Set pre-selected customer if provided
    if (widget.preSelectedCustomer != null) {
      _selectedCustomer = widget.preSelectedCustomer;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  /// Load available payment methods (cash, bKash, card)
  Future<void> _loadPaymentMethods() async {
    try {
      final auth = context.read<AuthProvider>();
      final storeId = auth.appUser?.storeId;

      if (storeId == null) return;

      final response = await _supabase
          .from('payment_methods')
          .select('id, name, type')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('sort_order');

      final methods = (response as List)
          .map((r) => PaymentMethodOption(
                id: r['id'] as String,
                name: r['name'] as String,
                type: r['type'] as String,
              ))
          .toList();

      setState(() {
        _paymentMethods = methods;
        // Default to cash
        _selectedPaymentMethod = methods.firstWhere(
          (m) => m.type == 'cash',
          orElse: () => methods.first,
        );
      });
    } catch (e) {
      debugPrint('Error loading payment methods: $e');
    }
  }

  /// Search for customers with outstanding balance
  Future<void> _searchCustomers(String query) async {
    if (query.isEmpty) {
      setState(() => _searchResults = []);
      return;
    }

    setState(() => _isSearching = true);

    try {
      final auth = context.read<AuthProvider>();
      final userId = auth.appUser?.id;
      final storeId = auth.appUser?.storeId;

      if (userId == null || storeId == null) return;

      // Use the same RPC as customer ledger
      final response = await _supabase.rpc('get_receivables_aging', params: {
        'p_tenant_id': userId,
        'p_store_id': storeId,
        'p_search': query.isEmpty ? null : query,
      }) as List<dynamic>;

      // Filter to customers with balance > 0 and matching search
      final results = List<Map<String, dynamic>>.from(response)
          .where((c) => (c['balance_due'] as num? ?? 0) > 0)
          .where((c) {
        final name = (c['customer_name'] as String? ?? '').toLowerCase();
        final phone = (c['phone'] as String? ?? '').toLowerCase();
        final searchLower = query.toLowerCase();
        return name.contains(searchLower) || phone.contains(searchLower);
      }).toList();

      setState(() {
        _searchResults = results.take(10).toList();
        _isSearching = false;
      });
    } catch (e) {
      debugPrint('Error searching customers: $e');
      setState(() => _isSearching = false);
    }
  }

  /// Submit the payment to the backend
  Future<void> _submitPayment() async {
    // Validation
    if (_selectedCustomer == null) {
      setState(() => _error = 'Please select a customer');
      return;
    }

    if (_amountController.text.isEmpty) {
      setState(() => _error = 'Please enter payment amount');
      return;
    }

    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Please enter a valid amount');
      return;
    }

    final balanceDue = (_selectedCustomer!['balance_due'] as num? ?? 0).toDouble();
    if (amount > balanceDue) {
      setState(() => _error = 'Amount cannot exceed balance due (৳${balanceDue.toStringAsFixed(2)})');
      return;
    }

    if (_selectedPaymentMethod == null) {
      setState(() => _error = 'Please select a payment method');
      return;
    }

    // Reference required for non-cash payments
    final reference = _referenceController.text.trim();
    if (_selectedPaymentMethod!.type != 'cash' && reference.isEmpty) {
      setState(() => _error = 'Reference number is required for ${_selectedPaymentMethod!.name} payments');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final userId = auth.appUser?.id;

      if (userId == null) {
        throw Exception('User not authenticated');
      }

      final partyId = _selectedCustomer!['party_id'] as String;

      // Call RPC to record payment
      await _supabase.rpc('record_customer_payment', params: {
        'p_party_id': partyId,
        'p_amount': amount,
        'p_payment_method': _selectedPaymentMethod!.type,
        'p_reference': reference.isEmpty ? null : reference,
        'p_collected_by': userId,
      });

      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _successMessage = 'Payment of ৳${amount.toStringAsFixed(2)} collected successfully!';
        });

        // Clear form after success
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            Navigator.of(context).pop(true); // Return true to indicate success
          }
        });
      }
    } catch (e) {
      debugPrint('Error submitting payment: $e');
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _error = 'Failed to record payment: ${e.toString()}';
        });
      }
    }
  }

  void _selectCustomer(Map<String, dynamic> customer) {
    setState(() {
      _selectedCustomer = customer;
      _searchResults = [];
      _searchController.clear();
      _error = null;
    });
    // Pre-fill with full balance
    final balance = (customer['balance_due'] as num? ?? 0).toDouble();
    _amountController.text = balance.toStringAsFixed(0);
  }

  void _clearCustomer() {
    setState(() {
      _selectedCustomer = null;
      _amountController.clear();
      _referenceController.clear();
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
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
            'Collect Payment',
            style: AppTextStyles.headingLg,
          ),
        ),
        body: _buildBody(),
        bottomNavigationBar: _buildSubmitButton(),
      ),
    );
  }

  Widget _buildBody() {
    return SingleChildScrollView(
      padding: AppSpacing.insetMd,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Success message
          if (_successMessage != null) ...[
            _buildSuccessBanner(),
            const SizedBox(height: 16),
          ],

          // Error message
          if (_error != null) ...[
            _buildErrorBanner(),
            const SizedBox(height: 16),
          ],

          // Customer Selection Section
          _buildSectionTitle('Customer'),
          const SizedBox(height: 8),
          if (_selectedCustomer == null)
            _buildCustomerSearch()
          else
            _buildSelectedCustomerCard(),
          const SizedBox(height: 24),

          // Payment Amount Section
          if (_selectedCustomer != null) ...[
            _buildSectionTitle('Payment Amount'),
            const SizedBox(height: 8),
            _buildAmountInput(),
            const SizedBox(height: 24),

            // Payment Method Section
            _buildSectionTitle('Payment Method'),
            const SizedBox(height: 8),
            _buildPaymentMethodSelector(),
            const SizedBox(height: 24),

            // Reference Number (for non-cash)
            if (_selectedPaymentMethod != null && _selectedPaymentMethod!.type != 'cash') ...[
              _buildSectionTitle('Reference Number'),
              const SizedBox(height: 8),
              _buildReferenceInput(),
              const SizedBox(height: 24),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildSuccessBanner() {
    return Container(
      width: double.infinity,
      padding: AppSpacing.insetMd,
      decoration: BoxDecoration(
        color: AppColors.successSubtle,
        borderRadius: AppRadius.borderMd,
        border: Border.all(color: AppColors.successDefault.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_rounded, color: AppColors.successDefault),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _successMessage!,
              style: AppTextStyles.bodyMd.copyWith(color: AppColors.successDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner() {
    return Container(
      width: double.infinity,
      padding: AppSpacing.insetMd,
      decoration: BoxDecoration(
        color: AppColors.dangerSubtle,
        borderRadius: AppRadius.borderMd,
        border: Border.all(color: AppColors.dangerDefault.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_rounded, color: AppColors.dangerDefault),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _error!,
              style: AppTextStyles.bodyMd.copyWith(color: AppColors.dangerDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title.toUpperCase(),
      style: AppTextStyles.labelSm.copyWith(
        color: AppColors.textMuted,
        letterSpacing: 1,
      ),
    );
  }

  Widget _buildCustomerSearch() {
    return Column(
      children: [
        TextField(
          controller: _searchController,
          onChanged: _searchCustomers,
          decoration: InputDecoration(
            hintText: 'Search customer by name or phone...',
            prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted),
            suffixIcon: _isSearching
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchResults = []);
                        },
                      )
                    : null,
            filled: true,
            fillColor: AppColors.surfaceDefault,
            border: OutlineInputBorder(
              borderRadius: AppRadius.borderMd,
              borderSide: const BorderSide(color: AppColors.borderDefault),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: AppRadius.borderMd,
              borderSide: const BorderSide(color: AppColors.borderDefault),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppRadius.borderMd,
              borderSide: const BorderSide(color: AppColors.primaryDefault),
            ),
          ),
        ),
        if (_searchResults.isNotEmpty) ...[
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surfaceDefault,
              borderRadius: AppRadius.borderMd,
              border: Border.all(color: AppColors.borderDefault),
              boxShadow: [
                BoxShadow(
                  color: AppColors.textPrimary.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _searchResults.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final customer = _searchResults[index];
                return _CustomerSearchResultTile(
                  customer: customer,
                  onTap: () => _selectCustomer(customer),
                );
              },
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSelectedCustomerCard() {
    final name = _selectedCustomer!['customer_name'] as String? ?? 'Customer';
    final phone = _selectedCustomer!['phone'] as String? ?? 'N/A';
    final balance = (_selectedCustomer!['balance_due'] as num? ?? 0).toDouble();

    return Container(
      padding: AppSpacing.insetMd,
      decoration: BoxDecoration(
        color: AppColors.primarySubtle,
        borderRadius: AppRadius.borderLg,
        border: Border.all(color: AppColors.primaryDefault.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceDefault,
                  borderRadius: AppRadius.borderMd,
                ),
                child: const Icon(
                  Icons.person_rounded,
                  color: AppColors.primaryDefault,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: AppTextStyles.headingMd,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      phone,
                      style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.edit_rounded, color: AppColors.textMuted),
                onPressed: _clearCustomer,
                tooltip: 'Change customer',
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: AppColors.borderDefault),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Outstanding Balance',
                style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
              ),
              Text(
                '৳${balance.toStringAsFixed(2)}',
                style: AppTextStyles.headingLg.copyWith(
                  color: AppColors.dangerDefault,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAmountInput() {
    return TextField(
      controller: _amountController,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
      ],
      style: AppTextStyles.headingXl.copyWith(
        color: AppColors.primaryDefault,
        fontWeight: FontWeight.w700,
      ),
      decoration: InputDecoration(
        hintText: '0.00',
        prefixText: '৳ ',
        prefixStyle: AppTextStyles.headingMd.copyWith(color: AppColors.textMuted),
        filled: true,
        fillColor: AppColors.surfaceDefault,
        border: OutlineInputBorder(
          borderRadius: AppRadius.borderLg,
          borderSide: const BorderSide(color: AppColors.borderDefault),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderLg,
          borderSide: const BorderSide(color: AppColors.borderDefault),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderLg,
          borderSide: const BorderSide(color: AppColors.primaryDefault, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      ),
      onChanged: (value) {
        // Clear error when user types
        if (_error != null && _error!.contains('amount')) {
          setState(() => _error = null);
        }
      },
    );
  }

  Widget _buildPaymentMethodSelector() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: _paymentMethods.map((method) {
        final isSelected = _selectedPaymentMethod?.id == method.id;
        return GestureDetector(
          onTap: () {
            setState(() {
              _selectedPaymentMethod = method;
              _error = null;
            });
          },
          child: Container(
            width: (MediaQuery.of(context).size.width - 56) / 3,
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primarySubtle : AppColors.surfaceDefault,
              borderRadius: AppRadius.borderMd,
              border: Border.all(
                color: isSelected ? AppColors.primaryDefault : AppColors.borderDefault,
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Column(
              children: [
                Icon(
                  _getPaymentMethodIcon(method.type),
                  color: isSelected ? AppColors.primaryDefault : AppColors.textMuted,
                  size: 28,
                ),
                const SizedBox(height: 8),
                Text(
                  method.name,
                  style: AppTextStyles.labelMd.copyWith(
                    color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  IconData _getPaymentMethodIcon(String type) {
    switch (type) {
      case 'cash':
        return Icons.money_rounded;
      case 'mobile_banking':
        return Icons.phone_android_rounded;
      case 'card':
        return Icons.credit_card_rounded;
      default:
        return Icons.payment_rounded;
    }
  }

  Widget _buildReferenceInput() {
    return TextField(
      controller: _referenceController,
      textCapitalization: TextCapitalization.characters,
      decoration: InputDecoration(
        hintText: _selectedPaymentMethod?.name == 'bKash'
            ? 'bKash Transaction ID (e.g., 8N7A9B2C1D)'
            : 'Reference number...',
        prefixIcon: const Icon(Icons.confirmation_number_rounded, color: AppColors.textMuted),
        filled: true,
        fillColor: AppColors.surfaceDefault,
        border: OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: const BorderSide(color: AppColors.borderDefault),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: const BorderSide(color: AppColors.borderDefault),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: const BorderSide(color: AppColors.primaryDefault),
        ),
      ),
      onChanged: (_) {
        if (_error != null && _error!.contains('reference')) {
          setState(() => _error = null);
        }
      },
    );
  }

  Widget _buildSubmitButton() {
    return SafeArea(
      child: Padding(
        padding: AppSpacing.insetMd,
        child: ElevatedButton.icon(
          onPressed: (_isSubmitting || _selectedCustomer == null) ? null : _submitPayment,
          icon: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.check_circle_rounded),
          label: Text(_isSubmitting ? 'Processing...' : 'Collect Payment'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryDefault,
            foregroundColor: AppColors.primaryOn,
            disabledBackgroundColor: AppColors.primaryDefault.withValues(alpha: 0.3),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: AppRadius.borderLg,
            ),
            textStyle: AppTextStyles.labelLg.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}

/// Widget for customer search result tile
class _CustomerSearchResultTile extends StatelessWidget {
  final Map<String, dynamic> customer;
  final VoidCallback onTap;

  const _CustomerSearchResultTile({
    required this.customer,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final name = customer['customer_name'] as String? ?? 'Customer';
    final phone = customer['phone'] as String? ?? 'N/A';
    final balance = (customer['balance_due'] as num? ?? 0).toDouble();

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: AppSpacing.insetMd,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primarySubtle,
                borderRadius: AppRadius.borderSm,
              ),
              child: const Icon(
                Icons.person_rounded,
                color: AppColors.primaryDefault,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: AppTextStyles.labelMd,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    phone,
                    style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '৳${balance.toStringAsFixed(0)}',
                  style: AppTextStyles.labelMd.copyWith(
                    color: AppColors.dangerDefault,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Due',
                  style: AppTextStyles.bodyXs.copyWith(color: AppColors.textMuted),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Payment method option for UI
class PaymentMethodOption {
  final String id;
  final String name;
  final String type;

  const PaymentMethodOption({
    required this.id,
    required this.name,
    required this.type,
  });
}
