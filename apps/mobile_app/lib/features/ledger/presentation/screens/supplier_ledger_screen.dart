import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../payments/presentation/screens/supplier_payment_screen.dart';

/// Supplier Ledger Screen - View suppliers and their purchase history
/// Shows outstanding payables, purchase history, and allows contact
class SupplierLedgerScreen extends StatefulWidget {
  const SupplierLedgerScreen({super.key});

  @override
  State<SupplierLedgerScreen> createState() => _SupplierLedgerScreenState();
}

class _SupplierLedgerScreenState extends State<SupplierLedgerScreen> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _suppliers = [];
  Map<String, dynamic>? _selectedSupplier;
  List<Map<String, dynamic>> _purchases = [];

  @override
  void initState() {
    super.initState();
    _fetchSuppliers();
  }

  Future<void> _fetchSuppliers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final tenantId = auth.appUser?.tenantId;
      final storeId = auth.appUser?.storeId;

      if (tenantId == null || storeId == null) {
        throw Exception('Store context not found. Please log in again.');
      }

      // Fetch suppliers from purchases for this store to align with purchase history scope
      final response = await _supabase
          .from('parties')
          .select('''
            id,
            name,
            phone,
            type,
            created_at
          ''')
          .eq('tenant_id', tenantId)
          .eq('type', 'supplier')
          .order('name');

      setState(() {
        _suppliers = List<Map<String, dynamic>>.from(response);
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching suppliers: $e');
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadSupplierPurchases(String supplierId) async {
    try {
      final auth = context.read<AuthProvider>();
      final storeId = auth.appUser?.storeId;

      if (storeId == null) return;

      // Fetch purchase history for selected supplier
      final response = await _supabase
          .from('purchases')
          .select('''
            id,
            purchase_date,
            invoice_number,
            total_amount,
            amount_paid,
            payment_status,
            notes,
            created_at,
            purchase_items:purchase_items (
              quantity,
              unit_cost,
              products (name)
            )
          ''')
          .eq('store_id', storeId)
          .eq('supplier_id', supplierId)
          .order('created_at', ascending: false)
          .limit(50);

      setState(() {
        _purchases = List<Map<String, dynamic>>.from(response);
      });
    } catch (e) {
      debugPrint('Error loading purchases: $e');
    }
  }

  Future<void> _contactSupplier(String phone) async {
    if (phone.isEmpty) return;
    
    final Uri url = Uri.parse('https://wa.me/${phone.replaceAll(RegExp(r'[^0-9]'), '')}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      final Uri telUrl = Uri.parse('tel:$phone');
      if (await canLaunchUrl(telUrl)) {
        await launchUrl(telUrl);
      }
    }
  }

  String _formatCurrency(dynamic amount) {
    if (amount == null) return '৳0.00';
    return '৳${NumberFormat('#,##0.00').format(double.tryParse(amount.toString()) ?? 0)}';
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('dd MMM yyyy').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primitiveNeutral900,
      appBar: AppBar(
        backgroundColor: AppColors.primitiveNeutral800,
        elevation: 0,
        title: Text('Supplier Ledger', style: AppTextStyles.headingMd),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchSuppliers,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const SupplierPaymentScreen(),
            ),
          );
        },
        backgroundColor: AppColors.successDefault,
        icon: const Icon(Icons.payments_rounded, color: Colors.white),
        label: Text(
          'Make Payment',
          style: AppTextStyles.labelMd.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: _selectedSupplier == null
          ? _buildSupplierList()
          : _buildSupplierDetail(),
    );
  }

  Widget _buildSupplierList() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primaryDefault),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, color: AppColors.dangerDefault, size: 48),
            const SizedBox(height: 16),
                  Text(
                    'Failed to load suppliers',
                    style: AppTextStyles.headingMd.copyWith(color: AppColors.primitiveNeutral0),
                  ),
            const SizedBox(height: 8),
            Text(
              _error!,
              style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _fetchSuppliers,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_suppliers.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.people_outline, color: AppColors.primitiveNeutral400, size: 64),
            const SizedBox(height: 16),
            Text(
              'No suppliers found',
              style: AppTextStyles.headingMd.copyWith(color: AppColors.primitiveNeutral0),
            ),
            const SizedBox(height: 8),
            Text(
              'Add suppliers in the Purchase section',
              style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _suppliers.length,
      itemBuilder: (context, index) {
        final supplier = _suppliers[index];
        final outstanding = double.tryParse(supplier['outstanding_balance']?.toString() ?? '0') ?? 0;
        final hasOutstanding = outstanding > 0;

        return Card(
          color: AppColors.primitiveNeutral800,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
          child: InkWell(
            onTap: () {
              setState(() => _selectedSupplier = supplier);
              _loadSupplierPurchases(supplier['id']);
            },
            borderRadius: AppRadius.borderLg,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: hasOutstanding
                          ? AppColors.warningDefault.withValues(alpha: 0.2)
                          : AppColors.successDefault.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.business,
                      color: hasOutstanding ? AppColors.warningDefault : AppColors.successDefault,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          supplier['name'] ?? 'Unknown',
                          style: AppTextStyles.labelLg.copyWith(color: AppColors.primitiveNeutral0),
                        ),
                        if (supplier['phone'] != null && supplier['phone'].isNotEmpty)
                          Text(
                            supplier['phone'],
                            style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400),
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
                          color: hasOutstanding ? AppColors.warningDefault : AppColors.successDefault,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        hasOutstanding ? 'Payable' : 'Settled',
                        style: AppTextStyles.bodyXs.copyWith(color: AppColors.primitiveNeutral400),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSupplierDetail() {
    final supplier = _selectedSupplier!;
    final outstanding = double.tryParse(supplier['outstanding_balance']?.toString() ?? '0') ?? 0;

    return Column(
      children: [
        // Header with back button
        Container(
          color: AppColors.primitiveNeutral800,
          padding: const EdgeInsets.all(16),
          child: SafeArea(
            child: Column(
              children: [
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: AppColors.primitiveNeutral0),
                      onPressed: () => setState(() => _selectedSupplier = null),
                    ),
                    Expanded(
                      child: Text(
                        supplier['name'] ?? 'Supplier',
                        style: AppTextStyles.headingMd.copyWith(color: AppColors.primitiveNeutral0),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (supplier['phone'] != null && supplier['phone'].isNotEmpty)
                      IconButton(
                        icon: const Icon(Icons.call, color: AppColors.successDefault),
                        onPressed: () => _contactSupplier(supplier['phone']),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                // Summary cards
                Row(
                  children: [
                    Expanded(
                      child: _InfoCard(
                        label: 'Outstanding',
                        value: _formatCurrency(outstanding),
                        valueColor: outstanding > 0 ? AppColors.warningDefault : AppColors.successDefault,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _InfoCard(
                        label: 'Total Orders',
                        value: _purchases.length.toString(),
                        valueColor: AppColors.primaryDefault,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        // Purchase history
        Expanded(
          child: _purchases.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.receipt_long_outlined, color: AppColors.primitiveNeutral400, size: 48),
                      const SizedBox(height: 16),
                      Text(
                        'No purchase history',
                        style: AppTextStyles.bodyMd.copyWith(color: AppColors.primitiveNeutral400),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _purchases.length,
                  itemBuilder: (context, index) {
                    final purchase = _purchases[index];
                    final amountPaid = double.tryParse(purchase['amount_paid']?.toString() ?? '0') ?? 0;
                    final totalAmount = double.tryParse(purchase['total_amount']?.toString() ?? '0') ?? 0;
                    final remaining = totalAmount - amountPaid;

                    return Card(
                      color: AppColors.primitiveNeutral800,
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Invoice: ${purchase['invoice_number'] ?? 'N/A'}',
                                  style: AppTextStyles.labelMd.copyWith(color: AppColors.primitiveNeutral0),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: remaining > 0
                                        ? AppColors.warningDefault.withValues(alpha: 0.2)
                                        : AppColors.successDefault.withValues(alpha: 0.2),
                                    borderRadius: AppRadius.borderSm,
                                  ),
                                  child: Text(
                                    remaining > 0 ? 'Partial' : 'Paid',
                                    style: AppTextStyles.labelXs.copyWith(
                                      color: remaining > 0 ? AppColors.warningDefault : AppColors.successDefault,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _formatDate(purchase['purchase_date']),
                              style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400),
                            ),
                            const Divider(height: 16, color: AppColors.primitiveNeutral600),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Total: ${_formatCurrency(totalAmount)}',
                                      style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral0),
                                    ),
                                    Text(
                                      'Paid: ${_formatCurrency(amountPaid)}',
                                      style: AppTextStyles.bodySm.copyWith(color: AppColors.successDefault),
                                    ),
                                  ],
                                ),
                                if (remaining > 0)
                                  Text(
                                    'Due: ${_formatCurrency(remaining)}',
                                    style: AppTextStyles.labelMd.copyWith(color: AppColors.warningDefault),
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
  }
}

class _InfoCard extends StatelessWidget {
  final String label;
  final String value;
  final Color valueColor;

  const _InfoCard({
    required this.label,
    required this.value,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primitiveNeutral600,
        borderRadius: AppRadius.borderLg,
      ),
      child: Column(
        children: [
          Text(
            label,
            style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: AppTextStyles.headingMd.copyWith(color: valueColor, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
