import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../sales/offline_transaction_sync_service.dart';
import '../../../sales/store_closing_health_check_service.dart';

class StoreClosingHealthCheckScreen extends StatefulWidget {
  const StoreClosingHealthCheckScreen({super.key});

  @override
  State<StoreClosingHealthCheckScreen> createState() =>
      _StoreClosingHealthCheckScreenState();
}

class _StoreClosingHealthCheckScreenState
    extends State<StoreClosingHealthCheckScreen> {
  final _sync = OfflineTransactionSyncService.instance;
  final _service = const StoreClosingHealthCheckService();
  bool _managerReviewConfirmed = false;
  DateTime? _reviewCompletedAt;

  @override
  void initState() {
    super.initState();
    _sync.addListener(_refresh);
  }

  @override
  void dispose() {
    _sync.removeListener(_refresh);
    super.dispose();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final role = auth.appUser?.role ?? 'unknown';
    final isManager = auth.appUser?.isManager == true;

    if (!isManager) {
      return Scaffold(
        backgroundColor: AppColors.primitiveNeutral900,
        appBar: AppBar(
          backgroundColor: AppColors.primitiveNeutral800,
          title: const Text('Store Closing Health Check'),
        ),
        body: Center(
          child: Padding(
            padding: AppSpacing.insetMd,
            child: Text(
              'Manager or admin access required for end-of-day closing review.',
              style: AppTextStyles.bodyMd.copyWith(color: AppColors.primitiveNeutral400),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    final check = _service.evaluate(
      queue: _sync.queue,
      telemetry: _sync.telemetry,
      hasInventoryMismatchWarnings: false,
    );
    final canFinalize = _managerReviewConfirmed;

    return Scaffold(
      backgroundColor: AppColors.primitiveNeutral900,
      appBar: AppBar(
        backgroundColor: AppColors.primitiveNeutral800,
        title: const Text('Store Closing Health Check'),
      ),
      body: ListView(
        padding: AppSpacing.insetMd,
        children: [
          _statusCard(check.status),
          const SizedBox(height: AppSpacing.space4),
          _item('Queued pending count', '${check.queuedPendingCount}',
              preferred: check.queuedPendingCount == 0),
          _item('Failed syncs reviewed', '${check.failedNeedingReview} unreviewed',
              preferred: check.failedNeedingReview == 0),
          _item(
            'Conflicts acknowledged',
            '${check.conflictsUnacknowledged} pending',
            preferred: check.conflictsUnacknowledged == 0,
          ),
          _item('Last sync success recent', check.lastSyncIsRecent ? 'Yes' : 'No',
              preferred: check.lastSyncIsRecent),
          _item(
            'Inventory mismatch warnings',
            check.hasInventoryMismatchWarnings ? 'Present' : 'None',
            preferred: !check.hasInventoryMismatchWarnings,
          ),
          const SizedBox(height: AppSpacing.space3),
          Container(
            padding: AppSpacing.insetMd,
            decoration: BoxDecoration(
              color: AppColors.primitiveNeutral800,
              borderRadius: AppRadius.borderMd,
              border: Border.all(color: AppColors.primitiveNeutral0.withValues(alpha: 0.05)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Closing reviewer: ${auth.appUser?.name ?? 'Manager'} ($role)',
                  style: AppTextStyles.bodyMd.copyWith(color: AppColors.primitiveNeutral0),
                ),
                const SizedBox(height: AppSpacing.space3),
                CheckboxListTile(
                  value: _managerReviewConfirmed,
                  onChanged: (value) {
                    setState(() {
                      _managerReviewConfirmed = value ?? false;
                    });
                  },
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                  activeColor: AppColors.primaryDefault,
                  title: Text(
                    'I reviewed pending/failed/conflict sync health before closing.',
                    style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.space3),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: canFinalize ? () => _finalizeReview(check) : null,
              icon: Icon(Icons.task_alt, color: AppColors.primaryOn),
              label: Text(
                'Finalize Closing Review',
                style: AppTextStyles.labelMd.copyWith(
                  color: AppColors.primaryOn,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryDefault,
                disabledBackgroundColor: AppColors.primitiveNeutral800,
                disabledForegroundColor: AppColors.primitiveNeutral400,
                padding: AppSpacing.insetSquishMd.copyWith(top: AppSpacing.space3, bottom: AppSpacing.space3),
              ),
            ),
          ),
          if (_reviewCompletedAt != null) ...[
            const SizedBox(height: AppSpacing.space2),
            Text(
              'Last review completed at '
              '${DateFormat('MMM dd, hh:mm a').format(_reviewCompletedAt!.toLocal())}',
              style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _finalizeReview(StoreClosingHealthCheck check) async {
    setState(() {
      _reviewCompletedAt = DateTime.now();
    });
    if (!mounted) return;
    final status = check.status.name.toUpperCase();
    final guidance = switch (check.status) {
      StoreCloseStatus.green =>
        'Store is clear for close. No operational blockers detected.',
      StoreCloseStatus.yellow =>
        'Store can close with caution. Review non-blocking warnings tomorrow morning.',
      StoreCloseStatus.red =>
        'Store has high-risk sync issues. Escalate to admin before final financial lock.',
    };
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Close status: $status. $guidance'),
      ),
    );
  }

  Widget _statusCard(StoreCloseStatus status) {
    final color = switch (status) {
      StoreCloseStatus.green => AppColors.successDefault,
      StoreCloseStatus.yellow => AppColors.warningDefault,
      StoreCloseStatus.red => AppColors.dangerDefault,
    };
    return Container(
      padding: AppSpacing.insetMd,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: AppRadius.borderLg,
        border: Border.all(color: color.withValues(alpha: 0.7)),
      ),
      child: Text(
        'Close Status: ${status.name.toUpperCase()}',
        style: AppTextStyles.headingMd.copyWith(color: color),
      ),
    );
  }

  Widget _item(String title, String value, {required bool preferred}) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.space3),
      padding: AppSpacing.insetMd,
      decoration: BoxDecoration(
        color: AppColors.primitiveNeutral800,
        borderRadius: AppRadius.borderMd,
        border: Border.all(color: AppColors.primitiveNeutral0.withValues(alpha: 0.05)),
      ),
      child: Row(
        children: [
          Icon(
            preferred ? Icons.check_circle_outline : Icons.warning_amber_rounded,
            color: preferred ? AppColors.successDefault : AppColors.warningDefault,
          ),
          const SizedBox(width: AppSpacing.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTextStyles.bodyMd.copyWith(color: AppColors.primitiveNeutral0)),
                Text(value, style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
