import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../shared/providers/pos_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_radius.dart';

/// Competitor price comparison dashboard
/// Shows our prices vs competitors with alerts for >15% gaps
class CompetitorPriceView extends StatefulWidget {
  const CompetitorPriceView({super.key});

  @override
  State<CompetitorPriceView> createState() => _CompetitorPriceViewState();
}

class _CompetitorPriceViewState extends State<CompetitorPriceView> {
  bool _loading = true;
  List<Map<String, dynamic>> _prices = [];
  List<Map<String, dynamic>> _alerts = [];
  String? _error;
  String _selectedCompetitor = 'all';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);

    try {
      final pos = context.read<PosProvider>();

      final prices = await pos.fetchCompetitorPrices();
      final alerts = await pos.fetchPriceAlerts(threshold: 0.15);

      setState(() {
        _prices = prices;
        _alerts = alerts;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load price data';
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredPrices {
    if (_selectedCompetitor == 'all') return _prices;
    return _prices.where((p) => p['competitor_name'] == _selectedCompetitor).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Competitor Price Monitor'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: CustomScrollView(
                    slivers: [
                      if (_alerts.isNotEmpty) ...[
                        SliverToBoxAdapter(
                          child: _buildAlertsCard(),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 16)),
                      ],
                      SliverToBoxAdapter(
                        child: _buildFilterChips(),
                      ),
                      const SliverToBoxAdapter(child: SizedBox(height: 16)),
                      SliverToBoxAdapter(
                        child: _buildStatsCard(),
                      ),
                      const SliverToBoxAdapter(child: SizedBox(height: 16)),
                      SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final price = _filteredPrices[index];
                            return _PriceComparisonCard(data: price);
                          },
                          childCount: _filteredPrices.length,
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildAlertsCard() {
    return Card(
      margin: const EdgeInsets.all(16),
      color: AppColors.dangerSubtle,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber, color: AppColors.dangerDefault),
                const SizedBox(width: 8),
                Text(
                  '${_alerts.length} Price Alerts',
                  style: AppTextStyles.headingMd.copyWith(color: AppColors.dangerDefault),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Products priced >15% above market average',
              style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            ..._alerts.take(3).map((alert) => _AlertItem(alert: alert)),
            if (_alerts.length > 3)
              TextButton(
                onPressed: () => _showAllAlerts(),
                child: Text('View all ${_alerts.length} alerts'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    final competitors = ['all', ..._prices.map((p) => p['competitor_name'] as String? ?? '').toSet()];

    return SizedBox(
      height: 40,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: competitors.length,
        itemBuilder: (context, index) {
          final competitor = competitors[index];
          final isSelected = _selectedCompetitor == competitor;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(competitor.toUpperCase()),
              selected: isSelected,
              onSelected: (_) => setState(() => _selectedCompetitor = competitor),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsCard() {
    final competitorStats = <String, int>{};
    for (final p in _prices) {
      final name = p['competitor_name'] as String? ?? 'unknown';
      competitorStats[name] = (competitorStats[name] ?? 0) + 1;
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Price Tracking Summary', style: AppTextStyles.headingMd),
            const SizedBox(height: 12),
            Row(
              children: [
                _StatBox(
                  label: 'Products Tracked',
                  value: _prices.length.toString(),
                ),
                _StatBox(
                  label: 'Active Alerts',
                  value: _alerts.length.toString(),
                  color: _alerts.isNotEmpty ? AppColors.dangerDefault : null,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text('By Competitor:', style: AppTextStyles.bodySm),
            const SizedBox(height: 4),
            Wrap(
              spacing: 8,
              children: competitorStats.entries.map((e) {
                return Chip(
                  label: Text('${e.key}: ${e.value}'),
                  backgroundColor: AppColors.surfaceDefault,
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  void _showAllAlerts() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        builder: (_, controller) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'All Price Alerts',
                style: AppTextStyles.headingMd,
              ),
            ),
            Expanded(
              child: ListView.builder(
                controller: controller,
                itemCount: _alerts.length,
                itemBuilder: (context, index) => _AlertItem(alert: _alerts[index]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PriceComparisonCard extends StatelessWidget {
  final Map<String, dynamic> data;

  const _PriceComparisonCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final gapPercent = (data['price_gap_percent'] as num?)?.toDouble() ?? 0;
    final isHigher = gapPercent > 0.15;
    final isLower = gapPercent < -0.15;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        title: Text(data['product_name'] ?? 'Unknown', style: AppTextStyles.bodyMd),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Competitor: ৳${(data['competitor_price'] as num?)?.toStringAsFixed(2) ?? '0'}'),
            if (data['our_price'] != null)
              Text('Our Price: ৳${(data['our_price'] as num).toStringAsFixed(2)}'),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${(gapPercent * 100).toStringAsFixed(1)}%',
              style: AppTextStyles.bodyMd.copyWith(
                color: isHigher
                    ? AppColors.dangerDefault
                    : isLower
                        ? AppColors.successDefault
                        : AppColors.textSecondary,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              isHigher ? 'Above Market' : isLower ? 'Below Market' : 'Aligned',
              style: AppTextStyles.bodyXs.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

class _AlertItem extends StatelessWidget {
  final Map<String, dynamic> alert;

  const _AlertItem({required this.alert});

  @override
  Widget build(BuildContext context) {
    final ourPrice = (alert['our_price'] as num?)?.toDouble() ?? 0;
    final marketPrice = (alert['market_avg_price'] as num?)?.toDouble() ?? 0;
    final gapPercent = (alert['price_gap_percent'] as num?)?.toDouble() ?? 0;

    return ListTile(
      dense: true,
      leading: Icon(Icons.trending_up, color: AppColors.dangerDefault),
      title: Text(alert['product_name'] ?? 'Unknown', style: AppTextStyles.bodySm),
      subtitle: Text(
        'Our: ৳${ourPrice.toStringAsFixed(2)} | Market: ৳${marketPrice.toStringAsFixed(2)}',
        style: AppTextStyles.bodyXs,
      ),
      trailing: Text(
        '+${(gapPercent * 100).toStringAsFixed(0)}%',
        style: AppTextStyles.bodySm.copyWith(
          color: AppColors.dangerDefault,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _StatBox({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: AppColors.surfaceDefault,
          borderRadius: AppRadius.borderSm,
        ),
        child: Column(
          children: [
            Text(
              value,
              style: AppTextStyles.headingMd.copyWith(color: color ?? AppColors.primaryDefault),
            ),
            Text(label, style: AppTextStyles.bodyXs),
          ],
        ),
      ),
    );
  }
}
