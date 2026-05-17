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

/// Dashboard screen showing key metrics: sales, orders, low stock, sync status
/// Wired to Supabase RPC for real-time store data
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  String? _error;

  // Dashboard metrics
  double _todaySales = 0.0;
  int _totalOrders = 0;
  int _lowStockCount = 0;
  int _pendingSyncCount = 0;
  DateTime? _lastSyncAt;
  bool _isOnline = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final authProvider = context.read<AuthProvider>();
      final appUser = authProvider.appUser;

      if (appUser == null || appUser.storeId.isEmpty) {
        throw Exception('User store context not found. Please log in again.');
      }

      final storeId = appUser.storeId;

      // Fetch dashboard stats from Supabase RPC
      final statsResp = await _supabase
          .rpc('get_manager_dashboard_stats', params: {'p_store_id': storeId});

      // Fetch sync status
      final syncResp = await _supabase
          .from('offline_sync_queue')
          .select('id')
          .eq('store_id', storeId)
          .eq('status', 'pending')
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _todaySales = (statsResp['today_sales'] as num?)?.toDouble() ?? 0.0;
          _totalOrders = statsResp['total_orders'] as int? ?? 0;
          _lowStockCount = statsResp['low_stock_count'] as int? ?? 0;
          _pendingSyncCount = syncResp.count ?? 0;
          _lastSyncAt = DateTime.now(); // Track last check time
          _isOnline = true;
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Dashboard Error: $e');
      if (mounted) {
        setState(() {
          _isOnline = false;
          _error = 'Failed to load dashboard. Check connection.';
          _loading = false;
        });
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
          title: Text(
            'Dashboard',
            style: AppTextStyles.headingLg,
          ),
          actions: [
            // Online/Offline indicator
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _isOnline
                    ? AppColors.successSubtle
                    : AppColors.dangerSubtle,
                borderRadius: AppRadius.borderFull,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _isOnline
                          ? AppColors.successDefault
                          : AppColors.dangerDefault,
                      borderRadius: AppRadius.borderFull,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _isOnline ? 'Online' : 'Offline',
                    style: AppTextStyles.labelSm.copyWith(
                      color: _isOnline
                          ? AppColors.successDefault
                          : AppColors.dangerDefault,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: _loadDashboardData,
              tooltip: 'Refresh',
            ),
          ],
        ),
        body: _loading
            ? const Center(
                child: CircularProgressIndicator(
                  color: AppColors.primaryDefault,
                ),
              )
            : _error != null && _todaySales == 0 && _totalOrders == 0
                ? _buildErrorState()
                : RefreshIndicator(
                    onRefresh: _loadDashboardData,
                    color: AppColors.primaryDefault,
                    backgroundColor: AppColors.surfaceDefault,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: AppSpacing.insetLg,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Summary Cards Grid
                          _buildSummaryCards(),
                          const SizedBox(height: 24),
                          // Sync Status Card
                          _buildSyncStatusCard(),
                          const SizedBox(height: 24),
                          // Quick Actions
                          _buildQuickActions(),
                        ],
                      ),
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
            Icons.wifi_off_rounded,
            size: 64,
            color: AppColors.textMuted.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            _error!,
            style: AppTextStyles.bodyMd.copyWith(
              color: AppColors.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _loadDashboardData,
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

  Widget _buildSummaryCards() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 600;
        final crossAxisCount = isWide ? 4 : 2;
        final childAspectRatio = isWide ? 1.5 : 1.0;

        return GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: crossAxisCount,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: childAspectRatio,
          children: [
            _MetricCard(
              title: "Today's Sales",
              value: '৳${_formatCurrency(_todaySales)}',
              subtitle: 'Total revenue',
              icon: Icons.payments_rounded,
              color: AppColors.successDefault,
              bgColor: AppColors.successSubtle,
            ),
            _MetricCard(
              title: 'Total Orders',
              value: _totalOrders.toString(),
              subtitle: 'Orders today',
              icon: Icons.receipt_long_rounded,
              color: AppColors.primaryDefault,
              bgColor: AppColors.primarySubtle,
            ),
            _MetricCard(
              title: 'Low Stock',
              value: _lowStockCount.toString(),
              subtitle: 'Items need attention',
              icon: Icons.warning_amber_rounded,
              color: _lowStockCount > 0
                  ? AppColors.warningDefault
                  : AppColors.successDefault,
              bgColor: _lowStockCount > 0
                  ? AppColors.warningSubtle
                  : AppColors.successSubtle,
            ),
            _MetricCard(
              title: 'Pending Sync',
              value: _pendingSyncCount.toString(),
              subtitle: _pendingSyncCount > 0 ? 'Needs sync' : 'All synced',
              icon: Icons.sync_rounded,
              color: _pendingSyncCount > 0
                  ? AppColors.warningDefault
                  : AppColors.successDefault,
              bgColor: _pendingSyncCount > 0
                  ? AppColors.warningSubtle
                  : AppColors.successSubtle,
            ),
          ],
        );
      },
    );
  }

  Widget _buildSyncStatusCard() {
    final lastSyncText = _lastSyncAt != null
        ? 'Last checked: ${_formatTime(_lastSyncAt!)}'
        : 'Not synced yet';

    return Container(
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
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _pendingSyncCount > 0
                      ? AppColors.warningSubtle
                      : AppColors.successSubtle,
                  borderRadius: AppRadius.borderMd,
                ),
                child: Icon(
                  _pendingSyncCount > 0
                      ? Icons.sync_problem_rounded
                      : Icons.cloud_done_rounded,
                  color: _pendingSyncCount > 0
                      ? AppColors.warningDefault
                      : AppColors.successDefault,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sync Status',
                      style: AppTextStyles.labelMd.copyWith(
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _pendingSyncCount > 0
                          ? '$_pendingSyncCount items pending'
                          : 'All data synced',
                      style: AppTextStyles.headingMd.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                lastSyncText,
                style: AppTextStyles.bodySm.copyWith(
                  color: AppColors.textMuted,
                ),
              ),
              if (_pendingSyncCount > 0)
                TextButton.icon(
                  onPressed: () {
                    // Navigate to sync queue or trigger sync
                    _triggerManualSync();
                  },
                  icon: const Icon(Icons.sync_rounded, size: 18),
                  label: const Text('Sync Now'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primaryDefault,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: AppTextStyles.headingMd.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _ActionButton(
                icon: Icons.point_of_sale_rounded,
                label: 'Open POS',
                onTap: () {
                  Navigator.pushNamed(context, '/pos');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ActionButton(
                icon: Icons.inventory_2_rounded,
                label: 'Inventory',
                onTap: () {
                  Navigator.pushNamed(context, '/inventory');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ActionButton(
                icon: Icons.bar_chart_rounded,
                label: 'Reports',
                onTap: () {
                  Navigator.pushNamed(context, '/reports');
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _triggerManualSync() async {
    // Show sync in progress
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Syncing...',
          style: AppTextStyles.labelMd.copyWith(color: Colors.white),
        ),
        backgroundColor: AppColors.primaryDefault,
        duration: const Duration(seconds: 2),
      ),
    );

    // Reload to get updated status
    await _loadDashboardData();
  }

  String _formatCurrency(double value) {
    final formatter = NumberFormat('#,##0.00', 'en_BD');
    return formatter.format(value);
  }

  String _formatTime(DateTime dt) {
    final formatter = DateFormat('h:mm a');
    return formatter.format(dt);
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;
  final Color bgColor;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        borderRadius: AppRadius.borderLg,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: AppRadius.borderMd,
            ),
            child: Icon(
              icon,
              color: color,
              size: 20,
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: AppTextStyles.headingLg.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: AppTextStyles.labelSm.copyWith(
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceDefault,
      borderRadius: AppRadius.borderLg,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderLg,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            borderRadius: AppRadius.borderLg,
            border: Border.all(color: AppColors.borderDefault),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: AppColors.primaryDefault,
                size: 28,
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: AppTextStyles.labelMd.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
