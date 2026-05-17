import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CloseRiskAnalyticsScreen extends StatefulWidget {
  const CloseRiskAnalyticsScreen({super.key});

  @override
  State<CloseRiskAnalyticsScreen> createState() => _CloseRiskAnalyticsScreenState();
}

class _CloseRiskAnalyticsScreenState extends State<CloseRiskAnalyticsScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  String? _error;

  DateTime? _fromDate;
  DateTime? _toDate;
  String? _selectedStoreId;
  String? _selectedManagerId;

  List<Map<String, dynamic>> _stores = const [];
  List<Map<String, dynamic>> _managers = const [];
  Map<String, dynamic> _analytics = const {};
  Map<String, dynamic> _governance = const {};

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _fromDate = DateTime(now.year, now.month, 1);
    _toDate = now;
    _loadFiltersAndAnalytics();
  }

  Future<void> _loadFiltersAndAnalytics() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stores = await _supabase.from('stores').select('id, name').order('name');
      final managers = await _supabase
          .from('users')
          .select('id, full_name, name, role')
          .inFilter('role', ['manager', 'admin', 'owner'])
          .order('full_name');
      _stores = List<Map<String, dynamic>>.from(stores as List);
      _managers = List<Map<String, dynamic>>.from(managers as List);
      await _loadAnalytics();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to load risk analytics.';
        _loading = false;
      });
    }
  }

  Future<void> _loadAnalytics() async {
    try {
      final resp = await _supabase.rpc(
        'get_close_risk_analytics',
        params: {
          'p_store_id': _selectedStoreId,
          'p_manager_user_id': _selectedManagerId,
          'p_from': _fromDate == null ? null : DateFormat('yyyy-MM-dd').format(_fromDate!),
          'p_to': _toDate == null ? null : DateFormat('yyyy-MM-dd').format(_toDate!),
        },
      );
      final governanceResp = await _supabase.rpc(
        'get_monthly_governance_scorecard',
        params: {
          'p_store_id': _selectedStoreId,
          'p_manager_user_id': _selectedManagerId,
          'p_month': _toDate == null
              ? null
              : DateFormat('yyyy-MM-01').format(_toDate!),
        },
      );
      if (!mounted) return;
      setState(() {
        _analytics = Map<String, dynamic>.from(resp as Map);
        _governance = Map<String, dynamic>.from(governanceResp as Map);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to fetch close risk analytics.';
        _loading = false;
      });
    }
  }

  Future<void> _pickDate({required bool from}) async {
    final initial = from ? (_fromDate ?? DateTime.now()) : (_toDate ?? DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      if (from) {
        _fromDate = picked;
      } else {
        _toDate = picked;
      }
    });
    await _loadAnalytics();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('Close Risk Analytics'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFE8B84B)))
          : _error != null
              ? Center(
                  child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                )
              : RefreshIndicator(
                  onRefresh: _loadAnalytics,
                  child: ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      _filters(),
                      const SizedBox(height: 10),
                      _metric(
                        '% red closes this month',
                        '${((_analytics['red_closes_percent'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)}%',
                        const Color(0xFFE74C3C),
                      ),
                      _metric(
                        'Average pending queue at close',
                        ((_analytics['average_pending_queue_at_close'] as num?)?.toDouble() ?? 0).toStringAsFixed(2),
                        const Color(0xFFE8B84B),
                      ),
                      _metric(
                        'Total admin overrides',
                        '${(_analytics['override_total'] as num?)?.toInt() ?? 0}',
                        const Color(0xFF9B59B6),
                      ),
                      _metric(
                        'Blank/weak override reasons',
                        '${(_analytics['weak_reason_count'] as num?)?.toInt() ?? 0}',
                        const Color(0xFFE67E22),
                      ),
                      const SizedBox(height: 12),
                      _governanceScorecard(),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Repeated conflict stores',
                        rows: List<Map<String, dynamic>>.from(
                          _analytics['repeated_conflict_stores'] as List? ?? const [],
                        ),
                        empty: 'No repeated conflict stores in selected window.',
                        lineBuilder: (row) =>
                            '${row['store_name'] ?? 'Store'} - ${row['conflict_close_count'] ?? 0} closes with conflicts',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Managers with most risky closes',
                        rows: List<Map<String, dynamic>>.from(
                          _analytics['managers_with_most_risky_closes'] as List? ?? const [],
                        ),
                        empty: 'No risky close managers in selected window.',
                        lineBuilder: (row) =>
                            '${row['reviewer_name'] ?? 'Manager'} - risky ${row['risky_close_count'] ?? 0}, red ${row['red_close_count'] ?? 0}',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Overrides by user',
                        rows: List<Map<String, dynamic>>.from(
                          _analytics['overrides_by_user'] as List? ?? const [],
                        ),
                        empty: 'No overrides recorded in selected window.',
                        lineBuilder: (row) =>
                            '${row['reviewer_name'] ?? 'User'} - ${row['override_count'] ?? 0}',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Overrides by store',
                        rows: List<Map<String, dynamic>>.from(
                          _analytics['overrides_by_store'] as List? ?? const [],
                        ),
                        empty: 'No store override data.',
                        lineBuilder: (row) =>
                            '${row['store_name'] ?? 'Store'} - ${row['override_count'] ?? 0}',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Overrides by reason category',
                        rows: List<Map<String, dynamic>>.from(
                          _analytics['overrides_by_reason_category'] as List? ?? const [],
                        ),
                        empty: 'No reason category data.',
                        lineBuilder: (row) =>
                            '${row['reason_category'] ?? 'other'} - ${row['override_count'] ?? 0}',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Override frequency trend',
                        rows: List<Map<String, dynamic>>.from(
                          _analytics['override_frequency_trend'] as List? ?? const [],
                        ),
                        empty: 'No trend points available.',
                        lineBuilder: (row) =>
                            '${row['period'] ?? ''}: ${row['override_count'] ?? 0}',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Repeat offenders (users)',
                        rows: List<Map<String, dynamic>>.from(
                          (_analytics['repeat_offenders'] as Map<String, dynamic>? ?? const {})['users']
                              as List? ??
                              const [],
                        ),
                        empty: 'No repeat offender users.',
                        lineBuilder: (row) =>
                            '${row['reviewer_name'] ?? 'User'} - ${row['override_count'] ?? 0} overrides',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Repeat offenders (stores)',
                        rows: List<Map<String, dynamic>>.from(
                          (_analytics['repeat_offenders'] as Map<String, dynamic>? ?? const {})['stores']
                              as List? ??
                              const [],
                        ),
                        empty: 'No repeat offender stores.',
                        lineBuilder: (row) =>
                            '${row['store_name'] ?? 'Store'} - ${row['override_count'] ?? 0} overrides',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Anomaly: same admin > 5/month',
                        rows: List<Map<String, dynamic>>.from(
                          (_analytics['anomalies'] as Map<String, dynamic>? ?? const {})[
                                  'admins_over_monthly_threshold']
                              as List? ??
                              const [],
                        ),
                        empty: 'No admin threshold anomalies.',
                        lineBuilder: (row) =>
                            '${row['reviewer_name'] ?? 'Admin'} (${row['month'] ?? ''}) - ${row['override_count'] ?? 0}',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Anomaly: same store > 3/month',
                        rows: List<Map<String, dynamic>>.from(
                          (_analytics['anomalies'] as Map<String, dynamic>? ?? const {})[
                                  'stores_over_monthly_threshold']
                              as List? ??
                              const [],
                        ),
                        empty: 'No store threshold anomalies.',
                        lineBuilder: (row) =>
                            '${row['store_name'] ?? 'Store'} (${row['month'] ?? ''}) - ${row['override_count'] ?? 0}',
                      ),
                      const SizedBox(height: 12),
                      _listSection(
                        title: 'Anomaly: blank/weak reasons',
                        rows: List<Map<String, dynamic>>.from(
                          (_analytics['anomalies'] as Map<String, dynamic>? ?? const {})[
                                  'blank_or_weak_reasons']
                              as List? ??
                              const [],
                        ),
                        empty: 'No blank/weak reason anomalies.',
                        lineBuilder: (row) =>
                            '${row['reviewer_name'] ?? 'Admin'} @ ${row['store_name'] ?? 'Store'} - ${row['override_reason'] ?? '(blank)'}',
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _governanceScorecard() {
    final trend =
        _governance['risk_trend_improvement'] as Map<String, dynamic>? ?? const {};
    final improvement = (trend['improvement_percent_points'] as num?)?.toDouble() ?? 0;
    final trendColor = improvement >= 0 ? const Color(0xFF2ECC71) : const Color(0xFFE74C3C);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Monthly Governance Scorecard (${_governance['month'] ?? ''})',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Risk trend improvement: ${improvement.toStringAsFixed(2)} pp '
            '(current ${(trend['current_red_close_percent'] as num?)?.toDouble().toStringAsFixed(2) ?? '0.00'}% vs previous ${(trend['previous_red_close_percent'] as num?)?.toDouble().toStringAsFixed(2) ?? '0.00'}%)',
            style: TextStyle(color: trendColor, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 10),
          _compactList(
            title: 'Stores with most overrides',
            rows: List<Map<String, dynamic>>.from(
              _governance['stores_with_most_overrides'] as List? ?? const [],
            ),
            empty: 'No store override data for this month.',
            lineBuilder: (row) => '${row['store_name'] ?? 'Store'} - ${row['override_count'] ?? 0}',
          ),
          const SizedBox(height: 8),
          _compactList(
            title: 'Managers needing coaching',
            rows: List<Map<String, dynamic>>.from(
              _governance['managers_needing_coaching'] as List? ?? const [],
            ),
            empty: 'No managers flagged this month.',
            lineBuilder: (row) =>
                '${row['reviewer_name'] ?? 'Manager'} - risky ${row['risky_close_count'] ?? 0}, overrides ${row['override_count'] ?? 0}',
          ),
          const SizedBox(height: 8),
          _compactList(
            title: 'Admins overriding too often',
            rows: List<Map<String, dynamic>>.from(
              _governance['admins_overriding_too_often'] as List? ?? const [],
            ),
            empty: 'No admins above monthly threshold.',
            lineBuilder: (row) =>
                '${row['reviewer_name'] ?? 'Admin'} - ${row['override_count'] ?? 0} (limit ${row['threshold'] ?? 5})',
          ),
          const SizedBox(height: 8),
          _compactList(
            title: 'Reasons breakdown',
            rows: List<Map<String, dynamic>>.from(
              _governance['reasons_breakdown'] as List? ?? const [],
            ),
            empty: 'No reason data this month.',
            lineBuilder: (row) =>
                '${row['reason_category'] ?? 'unspecified'} - ${row['override_count'] ?? 0}',
          ),
        ],
      ),
    );
  }

  Widget _compactList({
    required String title,
    required List<Map<String, dynamic>> rows,
    required String empty,
    required String Function(Map<String, dynamic>) lineBuilder,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        if (rows.isEmpty)
          Text(empty, style: const TextStyle(color: Colors.white54))
        else
          ...rows.take(5).map(
                (row) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    '• ${lineBuilder(row)}',
                    style: const TextStyle(color: Colors.white70),
                  ),
                ),
              ),
      ],
    );
  }

  Widget _filters() {
    final dateFmt = DateFormat('MMM dd, yyyy');
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _pickDate(from: true),
                  child: Text(
                    _fromDate == null ? 'From' : dateFmt.format(_fromDate!),
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _pickDate(from: false),
                  child: Text(
                    _toDate == null ? 'To' : dateFmt.format(_toDate!),
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String?>(
            value: _selectedStoreId,
            dropdownColor: const Color(0xFF161B22),
            decoration: const InputDecoration(
              labelText: 'Store',
              labelStyle: TextStyle(color: Colors.white70),
            ),
            items: [
              const DropdownMenuItem<String?>(
                value: null,
                child: Text('All stores', style: TextStyle(color: Colors.white)),
              ),
              ..._stores.map(
                (s) => DropdownMenuItem<String?>(
                  value: s['id'] as String,
                  child: Text(
                    s['name'] as String? ?? 'Store',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ],
            onChanged: (value) async {
              setState(() => _selectedStoreId = value);
              await _loadAnalytics();
            },
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String?>(
            value: _selectedManagerId,
            dropdownColor: const Color(0xFF161B22),
            decoration: const InputDecoration(
              labelText: 'Manager',
              labelStyle: TextStyle(color: Colors.white70),
            ),
            items: [
              const DropdownMenuItem<String?>(
                value: null,
                child: Text('All managers', style: TextStyle(color: Colors.white)),
              ),
              ..._managers.map(
                (u) => DropdownMenuItem<String?>(
                  value: u['id'] as String,
                  child: Text(
                    (u['full_name'] as String?) ?? (u['name'] as String?) ?? 'Manager',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ],
            onChanged: (value) async {
              setState(() => _selectedManagerId = value);
              await _loadAnalytics();
            },
          ),
        ],
      ),
    );
  }

  Widget _metric(String label, String value, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: const TextStyle(color: Colors.white)),
          ),
          Text(
            value,
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _listSection({
    required String title,
    required List<Map<String, dynamic>> rows,
    required String empty,
    required String Function(Map<String, dynamic>) lineBuilder,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          if (rows.isEmpty)
            Text(empty, style: const TextStyle(color: Colors.white54))
          else
            ...rows.map(
              (row) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  '• ${lineBuilder(row)}',
                  style: const TextStyle(color: Colors.white70),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
