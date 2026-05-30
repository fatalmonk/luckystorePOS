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

/// Daily Expenditures Screen - Track and record daily store expenses
/// Categories: Transport, Utilities, Supplies, Maintenance, Miscellaneous
class DailyExpendituresScreen extends StatefulWidget {
  const DailyExpendituresScreen({super.key});

  @override
  State<DailyExpendituresScreen> createState() => _DailyExpendituresScreenState();
}

class _DailyExpendituresScreenState extends State<DailyExpendituresScreen> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  List<Map<String, dynamic>> _expenses = [];
  DateTime _selectedDate = DateTime.now();
  double _totalToday = 0.0;

  // Expense categories
  static const List<String> _categories = [
    'Transport',
    'Utilities',
    'Supplies',
    'Maintenance',
    'Rent',
    'Salaries',
    'Miscellaneous',
  ];

  // Payment types
  static const List<String> _paymentTypes = ['Cash', 'Bank transfer', 'Bkash', 'Card'];

  @override
  void initState() {
    super.initState();
    _fetchExpenses();
  }

  Future<void> _fetchExpenses() async {
    setState(() => _isLoading = true);

    try {
      final auth = context.read<AuthProvider>();
      final storeId = auth.appUser?.storeId;

      if (storeId == null) {
        throw Exception('Store context not found');
      }

      final startOfDay = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      final response = await _supabase
          .from('expenses')
          .select('*')
          .eq('store_id', storeId)
          .gte('expense_date', startOfDay.toIso8601String().split('T').first)
          .lt('expense_date', endOfDay.toIso8601String().split('T').first)
          .order('created_at', ascending: false);

      setState(() {
        _expenses = List<Map<String, dynamic>>.from(response);
        _totalToday = _expenses.fold<double>(
          0.0,
          (sum, expense) => sum + (expense['amount'] as num).toDouble(),
        );
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching expenses: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primaryDefault,
              onPrimary: AppColors.primaryOn,
              surface: AppColors.surfaceDefault,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
      _fetchExpenses();
    }
  }

  void _showAddExpenseDialog() {
    final formKey = GlobalKey<FormState>();
    final amountController = TextEditingController();
    final descriptionController = TextEditingController();
    final vendorController = TextEditingController();
    String selectedCategory = _categories.first;
    String selectedPaymentType = _paymentTypes.first;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppColors.surfaceDefault,
          shape: RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
          title: Text('Add Expense', style: AppTextStyles.headingLg),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Amount
                  TextFormField(
                    controller: amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                    ],
                    decoration: InputDecoration(
                      labelText: 'Amount (৳)',
                      labelStyle: AppTextStyles.bodySm,
                      border: OutlineInputBorder(borderRadius: AppRadius.borderMd),
                      prefixIcon: const Icon(Icons.monetization_on_rounded),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Required';
                      }
                      if (double.tryParse(value) == null) {
                        return 'Invalid amount';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Vendor
                  TextFormField(
                    controller: vendorController,
                    decoration: InputDecoration(
                      labelText: 'Vendor/Recipient',
                      labelStyle: AppTextStyles.bodySm,
                      border: OutlineInputBorder(borderRadius: AppRadius.borderMd),
                      prefixIcon: const Icon(Icons.store_rounded),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Description
                  TextFormField(
                    controller: descriptionController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: 'Description',
                      labelStyle: AppTextStyles.bodySm,
                      border: OutlineInputBorder(borderRadius: AppRadius.borderMd),
                      prefixIcon: const Icon(Icons.description_rounded),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Category
                  DropdownButtonFormField<String>(
                    value: selectedCategory,
                    decoration: InputDecoration(
                      labelText: 'Category',
                      labelStyle: AppTextStyles.bodySm,
                      border: OutlineInputBorder(borderRadius: AppRadius.borderMd),
                    ),
                    items: _categories.map((cat) => DropdownMenuItem(value: cat, child: Text(cat))).toList(),
                    onChanged: (value) {
                      setDialogState(() => selectedCategory = value!);
                    },
                  ),
                  const SizedBox(height: 16),

                  // Payment Type
                  DropdownButtonFormField<String>(
                    value: selectedPaymentType,
                    decoration: InputDecoration(
                      labelText: 'Payment Type',
                      labelStyle: AppTextStyles.bodySm,
                      border: OutlineInputBorder(borderRadius: AppRadius.borderMd),
                    ),
                    items: _paymentTypes.map((type) => DropdownMenuItem(value: type, child: Text(type))).toList(),
                    onChanged: (value) {
                      setDialogState(() => selectedPaymentType = value!);
                    },
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel', style: AppTextStyles.labelMd),
            ),
            ElevatedButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  await _saveExpense(
                    amount: double.parse(amountController.text),
                    vendor: vendorController.text,
                    description: descriptionController.text,
                    category: selectedCategory,
                    paymentType: selectedPaymentType,
                  );
                  if (context.mounted) Navigator.pop(context);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryDefault,
                foregroundColor: AppColors.primaryOn,
                shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
              ),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveExpense({
    required double amount,
    required String vendor,
    required String description,
    required String category,
    required String paymentType,
  }) async {
    try {
      final auth = context.read<AuthProvider>();
      final storeId = auth.appUser?.storeId;
      final userId = auth.appUser?.id;

      if (storeId == null || userId == null) {
        throw Exception('Store context not found');
      }

      final response = await _supabase.rpc('record_expense', params: {
        'p_store_id': storeId,
        'p_date': _selectedDate.toIso8601String().split('T').first,
        'p_vendor': vendor,
        'p_description': description,
        'p_amount': amount,
        'p_payment_type': paymentType,
        'p_category': category,
      });

      if (response is Map && response['status'] == 'SUCCESS') {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Expense recorded'),
              backgroundColor: AppColors.successDefault,
            ),
          );
          _fetchExpenses();
        }
      } else {
        throw Exception('Failed to record expense');
      }
    } catch (e) {
      debugPrint('Error saving expense: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppColors.dangerDefault,
          ),
        );
      }
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
          title: Text('Daily Expenditures', style: AppTextStyles.headingLg),
          actions: [
            IconButton(
              icon: const Icon(Icons.calendar_today_rounded),
              onPressed: _selectDate,
              tooltip: 'Select Date',
            ),
          ],
        ),
        body: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primaryDefault),
              )
            : Column(
                children: [
                  // Date and Total Summary
                  Container(
                    margin: AppSpacing.insetMd,
                    padding: AppSpacing.insetLg,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDefault,
                      borderRadius: AppRadius.borderLg,
                      border: Border.all(color: AppColors.borderDefault),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                DateFormat('EEEE, dd MMMM yyyy').format(_selectedDate),
                                style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '৳${_totalToday.toStringAsFixed(2)}',
                                style: AppTextStyles.display.copyWith(
                                  color: AppColors.primaryDefault,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${_expenses.length} transaction${_expenses.length != 1 ? 's' : ''}',
                                style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.primarySubtle,
                            borderRadius: AppRadius.borderMd,
                          ),
                          child: const Icon(
                            Icons.trending_up_rounded,
                            color: AppColors.primaryDefault,
                            size: 40,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Expenses List
                  Expanded(
                    child: _expenses.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.receipt_long_rounded,
                                  size: 64,
                                  color: AppColors.textMuted.withValues(alpha: 0.5),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No expenses for this date',
                                  style: AppTextStyles.headingMd.copyWith(color: AppColors.textSecondary),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Tap + to add an expense',
                                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: AppSpacing.insetMd,
                            itemCount: _expenses.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final expense = _expenses[index];
                              return _ExpenseTile(expense: expense);
                            },
                          ),
                  ),
                ],
              ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _showAddExpenseDialog,
          icon: const Icon(Icons.add_rounded),
          label: const Text('Add Expense'),
          backgroundColor: AppColors.primaryDefault,
          foregroundColor: AppColors.primaryOn,
        ),
      ),
    );
  }
}

