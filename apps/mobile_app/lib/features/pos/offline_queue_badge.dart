import 'package:flutter/material.dart';
import '../../features/sales/offline_transaction_sync_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

// Offline sale queue visibility badge
// Shows "Sales Queued: 3" with green/yellow/red status
class OfflineQueueBadge extends StatelessWidget {
  const OfflineQueueBadge({super.key});

  Color _getStatusColor(int count, bool isOnline) {
    if (!isOnline) return AppColors.dangerDefault;
    if (count == 0) return AppColors.successDefault;
    if (count < 5) return AppColors.warningDefault;
    return AppColors.dangerDefault;
  }

  String _getStatusText(int count, bool isOnline) {
    if (!isOnline) return 'অফলাইন';
    if (count == 0) return 'সিঙ্কড';
    if (count == 1) return '১টি বিক্রয় অপেক্ষমান';
    return '$countটি বিক্রয় অপেক্ষমান';
  }

  @override
  Widget build(BuildContext context) {
    final service = OfflineTransactionSyncService.instance;
    final queueCount = service.queue.length;
    // Assume online for demo - in production, check connectivity
    final isOnline = true;
    final color = _getStatusColor(queueCount, isOnline);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            queueCount > 0 ? Icons.sync : Icons.check_circle,
            size: 16,
            color: color,
          ),
          const SizedBox(width: 6),
          Text(
            _getStatusText(queueCount, isOnline),
            style: AppTextStyles.labelSm.copyWith(
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (queueCount > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                queueCount.toString(),
                style: AppTextStyles.labelXs.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Snackbar that shows when offline sales are queued
class OfflineQueueSnackBar extends StatelessWidget {
  final int queueCount;

  const OfflineQueueSnackBar({
    super.key,
    required this.queueCount,
  });

  @override
  Widget build(BuildContext context) {
    return SnackBar(
      content: Row(
        children: [
          const Icon(Icons.offline_bolt, color: Colors.white),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'ইন্টারনেট নেই। $queueCountটি বিক্রয় সংরক্ষিত হয়েছে। ইন্টারনেট ফিরলে স্বয়ংক্রিয় সিঙ্ক হবে।',
              style: AppTextStyles.bodySm.copyWith(color: Colors.white),
            ),
          ),
        ],
      ),
      backgroundColor: AppColors.warningDark,
      duration: const Duration(seconds: 4),
      action: SnackBarAction(
        label: 'ঠিক আছে',
        textColor: Colors.white,
        onPressed: () {},
      ),
    );
  }
}
