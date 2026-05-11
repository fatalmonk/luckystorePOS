import 'package:flutter/material.dart';
import 'package:luckystorepos/sync/models/sync_status.dart';
import 'package:luckystorepos/sync/sync_controller.dart';
import 'package:luckystorepos/widgets/sync/sync_status_sheet.dart';

class SyncBadge extends StatelessWidget {
  final SyncController controller;

  const SyncBadge({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<SyncStatus>(
      valueListenable: controller.status,
      builder: (context, status, _) {
        return GestureDetector(
          onTap: () {
            showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.transparent,
              builder: (_) => SyncStatusSheet(controller: controller),
            );
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _getColor(status).withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _getColor(status), width: 1.5),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _getIcon(status),
                const SizedBox(width: 8),
                Text(
                  _getLabel(status),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: _getColor(status),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Color _getColor(SyncStatus s) {
    switch (s) {
      case SyncStatus.online:
        return Colors.green;
      case SyncStatus.syncing:
        return Colors.amber;
      case SyncStatus.offline:
        return Colors.grey;
      case SyncStatus.degraded:
        return Colors.orange;
      case SyncStatus.conflict:
        return Colors.redAccent;
    }
  }

  Widget _getIcon(SyncStatus s) {
    final color = _getColor(s);
    switch (s) {
      case SyncStatus.online:
        return Icon(Icons.cloud_done, size: 16, color: color);
      case SyncStatus.syncing:
        return SizedBox(
          width: 12,
          height: 12,
          child: CircularProgressIndicator(strokeWidth: 2, color: color),
        );
      case SyncStatus.offline:
        return Icon(Icons.cloud_off, size: 16, color: color);
      case SyncStatus.degraded:
        return Icon(Icons.report_problem, size: 16, color: color);
      case SyncStatus.conflict:
        return Icon(Icons.warning_amber_rounded, size: 16, color: color);
    }
  }

  String _getLabel(SyncStatus s) {
    switch (s) {
      case SyncStatus.online:
        return 'Online';
      case SyncStatus.syncing:
        return 'Syncing';
      case SyncStatus.offline:
        return 'Offline';
      case SyncStatus.degraded:
        return 'Degraded';
      case SyncStatus.conflict:
        return 'Conflict';
    }
  }
}
