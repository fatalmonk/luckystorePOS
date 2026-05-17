import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../models/close_review_log.dart';

class ClosingHistoryScreen extends StatefulWidget {
  const ClosingHistoryScreen({super.key});

  @override
  State<ClosingHistoryScreen> createState() => _ClosingHistoryScreenState();
}

class _ClosingHistoryScreenState extends State<ClosingHistoryScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  String? _error;

  DateTime? _fromDate;
  DateTime? _toDate;
  String? _selectedStoreId;
  String? _selectedManagerId;

  List<CloseReviewLog> _rows = const [];
  List<Map<String, dynamic>> _stores = const [];
  List<Map<String, dynamic>> _managers = const [];

  @override
  void initState() {
    super.initState();
    _fromDate = DateTime.now().subtract(const Duration(days: 30));
    _toDate = DateTime.now();
    _loadFiltersAndData();
  }

  Future<void> _loadFiltersAndData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stores = await _supabase
          .from('stores')
          .select('id, name')
          .order('name');
      final managers = await _supabase
          .from('users')
          .select('id, full_name, name, role')
          .inFilter('role', ['manager', 'admin', 'owner'])
          .order('full_name');
      _stores = List<Map<String, dynamic>>.from(stores as List);
      _managers = List<Map<String, dynamic>>.from(managers as List);
      await _loadHistory();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to load close review history.';
        _loading = false;
      });
    }
  }

  Future<void> _loadHistory() async {
    try {
      var query = _supabase.from('close_review_log').select();
      if (_selectedStoreId != null && _selectedStoreId!.isNotEmpty) {
        query = query.eq('store_id', _selectedStoreId!);
      }
      if (_selectedManagerId != null && _selectedManagerId!.isNotEmpty) {
        query = query.eq('reviewer_user_id', _selectedManagerId!);
      }
      if (_fromDate != null) {
        query = query.gte(
          'reviewed_at',
          DateTime(_fromDate!.year, _fromDate!.month, _fromDate!.day)
              .toIso8601String(),
        );
      }
      if (_toDate != null) {
        query = query.lt(
          'reviewed_at',
          DateTime(_toDate!.year, _toDate!.month, _toDate!.day + 1)
              .toIso8601String(),
        );
      }
      final data = await query.order('reviewed_at', ascending: false).limit(200);
      final rows = List<Map<String, dynamic>>.from(data as List);
      final storeNameById = {
        for (final s in _stores) (s['id'] as String): (s['name'] as String? ?? 'Store')
      };
      final managerNameById = {
        for (final u in _managers)
          (u['id'] as String):
              (u['full_name'] as String?) ?? (u['name'] as String?) ?? 'Manager'
      };
      final parsed = rows
          .map((e) => CloseReviewLog.fromJson({
                ...e,
                'store_name': storeNameById[e['store_id'] as String? ?? ''],
                'reviewer_name': managerNameById[e['reviewer_user_id'] as String? ?? ''],
              }))
          .toList();
      if (!mounted) return;
      setState(() {
        _rows = parsed;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load closing history records.';
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
    await _loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('Closing History'),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFE8B84B)),
            )
          : _error != null
              ? Center(
                  child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                )
              : Column(
                  children: [
                    _buildFilters(),
                    const Divider(color: Colors.white10, height: 1),
                    Expanded(
                      child: _rows.isEmpty
                          ? const Center(
                              child: Text(
                                'No close reviews found for selected filters.',
                                style: TextStyle(color: Colors.white54),
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(12),
                              itemCount: _rows.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 10),
                              itemBuilder: (context, index) {
                                final row = _rows[index];
                                return _historyCard(row);
                              },
                            ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildFilters() {
    final dateFmt = DateFormat('MMM dd, yyyy');
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickDate(from: true),
                  icon: const Icon(Icons.date_range, color: Colors.white70),
                  label: Text(
                    _fromDate == null ? 'From date' : dateFmt.format(_fromDate!),
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickDate(from: false),
                  icon: const Icon(Icons.date_range, color: Colors.white70),
                  label: Text(
                    _toDate == null ? 'To date' : dateFmt.format(_toDate!),
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String?>(
                  dropdownColor: const Color(0xFF161B22),
                  value: _selectedStoreId,
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
                    await _loadHistory();
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String?>(
                  dropdownColor: const Color(0xFF161B22),
                  value: _selectedManagerId,
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
                          (u['full_name'] as String?) ??
                              (u['name'] as String?) ??
                              'Manager',
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                  onChanged: (value) async {
                    setState(() => _selectedManagerId = value);
                    await _loadHistory();
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _historyCard(CloseReviewLog row) {
    final color = switch (row.closeStatus) {
      'green' => const Color(0xFF2ECC71),
      'yellow' => const Color(0xFFE8B84B),
      _ => const Color(0xFFE74C3C),
    };
    final unresolved = row.queuePendingCount + row.failedCount + row.conflictCount;
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
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Text(
                row.closeStatus.toUpperCase(),
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                DateFormat('MMM dd, hh:mm a').format(row.reviewedAt.toLocal()),
                style: const TextStyle(color: Colors.white54, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Approved by: ${row.reviewerName ?? row.reviewerUserId} (${row.reviewerRole})',
            style: const TextStyle(color: Colors.white),
          ),
          Text(
            'Store: ${row.storeName ?? row.storeId}',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
          Text(
            'Unresolved risks at close: $unresolved (queue ${row.queuePendingCount}, failed ${row.failedCount}, conflict ${row.conflictCount})',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
          if (row.adminOverride) ...[
            const SizedBox(height: 6),
            Text(
              'Admin override category: ${row.overrideReasonCategory ?? row.overrideReason ?? 'Not captured'}',
              style: const TextStyle(color: Color(0xFFE8B84B), fontSize: 12),
            ),
            if (row.dualApprovalRequired)
              Text(
                'Dual approval: yes (${row.secondaryApproverRole ?? 'second approver'} verified)',
                style: const TextStyle(color: Color(0xFFE8B84B), fontSize: 12),
              ),
            if ((row.overrideNotes ?? '').trim().isNotEmpty)
              Text(
                'Override notes: ${row.overrideNotes}',
                style: const TextStyle(color: Color(0xFFE8B84B), fontSize: 12),
              ),
          ],
          if ((row.notes ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Notes: ${row.notes}',
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }
}