class _ExpenseTile extends StatelessWidget {
  final Map<String, dynamic> expense;

  const _ExpenseTile({required this.expense});

  @override
  Widget build(BuildContext context) {
    final amount = expense['amount'] as num;
    final category = expense['category'] as String? ?? 'Uncategorized';
    final vendor = expense['vendor_name'] as String? ?? 'Unknown';
    final description = expense['description'] as String? ?? '';
    final paymentType = expense['payment_type'] as String? ?? 'Cash';
    final date = expense['expense_date'] != null
        ? DateTime.parse(expense['expense_date'])
        : DateTime.now();

    final categoryIcon = {
      'Transport': Icons.local_shipping_rounded,
      'Utilities': Icons.bolt_rounded,
      'Supplies': Icons.inventory_rounded,
      'Maintenance': Icons.build_rounded,
      'Rent': Icons.home_rounded,
      'Salaries': Icons.badge_rounded,
    }[category] ?? Icons.receipt_rounded;

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
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.warningSubtle,
              borderRadius: AppRadius.borderSm,
            ),
            child: Icon(categoryIcon, color: AppColors.warningDefault, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  vendor,
                  style: AppTextStyles.labelLg,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundSubtle,
                        borderRadius: AppRadius.borderSm,
                      ),
                      child: Text(
                        category,
                        style: AppTextStyles.labelXs.copyWith(color: AppColors.textSecondary),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      paymentType,
                      style: AppTextStyles.bodyXs.copyWith(color: AppColors.textMuted),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '৳${amount.toStringAsFixed(2)}',
                style: AppTextStyles.labelLg.copyWith(
                  color: AppColors.dangerDefault,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                DateFormat('dd MMM').format(date),
                style: AppTextStyles.bodyXs.copyWith(color: AppColors.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
