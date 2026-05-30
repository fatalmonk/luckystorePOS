import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../sales/offline_transaction_sync_service.dart';
import '../../../sales/conflict_resolver.dart';
import './sync_audit_screen.dart';

enum SyncQueueFilter { all, pending, failed, conflict }

/// Enhanced Sync Queue Screen with conflict resolution UI and dashboard stats
class EnhancedSyncQueueScreen extends StatefulWidget {
  const EnhancedSyncQueueScreen({super.key});

  @override
  State<EnhancedSyncQueueScreen> createState() => _EnhancedSyncQueueScreenState();
}

class _EnhancedSyncQueueScreenState extends State<EnhancedSyncQueueScreen> {
  final _sync = OfflineTransactionSyncService.instance;
  final Set<String> _selected = <String>{};
  SyncQueueFilter _filter = SyncQueueFilter.all;
  bool _busy = false;
  final _pinController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _sync.addListener(_onSyncUpdate);
  }

  @override
  void dispose() {
    _sync.removeListener(_onSyncUpdate);
    _pinController.dispose();
    super.dispose();
  }

  void _onSyncUpdate() {
    if (!mounted) return;
    setState(() {
      // Remove selected items that no longer exist in queue
      _selected.removeWhere((id) => !_sync.queue.any((q) => q.clientTransactionId == id));
    });
  }

  SyncActionActor _actor(AuthProvider auth) => SyncActionActor(
    userId: auth.appUser?.id ?? 'unknown',
    role: auth.appUser?.role ?? 'unknown',
    device: '${Platform.operatingSystem}-${Platform.localHostname}',
  );

  Future<void> _run(Future<void> Function() action, {String? successMsg}) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      if (mounted && successMsg != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(successMsg)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Action failed: $e'), backgroundColor: AppColors.dangerDefault),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Request manager PIN for sensitive operations
  Future<bool> _requestManagerAuth() async {
    final auth = context.read<AuthProvider>();
    final role = auth.appUser?.role ?? '';
    
    // Admin/Manager skip PIN
    if (role == 'admin' || role == 'manager') return true;
    
    // Cashier needs manager PIN
    _pinController.clear();
    final pin = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceDefault,
        title: const Text('Manager Authorization', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter manager PIN to proceed:', style: TextStyle(color: Colors.white70)),
            const SizedBox(height: 16),
            TextField(
              controller: _pinController,
              keyboardType: TextInputType.number,
              obscureText: true,
              maxLength: 6,
              style: const TextStyle(color: Colors.white, fontSize: 24, letterSpacing: 8),
              decoration: InputDecoration(
                filled: true,
                fillColor: AppColors.backgroundDefault,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                counterText: '',
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, null),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, _pinController.text),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDefault),
            child: const Text('Authorize', style: TextStyle(color: Colors.black)),
          ),
        ],
      ),
    );
    
    if (pin == null || pin.isEmpty) return false;
    
    // Validate via AuthProvider
    return await auth.signInWithPin(pin);
  }

  /// Show conflict resolution dialog
  Future<void> _showConflictResolver(QueuedOfflineTransaction tx) async {
    final resolution = await showDialog<ResolutionStrategy>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceDefault,
        title: Row(
          children: [
            Icon(Icons.warning_amber, color: AppColors.dangerDefault),
            const SizedBox(width: 8),
            const Text('Conflict Detected', style: TextStyle(color: Colors.white)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Transaction ID: ${tx.clientTransactionId.substring(0, 16)}...', 
              style: TextStyle(color: Colors.white70, fontSize: 12)),
            const SizedBox(height: 16),
            Text('Conflict: ${tx.conflictType ?? 'Unknown'}', 
              style: TextStyle(color: Colors.white)),
            if (tx.lastError != null) ...[
              const SizedBox(height: 8),
              Text('Details: ${tx.lastError}', 
                style: TextStyle(color: Colors.orange, fontSize: 13)),
            ],
            const SizedBox(height: 24),
            const Text('Choose resolution:', style: TextStyle(color: Colors.white70)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, ResolutionStrategy.acceptLocal),
            child: const Text('Keep Local', style: TextStyle(color: Colors.blue)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, ResolutionStrategy.acceptServer),
            child: const Text('Use Server', style: TextStyle(color: Colors.orange)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, ResolutionStrategy.cancel),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.dangerDefault),
            child: const Text('Cancel Transaction'),
          ),
        ],
      ),
    );
    
    if (resolution == null) return;
    
    if (resolution == ResolutionStrategy.cancel) {
      await _run(() => _sync.deleteCorruptedItem(
        clientTransactionId: tx.clientTransactionId,
        actor: _actor(context.read<AuthProvider>()),
      ), successMsg: 'Transaction cancelled');
      return;
    }
    
    // For keep local/use server, mark for retry
    await _run(() => _sync.acknowledgeConflict(
      clientTransactionId: tx.clientTransactionId,
      actor: _actor(context.read<AuthProvider>()),
    ), successMsg: 'Conflict acknowledged - will retry');
    
    // Trigger immediate retry
    await _sync.triggerSync();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final role = auth.appUser?.role ?? 'unknown';
    final isCashier = role == 'cashier';
    final isManager = role == 'manager' || role == 'admin';
    
    final stats = _sync.dashboardStats();
    final telemetry = _sync.telemetry;
    final queue = _filtered(_sync.queue);
    
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceDefault,
        title: Text('Sync Queue (${role.toUpperCase()})'),
        actions: [
          IconButton(
            icon: const Icon(Icons.assessment_outlined),
            tooltip: 'Audit Logs',
            onPressed: () => Navigator.push(
              context, 
              MaterialPageRoute(builder: (_) => const SyncAuditScreen()),
            ),
          ),
          IconButton(
            icon: _isSyncing() 
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.sync),
            tooltip: 'Force Sync Now',
            onPressed: (_busy || isCashier) 
              ? null 
              : () => _run(() => _sync.forceSyncNow(actor: _actor(auth)), successMsg: 'Sync started'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => await _sync.triggerSync(),
        child: Column(
          children: [
            // Stats Dashboard
            _buildStatsDashboard(stats, telemetry),
            // Filters
            _buildFilters(),
            // Action Buttons
            _buildActionBar(isManager, auth),
            // Queue List
            Expanded(
              child: queue.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: queue.length,
                    itemBuilder: (_, index) => _buildTransactionCard(queue[index], isManager),
                  ),
            ),
          ],
        ),
      ),
    );
  }

  bool _isSyncing() => _sync.telemetry.currentlyProcessing;

  Widget _buildStatsDashboard(OfflineSyncDashboardStats stats, OfflineSyncWorkerTelemetry telemetry) {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        borderRadius: AppRadius.borderLg,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _statTile('Queued', stats.queuedSalesCount.toString(), Icons.queue)),
              Expanded(child: _statTile('Synced Today', stats.syncedToday.toString(), Icons.check_circle)),
              Expanded(child: _statTile('Failed', stats.failedSyncs.toString(), Icons.error, isError: stats.failedSyncs > 0)),
              Expanded(child: _statTile('Conflicts', stats.conflictsNeedingReview.toString(), Icons.warning, isError: stats.conflictsNeedingReview > 0)),
            ],
          ),
          if (stats.oldestPendingSaleAge != null) ...[
            const Divider(height: 24),
            Row(
              children: [
                Icon(Icons.schedule, size: 16, color: AppColors.textMuted),
                const SizedBox(width: 8),
                Text(
                  'Oldest pending: ${_formatDuration(stats.oldestPendingSaleAge!)}',
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                ),
                const Spacer(),
                if (telemetry.lastSuccessAt != null)
                  Text(
                    'Last sync: ${_formatAge(telemetry.lastSuccessAt!)}',
                    style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _statTile(String label, String value, IconData icon, {bool isError = false}) {
    return Column(
      children: [
        Icon(icon, color: isError ? AppColors.dangerDefault : AppColors.primaryDefault, size: 24),
        const SizedBox(height: 8),
        Text(value, style: AppTextStyles.bodySm.copyWith(color: isError ? AppColors.dangerDefault : Colors.white, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(label, style: AppTextStyles.bodyXs.copyWith(color: AppColors.textMuted)),
      ],
    );
  }

  String _formatDuration(Duration d) {
    if (d.inHours >= 24) return '${d.inDays}d ${d.inHours % 24}h';
    if (d.inHours >= 1) return '${d.inHours}h ${d.inMinutes % 60}m';
    if (d.inMinutes >= 1) return '${d.inMinutes}m';
    return '${d.inSeconds}s';
  }

  String _formatAge(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inHours >= 1) return '${diff.inHours}h ago';
    if (diff.inMinutes >= 1) return '${diff.inMinutes}m ago';
    return 'just now';
  }

  Widget _buildFilters() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _filterChip('All', SyncQueueFilter.all),
            _filterChip('Pending', SyncQueueFilter.pending),
            _filterChip('Failed', SyncQueueFilter.failed),
            _filterChip('Conflict', SyncQueueFilter.conflict),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label, SyncQueueFilter filter) {
    final isSelected = _filter == filter;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => setState(() => _filter = filter),
        labelStyle: TextStyle(color: isSelected ? Colors.black : AppColors.textMuted),
        selectedColor: AppColors.primaryDefault,
        backgroundColor: AppColors.surfaceDefault,
      ),
    );
  }

  Widget _buildActionBar(bool isManager, AuthProvider auth) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          ElevatedButton.icon(
            onPressed: (_busy || _selected.isEmpty) 
              ? null 
              : () => _run(() => _sync.retrySelected(
                  _selected.toList(), 
                  actor: _actor(auth),
                ), successMsg: '${_selected.length} items queued for retry'),
            icon: const Icon(Icons.replay, size: 18),
            label: Text('Retry ($_selected)'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDefault,
              foregroundColor: Colors.black,
            ),
          ),
          OutlinedButton.icon(
            onPressed: (_busy || !isManager) 
              ? null 
              : () => _run(() => _sync.retryAllFailed(actor: _actor(auth)), 
                  successMsg: 'All failed items retried'),
            icon: const Icon(Icons.restart_alt, size: 18),
            label: const Text('Retry All Failed'),
          ),
          if (isManager)
            OutlinedButton.icon(
              onPressed: (_busy || _selected.length != 1) 
                ? null 
                : () async {
                    final tx = _sync.queue.firstWhere(
                      (q) => q.clientTransactionId == _selected.first,
                    );
                    if (tx.state == OfflineSyncState.conflict) {
                      await _showConflictResolver(tx);
                    } else {
                      await _run(() => _sync.acknowledgeConflict(
                        clientTransactionId: _selected.first,
                        actor: _actor(auth),
                      ), successMsg: 'Conflict acknowledged');
                    }
                  },
              icon: const Icon(Icons.rule, size: 18),
              label: const Text('Resolve'),
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_done, size: 64, color: AppColors.successDefault.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          Text('All caught up!', style: AppTextStyles.headingMd),
          const SizedBox(height: 8),
          Text('No pending transactions to sync', style: AppTextStyles.bodyMd.copyWith(color: AppColors.textMuted)),
        ],
      ),
    );
  }

  Widget _buildTransactionCard(QueuedOfflineTransaction tx, bool isManager) {
    final isSelected = _selected.contains(tx.clientTransactionId);
    final age = DateTime.now().difference(tx.createdAt);
    
    Color statusColor;
    IconData statusIcon;
    switch (tx.state) {
      case OfflineSyncState.pending:
        statusColor = AppColors.primaryDefault;
        statusIcon = Icons.schedule;
        break;
      case OfflineSyncState.syncing:
        statusColor = Colors.blue;
        statusIcon = Icons.sync;
        break;
      case OfflineSyncState.synced:
        statusColor = AppColors.successDefault;
        statusIcon = Icons.check_circle;
        break;
      case OfflineSyncState.failed:
        statusColor = AppColors.dangerDefault;
        statusIcon = Icons.error;
        break;
      case OfflineSyncState.conflict:
        statusColor = Colors.orange;
        statusIcon = Icons.warning;
        break;
    }

    return Card(
      color: isSelected ? AppColors.primaryDefault.withValues(alpha: 0.1) : AppColors.surfaceDefault,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.borderMd,
        side: BorderSide(
          color: tx.state == OfflineSyncState.conflict 
            ? Colors.orange 
            : isSelected ? AppColors.primaryDefault : AppColors.borderDefault,
        ),
      ),
      child: InkWell(
        onTap: () => _showTransactionDetails(tx),
        borderRadius: AppRadius.borderMd,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Checkbox(
                value: isSelected,
                onChanged: (v) {
                  setState(() {
                    if (v == true) {
                      _selected.add(tx.clientTransactionId);
                    } else {
                      _selected.remove(tx.clientTransactionId);
                    }
                  });
                },
                activeColor: AppColors.primaryDefault,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(statusIcon, color: statusColor, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          tx.clientTransactionId.substring(0, 12),
                          style: AppTextStyles.labelMd.copyWith(
                            fontFamily: 'monospace',
                            color: AppColors.textMuted,
                          ),
                        ),
                        const Spacer(),
                        _statusBadge(tx.state),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.schedule, size: 14, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Text(_formatDuration(age), style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted)),
                        const SizedBox(width: 16),
                        Icon(Icons.receipt, size: 14, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Text('${tx.items.length} items', style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted)),
                        if (tx.retryCount > 0) ...[
                          const SizedBox(width: 16),
                          Icon(Icons.repeat, size: 14, color: AppColors.dangerDefault),
                          const SizedBox(width: 4),
                          Text('${tx.retryCount} retries', 
                            style: AppTextStyles.bodySm.copyWith(color: AppColors.dangerDefault)),
                        ],
                      ],
                    ),
                    if (tx.lastError != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        tx.lastError!.length > 60 
                          ? '${tx.lastError!.substring(0, 60)}...' 
                          : tx.lastError!,
                        style: AppTextStyles.bodyXs.copyWith(color: AppColors.dangerDefault),
                      ),
                    ],
                  ],
                ),
              ),
              if (tx.state == OfflineSyncState.conflict && isManager)
                IconButton(
                  icon: const Icon(Icons.edit, color: Colors.orange),
                  tooltip: 'Resolve Conflict',
                  onPressed: () => _showConflictResolver(tx),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusBadge(OfflineSyncState state) {
    final label = state.name.toUpperCase();
    Color color;
    switch (state) {
      case OfflineSyncState.pending:
        color = AppColors.primaryDefault;
        break;
      case OfflineSyncState.syncing:
        color = Colors.blue;
        break;
      case OfflineSyncState.synced:
        color = AppColors.successDefault;
        break;
      case OfflineSyncState.failed:
        color = AppColors.dangerDefault;
        break;
      case OfflineSyncState.conflict:
        color = Colors.orange;
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  Future<void> _showTransactionDetails(QueuedOfflineTransaction tx) async {
    await showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceDefault,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text('Transaction Details', style: AppTextStyles.headingMd),
              const SizedBox(height: 16),
              _detailRow('ID', tx.clientTransactionId),
              _detailRow('Status', tx.state.name.toUpperCase()),
              _detailRow('Created', DateFormat('MMM dd, HH:mm').format(tx.createdAt)),
              _detailRow('Items', tx.items.length.toString()),
              if (tx.syncedAt != null)
                _detailRow('Synced', DateFormat('MMM dd, HH:mm').format(tx.syncedAt!)),
              if (tx.retryCount > 0)
                _detailRow('Retry Count', tx.retryCount.toString()),
              if (tx.nextRetryAt != null)
                _detailRow('Next Retry', DateFormat('HH:mm:ss').format(tx.nextRetryAt!)),
              if (tx.conflictType != null) ...[
                const Divider(height: 24),
                Text('Conflict Information', style: AppTextStyles.labelMd.copyWith(color: AppColors.dangerDefault)),
                const SizedBox(height: 8),
                _detailRow('Type', tx.conflictType!),
              ],
              if (tx.lastError != null) ...[
                const Divider(height: 24),
                Text('Error Details', style: AppTextStyles.labelMd.copyWith(color: AppColors.dangerDefault)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.dangerDefault.withValues(alpha: 0.1),
                    borderRadius: AppRadius.borderMd,
                  ),
                  child: Text(tx.lastError!, style: AppTextStyles.bodySm.copyWith(color: AppColors.dangerDefault)),
                ),
              ],
              const SizedBox(height: 24),
              // Items preview
              if (tx.items.isNotEmpty) ...[
                Text('Items', style: AppTextStyles.labelMd),
                const SizedBox(height: 8),
                ...tx.items.map((item) => ListTile(
                  dense: true,
                  title: Text(item['name']?.toString() ?? 'Unknown Item', 
                    style: AppTextStyles.bodySm),
                  subtitle: Text('SKU: ${item['sku'] ?? 'N/A'}', style: AppTextStyles.bodyXs),
                  trailing: Text('Qty: ${item['qty'] ?? 0}', style: AppTextStyles.bodySm),
                )),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted)),
          ),
          Expanded(
            child: Text(value, style: AppTextStyles.bodySm),
          ),
        ],
      ),
    );
  }

  List<QueuedOfflineTransaction> _filtered(List<QueuedOfflineTransaction> q) {
    return q.where((tx) => switch (_filter) {
      SyncQueueFilter.all => true,
      SyncQueueFilter.pending => tx.state == OfflineSyncState.pending || tx.state == OfflineSyncState.syncing,
      SyncQueueFilter.failed => tx.state == OfflineSyncState.failed,
      SyncQueueFilter.conflict => tx.state == OfflineSyncState.conflict,
    }).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }
}
