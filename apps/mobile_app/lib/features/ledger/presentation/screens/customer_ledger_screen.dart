import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../collections/presentation/screens/payment_collection_screen.dart';

/// Customer Ledger Screen - View credit customers and their transaction history
/// Shows outstanding balances, payment history, and allows WhatsApp reminders
class CustomerLedgerScreen extends StatefulWidget {
  const CustomerLedgerScreen({super.key});

  @override
  State<CustomerLedgerScreen> createState() => _CustomerLedgerScreenState();
}

class _CustomerLedgerScreenState extends State<CustomerLedgerScreen> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _customers = [];
  Map<String, dynamic>? _selectedCustomer;
  List<Map<String, dynamic>> _transactions = [];

  @override
  void initState() {
    super.initState();
    _fetchCreditCustomers();
  }

  Future<void> _fetchCreditCustomers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final storeId = auth.appUser?.storeId;
      final userId = auth.appUser?.id;

      if (storeId == null || userId == null) {
        throw Exception('Store context not found. Please log in again.');
      }

      // Fetch customers with outstanding balances using receivables aging RPC
      final response = await _supabase.rpc('get_receivables_aging', params: {
        'p_tenant_id': userId,
        'p_store_id': storeId,
        'p_search': null,
      }) as List<dynamic>;

      setState(() {
        _customers = List<Map<String, dynamic>>.from(response);
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching customers: $e');
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadCustomerTransactions(String customerId) async {
    try {
      final auth = context.read<AuthProvider>();
      final storeId = auth.appUser?.storeId;

      if (storeId == null) return;

      // Fetch transaction history for selected customer
      final response = await _supabase
          .from('sale_transactions')
          .select('''
            id,
            transaction_date,
            total_amount,
            payment_type,
            customer_name,
            customer_phone,
            is_credit_sale,
            credit_amount,
            created_at
          ''')
          .eq('store_id', storeId)
          .eq('customer_phone', _selectedCustomer!['phone'])
          .eq('is_credit_sale', true)
          .order('created_at', ascending: false)
          .limit(50);

      setState(() {
        _transactions = List<Map<String, dynamic>>.from(response);
      });
    } catch (e) {
      debugPrint('Error loading transactions: $e');
    }
  }

  Future<void> _launchWhatsApp(Map<String, dynamic> customer) async {
    final phone = customer['phone'] as String?;
    if (phone == null || phone.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No phone number available.')),
        );
      }
      return;
    }

    final name = customer['customer_name'] ?? 'Customer';
    final amount = customer['balance_due'] ?? 0;
    
    final message = '''Assalamu Alaikum $name,
Your outstanding balance at Lucky Store is ৳${amount.toStringAsFixed(2)}.
Please clear dues at your earliest convenience.
Thank you.''';

    final uri = Uri.parse('https://wa.me/$phone?text=${Uri.encodeComponent(message)}');
    
    // Log reminder
    final auth = context.read<AuthProvider>();
    try {
      await _supabase.rpc('log_customer_reminder', params: {
        'p_tenant_id': auth.appUser?.id,
        'p_store_id': auth.appUser?.storeId,
        'p_party_id': customer['party_id'],
        'p_type': 'whatsapp',
      });
    } catch (e) {
      debugPrint('Failed to log reminder: $e');
    }

    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not launch WhatsApp')),
        );
      }
    }
  }

  void _showCustomerDetails(Map<String, dynamic> customer) {
    setState(() {
      _selectedCustomer = customer;
    });
    _loadCustomerTransactions(customer['party_id'].toString());
  }

  /// Navigate to payment collection screen
  Future<void> _navigateToPaymentCollection() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => const PaymentCollectionScreen(),
      ),
    );
    
    // If payment was successful, refresh the customer list
    if (result == true) {
      _fetchCreditCustomers();
    }
  }

  /// Navigate to payment collection with specific customer pre-selected
  Future<void> _collectPaymentFromCustomer(Map<String, dynamic> customer) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => PaymentCollectionScreen(
          preSelectedCustomer: customer,
        ),
      ),
    );
    
    // If payment was successful, go back to customer list and refresh
    if (result == true) {
      setState(() => _selectedCustomer = null);
      _fetchCreditCustomers();
    }
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
            onPressed: () {
              if (_selectedCustomer != null) {
                setState(() => _selectedCustomer = null);
              } else {
                Navigator.of(context).pop();
              }
            },
          ),
          title: Text(
            _selectedCustomer != null 
                ? (_selectedCustomer!['customer_name'] ?? 'Customer Ledger')
                : 'Credit Customers',
            style: AppTextStyles.headingLg,
          ),
          actions: [
            if (_selectedCustomer == null)
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: _fetchCreditCustomers,
                tooltip: 'Refresh',
              ),
          ],
        ),
        floatingActionButton: _selectedCustomer == null && !_isLoading && _error == null
            ? FloatingActionButton.extended(
                onPressed: _navigateToPaymentCollection,
                icon: const Icon(Icons.add_circle_rounded),
                label: const Text('Collect Payment'),
                backgroundColor: AppColors.primaryDefault,
                foregroundColor: AppColors.primaryOn,
              )
            : null,
        body: _isLoading
            ? const Center(
                child: CircularProgressIndicator(
                  color: AppColors.primaryDefault,
                ),
              )
            : _error != null
                ? _buildErrorState()
                : _selectedCustomer != null
                    ? _buildTransactionHistory()
                    : _buildCustomerList(),
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
            'Failed to load customers',
            style: AppTextStyles.headingMd.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          Text(
            _error!,
            style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _fetchCreditCustomers,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDefault,
              foregroundColor: AppColors.primaryOn,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: AppRadius.borderLg,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerList() {
    if (_customers.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.people_outline_rounded,
              size: 64,
              color: AppColors.textMuted.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'No credit customers',
              style: AppTextStyles.headingMd.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 8),
            Text(
              'Customers with credit sales will appear here',
              style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchCreditCustomers,
      color: AppColors.primaryDefault,
      backgroundColor: AppColors.surfaceDefault,
      child: ListView.separated(
        padding: AppSpacing.insetMd,
        itemCount: _customers.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final customer = _customers[index];
          return _CustomerCard(
            customer: customer,
            onTap: () => _showCustomerDetails(customer),
            onWhatsApp: () => _launchWhatsApp(customer),
          );
        },
      ),
    );
  }

  Widget _buildTransactionHistory() {
    if (_selectedCustomer == null) {
      return const SizedBox.shrink();
    }

    final balance = _selectedCustomer!['balance_due'] as num? ?? 0;
    final phone = _selectedCustomer!['phone'] as String? ?? 'N/A';
    final name = _selectedCustomer!['customer_name'] as String? ?? 'Customer';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Customer Summary Card
        Container(
          margin: AppSpacing.insetMd,
          padding: AppSpacing.insetLg,
          decoration: BoxDecoration(
            color: AppColors.surfaceDefault,
            borderRadius: AppRadius.borderLg,
            border: Border.all(color: AppColors.borderDefault),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primarySubtle,
                      borderRadius: AppRadius.borderMd,
                    ),
                    child: const Icon(
                      Icons.account_circle_rounded,
                      color: AppColors.primaryDefault,
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: AppTextStyles.headingMd,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          phone,
                          style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: _SummaryStat(
                      label: 'Outstanding',
                      value: '৳${balance.toStringAsFixed(2)}',
                      valueColor: balance > 0 ? AppColors.dangerDefault : AppColors.successDefault,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _SummaryStat(
                      label: 'Transactions',
                      value: _transactions.length.toString(),
                      valueColor: AppColors.primaryDefault,
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _collectPaymentFromCustomer(_selectedCustomer!),
                icon: const Icon(Icons.payments_rounded, size: 18),
                label: const Text('Collect Payment'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryDefault,
                  foregroundColor: AppColors.primaryOn,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: AppRadius.borderMd,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _launchWhatsApp(_selectedCustomer!),
                icon: const Icon(Icons.message_rounded, size: 18),
                label: const Text('Send Reminder via WhatsApp'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.successDefault,
                  side: const BorderSide(color: AppColors.successDefault),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: AppRadius.borderMd,
                  ),
                ),
              ),
            ),
            ],
          ),
        ),

        // Transaction History
        Padding(
          padding: AppSpacing.insetMd,
          child: Text(
            'Transaction History',
            style: AppTextStyles.headingMd,
          ),
        ),
        Expanded(
          child: _transactions.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.receipt_long_rounded,
                        size: 48,
                        color: AppColors.textMuted.withValues(alpha: 0.5),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No credit transactions found',
                        style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: AppSpacing.insetMd,
                  itemCount: _transactions.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final txn = _transactions[index];
                    return _TransactionTile(transaction: txn);
                  },
                ),
        ),
      ],
    );
  }
}

