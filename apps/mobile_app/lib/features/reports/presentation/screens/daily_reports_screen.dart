import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../shared/providers/auth_provider.dart';

/// Daily Reports Screen - Quick access sales summary for cashiers
/// Features: Sales summary, payment breakdown, top products, hourly chart
class DailyReportsScreen extends StatefulWidget {
  const DailyReportsScreen({super.key});

  @override
  State<DailyReportsScreen> createState() => _DailyReportsScreenState();
}

class _DailyReportsScreenState extends State<DailyReportsScreen> {
  final _supabase = Supabase.instance.client;
  
  DateTime _selectedDate = DateTime.now();
  bool _isLoading = true;
  String? _error;

  // Sales Summary Data
  Map<String, dynamic> _salesSummary = {
    'total_sales': 0.0,
    'transaction_count': 0,
    'atv': 0.0,
  };

  // Payment Breakdown Data
  List<Map<String, dynamic>> _paymentBreakdown = [];

  // Top Products Data
  List<Map<String, dynamic>> _topProducts = [];

  // Hourly Sales Data
  List<Map<String, dynamic>> _hourlySales = [];

  @override
  void initState() {
    super.initState();
    _loadReportData();
  }

  Future<void> _loadReportData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final authProvider = context.read<AuthProvider>();
      final appUser = authProvider.appUser;
      
      if (appUser == null || appUser.storeId.isEmpty) {
        throw Exception('User store context not found. Please log in again.');
      }
      
