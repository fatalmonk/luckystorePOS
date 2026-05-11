import 'package:flutter/material.dart';
import 'package:luckystorepos/sync/models/sync_status.dart';
import 'package:luckystorepos/sync/sync_controller.dart';

class OperationalAlertBanner extends StatelessWidget {
  final SyncController controller;

  const OperationalAlertBanner({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<SyncStatus>(
      valueListenable: controller.status,
      builder: (context, status, _) {
        if (status == SyncStatus.online || status == SyncStatus.syncing) {
          return const SizedBox.shrink(); // Silent during healthy ops
        }

        final bool isOffline = status == SyncStatus.offline;
        final Color color = isOffline ? Colors.grey[800]! : Colors.amber[800]!;
        
        final String message = isOffline 
          ? "Running Disconnected. All sales are safely stored local."
          : "Network Slow. Sending data in background now.";

        return Material(
          elevation: 4,
          child: Container(
            color: color,
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            width: double.infinity,
            child: Row(
              children: [
                Icon(isOffline ? Icons.wifi_off : Icons.hourglass_bottom, color: Colors.white, size: 18),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    message,
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