class _CustomerCard extends StatelessWidget {
  final Map<String, dynamic> customer;
  final VoidCallback onTap;
  final VoidCallback onWhatsApp;

  const _CustomerCard({
    required this.customer,
    required this.onTap,
    required this.onWhatsApp,
  });

  @override
  Widget build(BuildContext context) {
    final balance = customer['balance_due'] as num? ?? 0;
    final daysOverdue = customer['days_overdue'] as int? ?? 0;
    final name = customer['customer_name'] as String? ?? 'Customer';
    final phone = customer['phone'] as String? ?? 'N/A';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: AppSpacing.insetMd,
        decoration: BoxDecoration(
          color: AppColors.surfaceDefault,
          borderRadius: AppRadius.borderLg,
          border: Border.all(
            color: balance > 0 ? AppColors.dangerDefault.withValues(alpha: 0.3) : AppColors.borderDefault,
          ),
          boxShadow: balance > 0 ? [
            BoxShadow(
              color: AppColors.dangerDefault.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ] : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primarySubtle,
                    borderRadius: AppRadius.borderMd,
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
                        style: AppTextStyles.labelLg,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
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
                  icon: const Icon(Icons.message_rounded, size: 20),
                  color: AppColors.successDefault,
                  onPressed: onWhatsApp,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Balance Due',
                        style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '৳${balance.toStringAsFixed(2)}',
                        style: AppTextStyles.headingMd.copyWith(
                          color: balance > 0 ? AppColors.dangerDefault : AppColors.successDefault,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                if (daysOverdue > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.dangerSubtle,
                      borderRadius: AppRadius.borderSm,
                    ),
                    child: Text(
                      '$daysOverdue days',
                      style: AppTextStyles.labelSm.copyWith(
                        color: AppColors.dangerDefault,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final Map<String, dynamic> transaction;

  const _TransactionTile({required this.transaction});

  @override
  Widget build(BuildContext context) {
    final amount = transaction['credit_amount'] as num? ?? 0;
    final total = transaction['total_amount'] as num? ?? 0;
    final date = transaction['transaction_date'] != null
        ? DateTime.parse(transaction['transaction_date'])
        : DateTime.now();

    return Container(
      padding: AppSpacing.insetMd,
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        borderRadius: AppRadius.borderMd,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.warningSubtle,
              borderRadius: AppRadius.borderSm,
            ),
            child: const Icon(
              Icons.receipt_rounded,
              color: AppColors.warningDefault,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Credit Sale',
                  style: AppTextStyles.labelMd,
                ),
                const SizedBox(height: 2),
                Text(
                  DateFormat('dd MMM yyyy, h:mm a').format(date),
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '৳${amount.toStringAsFixed(2)}',
                style: AppTextStyles.labelMd.copyWith(
                  color: AppColors.dangerDefault,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Total: ৳${total.toStringAsFixed(2)}',
                style: AppTextStyles.bodyXs.copyWith(color: AppColors.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryStat extends StatelessWidget {
  final String label;
  final String value;
  final Color valueColor;

  const _SummaryStat({
    required this.label,
    required this.value,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: AppSpacing.insetMd,
      decoration: BoxDecoration(
        color: AppColors.backgroundSubtle,
        borderRadius: AppRadius.borderMd,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: AppTextStyles.headingMd.copyWith(
              color: valueColor,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