      final storeId = appUser.storeId;
      final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);

      // Fetch all report data in parallel
      final salesSummaryFuture = _fetchSalesSummary(dateStr, storeId);
      final paymentBreakdownFuture = _fetchPaymentBreakdown(dateStr, storeId);
      final topProductsFuture = _fetchTopProducts(dateStr, storeId);
      final hourlySalesFuture = _fetchHourlySales(dateStr, storeId);

      final salesSummary = await salesSummaryFuture;
      final paymentBreakdown = await paymentBreakdownFuture;
      final topProducts = await topProductsFuture;
      final hourlySales = await hourlySalesFuture;

      if (mounted) {
        setState(() {
          _salesSummary = salesSummary;
          _paymentBreakdown = paymentBreakdown;
          _topProducts = topProducts;
          _hourlySales = hourlySales;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Daily Reports Error: $e');
      if (mounted) {
        setState(() {
          _error = 'Failed to load report data. Please check your connection.';
          _isLoading = false;
        });
      }
    }
  }

  Future<Map<String, dynamic>> _fetchSalesSummary(String date, String storeId) async {
    try {
      final result = await _supabase.rpc('get_daily_sales_summary', params: {
        'p_date': date,
        'p_store_id': storeId,
      });
      
      if (result is Map<String, dynamic>) {
        return {
          'total_sales': (result['total_sales'] as num?)?.toDouble() ?? 0.0,
          'transaction_count': result['transaction_count'] as int? ?? 0,
          'atv': (result['atv'] as num?)?.toDouble() ?? 0.0,
        };
      }
    } catch (e) {
      debugPrint('Sales summary error: $e');
    }
    return {'total_sales': 0.0, 'transaction_count': 0, 'atv': 0.0};
  }

  Future<List<Map<String, dynamic>>> _fetchPaymentBreakdown(String date, String storeId) async {
    try {
      final result = await _supabase.rpc('get_payment_breakdown', params: {
        'p_date': date,
        'p_store_id': storeId,
      });
      
      if (result is List) {
        return result.map((item) => {
          'payment_method': item['payment_method']?.toString() ?? 'Unknown',
          'amount': (item['amount'] as num?)?.toDouble() ?? 0.0,
          'percentage': (item['percentage'] as num?)?.toDouble() ?? 0.0,
        }).toList();
      }
    } catch (e) {
      debugPrint('Payment breakdown error: $e');
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> _fetchTopProducts(String date, String storeId) async {
    try {
      final result = await _supabase.rpc('get_top_products', params: {
        'p_date': date,
        'p_store_id': storeId,
        'p_limit': 5,
      });
      
      if (result is List) {
        return result.map((item) => {
          'product_name': item['product_name']?.toString() ?? 'Unknown',
          'quantity': item['quantity'] as int? ?? 0,
          'total_amount': (item['total_amount'] as num?)?.toDouble() ?? 0.0,
        }).toList();
      }
    } catch (e) {
      debugPrint('Top products error: $e');
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> _fetchHourlySales(String date, String storeId) async {
    try {
      final result = await _supabase.rpc('get_hourly_sales', params: {
        'p_date': date,
        'p_store_id': storeId,
      });
      
      if (result is List) {
        return result.map((item) => {
          'hour': item['hour'] as int? ?? 0,
          'sales': (item['sales'] as num?)?.toDouble() ?? 0.0,
          'transactions': item['transactions'] as int? ?? 0,
        }).toList();
      }
    } catch (e) {
      debugPrint('Hourly sales error: $e');
    }
    return [];
  }

  Future<void> _selectDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: now.subtract(const Duration(days: 365)),
      lastDate: now,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
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
      _loadReportData();
    }
  }

  String _formatCurrency(double amount) {
    return '৳${amount.toStringAsFixed(2)}';
  }

  @override
  Widget build(BuildContext context) {
    final isToday = DateUtils.isSameDay(_selectedDate, DateTime.now());
    final dateDisplay = isToday ? 'Today' : DateFormat('MMM dd, yyyy').format(_selectedDate);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDefault,
        appBar: AppBar(
          backgroundColor: AppColors.surfaceDefault,
          elevation: 0,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Daily Reports',
                style: AppTextStyles.headingMd.copyWith(color: AppColors.textPrimary),
              ),
              Text(
                dateDisplay,
                style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.calendar_today_rounded, color: AppColors.primaryDefault),
              tooltip: 'Select Date',
              onPressed: _selectDate,
            ),
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AppColors.primaryDefault),
              tooltip: 'Refresh',
              onPressed: _loadReportData,
            ),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryDefault))
            : _error != null
                ? _buildErrorView()
                : RefreshIndicator(
                    onRefresh: _loadReportData,
                    color: AppColors.primaryDefault,
                    backgroundColor: AppColors.surfaceRaised,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: AppSpacing.insetLg,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSalesSummaryCard(),
                          const SizedBox(height: AppSpacing.space4),
                          _buildPaymentBreakdownCard(),
                          const SizedBox(height: AppSpacing.space4),
                          if (_hourlySales.isNotEmpty) ...[
                            _buildHourlyChartCard(),
                            const SizedBox(height: AppSpacing.space4),
                          ],
                          _buildTopProductsCard(),
                          const SizedBox(height: AppSpacing.space6),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline_rounded, size: 48, color: AppColors.dangerDefault),
          const SizedBox(height: AppSpacing.space3),
          Text(
            _error!,
            style: AppTextStyles.bodyMd.copyWith(color: AppColors.dangerDefault),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.space4),
          ElevatedButton.icon(
            onPressed: _loadReportData,
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

  Widget _buildSalesSummaryCard() {
    final totalSales = _salesSummary['total_sales'] as double;
    final transactionCount = _salesSummary['transaction_count'] as int;
    final atv = _salesSummary['atv'] as double;

    return Container(
      width: double.infinity,
      padding: AppSpacing.insetLg,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primaryDefault, Color(0xFFD4941A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: AppRadius.borderLg,
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDefault.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Today's Sales",
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.primaryOn.withValues(alpha: 0.8),
                ),
              ),
              Icon(
                Icons.trending_up_rounded,
                color: AppColors.primaryOn.withValues(alpha: 0.8),
                size: 24,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.space2),
          Text(
            _formatCurrency(totalSales),
            style: AppTextStyles.display.copyWith(
              color: AppColors.primaryOn,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.space4),
          Row(
            children: [
              Expanded(
                child: _buildSummaryStat(
                  icon: Icons.receipt_rounded,
                  label: 'Transactions',
                  value: transactionCount.toString(),
                ),
              ),
              Expanded(
                child: _buildSummaryStat(
                  icon: Icons.shopping_cart_checkout_rounded,
                  label: 'ATV',
                  value: _formatCurrency(atv),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryStat({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.space2),
          decoration: BoxDecoration(
            color: AppColors.primaryOn.withValues(alpha: 0.2),
            borderRadius: AppRadius.borderMd,
          ),
          child: Icon(icon, color: AppColors.primaryOn, size: 20),
        ),
        const SizedBox(width: AppSpacing.space2),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: AppTextStyles.labelSm.copyWith(
                color: AppColors.primaryOn.withValues(alpha: 0.7),
              ),
            ),
            Text(
              value,
              style: AppTextStyles.headingMd.copyWith(
                color: AppColors.primaryOn,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPaymentBreakdownCard() {
    if (_paymentBreakdown.isEmpty) {
      return _buildEmptyCard('Payment Breakdown', Icons.payments_outlined);
    }

    final totalAmount = _paymentBreakdown.fold<double>(
      0, (sum, item) => sum + (item['amount'] as double),
    );

    return Container(
      width: double.infinity,
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
              Icon(Icons.payments_outlined, color: AppColors.primaryDefault, size: 24),
              const SizedBox(width: AppSpacing.space2),
              Text(
                'Payment Breakdown',
                style: AppTextStyles.headingMd.copyWith(color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.space4),
          ..._paymentBreakdown.map((item) => _buildPaymentBar(
            method: item['payment_method'] as String,
            amount: item['amount'] as double,
            percentage: totalAmount > 0 ? (item['amount'] as double) / totalAmount * 100 : 0,
          )),
        ],
      ),
    );
  }

  Widget _buildPaymentBar({
    required String method,
    required double amount,
    required double percentage,
  }) {
    final icon = _getPaymentIcon(method);
    final color = _getPaymentColor(method);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.space3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, color: color, size: 18),
                  const SizedBox(width: AppSpacing.space2),
                  Text(
                    _capitalizeFirst(method),
                    style: AppTextStyles.labelMd.copyWith(color: AppColors.textPrimary),
                  ),
                ],
              ),
              Text(
                '${percentage.toStringAsFixed(1)}%',
                style: AppTextStyles.labelMd.copyWith(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.space1),
          ClipRRect(
            borderRadius: AppRadius.borderFull,
            child: LinearProgressIndicator(
              value: percentage / 100,
              backgroundColor: AppColors.backgroundSubtle,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: AppSpacing.space1),
          Text(
            _formatCurrency(amount),
            style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildHourlyChartCard() {
    if (_hourlySales.isEmpty) return const SizedBox.shrink();

    final maxSales = _hourlySales.fold<double>(
      0, (max, item) => item['sales'] > max ? item['sales'] as double : max,
    );

    return Container(
      width: double.infinity,
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
              Icon(Icons.bar_chart_rounded, color: AppColors.primaryDefault, size: 24),
              const SizedBox(width: AppSpacing.space2),
              Text(
                'Hourly Sales',
                style: AppTextStyles.headingMd.copyWith(color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.space3),
          SizedBox(
            height: 200,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: maxSales * 1.2,
                barTouchData: BarTouchData(
                  enabled: true,
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (group) => AppColors.primaryDefault,
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      final hour = _hourlySales[groupIndex]['hour'] as int;
                      final sales = _hourlySales[groupIndex]['sales'] as double;
                      return BarTooltipItem(
                        '${_formatHour(hour)}\n${_formatCurrency(sales)}',
                        AppTextStyles.labelSm.copyWith(color: Colors.white),
                      );
                    },
                  ),
                ),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        final index = value.toInt();
                        if (index >= 0 && index < _hourlySales.length) {
                          final hour = _hourlySales[index]['hour'] as int;
                          // Show every 3rd hour to avoid crowding
                          if (hour % 3 == 0) {
                            return Text(
                              _formatHour(hour),
                              style: AppTextStyles.bodyXs.copyWith(color: AppColors.textMuted),
                            );
                          }
                        }
                        return const SizedBox.shrink();
                      },
                      reservedSize: 30,
                    ),
                  ),
                  leftTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                barGroups: _hourlySales.asMap().entries.map((entry) {
                  final index = entry.key;
                  final item = entry.value;
                  final sales = item['sales'] as double;
                  return BarChartGroupData(
                    x: index,
                    barRods: [
                      BarChartRodData(
                        toY: sales,
                        color: AppColors.primaryDefault.withValues(alpha: 0.8),
                        width: 12,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(AppRadius.sm),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopProductsCard() {
    if (_topProducts.isEmpty) {
      return _buildEmptyCard('Top Selling Products', Icons.emoji_events_outlined);
    }

    return Container(
      width: double.infinity,
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
              Icon(Icons.emoji_events_outlined, color: AppColors.primaryDefault, size: 24),
              const SizedBox(width: AppSpacing.space2),
              Text(
                'Top Selling Products',
                style: AppTextStyles.headingMd.copyWith(color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.space4),
          ..._topProducts.asMap().entries.map((entry) {
            final index = entry.key + 1;
            final product = entry.value;
            return _buildProductRow(
              rank: index,
              name: product['product_name'] as String,
              quantity: product['quantity'] as int,
              amount: product['total_amount'] as double,
            );
          }),
        ],
      ),
    );
  }

  Widget _buildProductRow({
    required int rank,
    required String name,
    required int quantity,
    required double amount,
  }) {
    Color rankColor;
    IconData rankIcon;
    
    if (rank == 1) {
      rankColor = const Color(0xFFFFD700); // Gold
      rankIcon = Icons.emoji_events;
    } else if (rank == 2) {
      rankColor = const Color(0xFFC0C0C0); // Silver
      rankIcon = Icons.workspace_premium;
    } else if (rank == 3) {
      rankColor = const Color(0xFFCD7F32); // Bronze
      rankIcon = Icons.military_tech;
    } else {
      rankColor = AppColors.textMuted;
      rankIcon = Icons.circle;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.space3),
      padding: AppSpacing.insetSquishMd,
      decoration: BoxDecoration(
        color: AppColors.backgroundSubtle,
        borderRadius: AppRadius.borderMd,
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: rankColor.withValues(alpha: 0.15),
              borderRadius: AppRadius.borderMd,
            ),
            child: Center(
              child: rank <= 3
                  ? Icon(rankIcon, color: rankColor, size: 18)
                  : Text(
                      rank.toString(),
                      style: AppTextStyles.labelMd.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: AppSpacing.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: AppTextStyles.labelMd.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '$quantity sold',
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          Text(
            _formatCurrency(amount),
            style: AppTextStyles.labelMd.copyWith(
              color: AppColors.primaryDefault,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyCard(String title, IconData icon) {
    return Container(
      width: double.infinity,
      padding: AppSpacing.insetLg,
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        borderRadius: AppRadius.borderLg,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.textMuted, size: 48),
          const SizedBox(height: AppSpacing.space3),
          Text(
            title,
            style: AppTextStyles.headingMd.copyWith(color: AppColors.textPrimary),
          ),
          const SizedBox(height: AppSpacing.space2),
          Text(
            'No data available',
            style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  IconData _getPaymentIcon(String method) {
    final lower = method.toLowerCase();
    if (lower.contains('cash')) return Icons.payments_outlined;
    if (lower.contains('bkash') || lower.contains('mobile')) return Icons.phone_android_outlined;
    if (lower.contains('card') || lower.contains('credit') || lower.contains('debit')) return Icons.credit_card;
    if (lower.contains('bank')) return Icons.account_balance_outlined;
    return Icons.payment;
  }

  Color _getPaymentColor(String method) {
    final lower = method.toLowerCase();
    if (lower.contains('cash')) return AppColors.successDefault;
    if (lower.contains('bkash') || lower.contains('mobile')) return const Color(0xFFE2136C); // bKash pink
    if (lower.contains('card')) return const Color(0xFF1A73E8);
    if (lower.contains('bank')) return const Color(0xFF673AB7);
    return AppColors.primaryDefault;
  }

  String _formatHour(int hour) {
    if (hour == 0) return '12 AM';
    if (hour < 12) return '$hour AM';
    if (hour == 12) return '12 PM';
    return '${hour - 12} PM';
  }

  String _capitalizeFirst(String text) {
    if (text.isEmpty) return text;
    return text[0].toUpperCase() + text.substring(1).toLowerCase();
  }
}
