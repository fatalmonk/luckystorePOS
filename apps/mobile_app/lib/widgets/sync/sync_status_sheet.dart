import 'package:flutter/material.dart';
import 'package:luckystorepos/features/sync/screens/conflict_resolution_page.dart';
import 'package:luckystorepos/features/sync/screens/dead_letter_queue_page.dart';
import 'package:luckystorepos/sync/models/sync_metrics.dart';
import 'package:luckystorepos/sync/sync_controller.dart';

class SyncStatusSheet extends StatelessWidget {
  final SyncController controller;

  const SyncStatusSheet({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          const SizedBox(height: 24),
          const Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Sending Status',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1F26),
              ),
            ),
          ),
          const SizedBox(height: 24),
          StreamBuilder<SyncMetrics>(
            stream: controller.metrics,
            builder: (context, snapshot) {
              final m = snapshot.data ?? SyncMetrics.zero();
              return Column(
                children: [
                  _buildMetricRow(
                    icon: Icons.schedule_send,
                    color: Colors.blue,
                    title: 'Orders Waiting',
                    count: m.pendingCount,
                  ),
                  const Divider(height: 32),
                  _buildMetricRow(
                    icon: Icons.report_gmailerrorred,
                    color: Colors.red,
                    title: 'Orders with Errors',
                    count: m.failedCount,
                    action: m.failedCount > 0 ? 'Review' : null,
                    onAction: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => DeadLetterQueuePage(controller: controller)),
                      );
                    },
                  ),
                  const Divider(height: 32),
                  _buildMetricRow(
                    icon: Icons.warning_amber,
                    color: Colors.orange,
                    title: 'Counting Discrepancy',
                    count: m.conflictCount,
                    action: m.conflictCount > 0 ? 'Resolve' : null,
                    onAction: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => ConflictResolutionPage(controller: controller)),
                      );
                    },
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                controller.engine.processQueue();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.sync, size: 20),
              label: const Text('Retry Sending Now'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricRow({
    required IconData icon,
    required Color color,
    required String title,
    required int count,
    String? action,
    VoidCallback? onAction,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
              const SizedBox(height: 2),
              Text('$count items in queue', style: TextStyle(fontSize: 14, color: Colors.grey[500])),
            ],
          ),
        ),
        if (action != null)
          TextButton(
            onPressed: onAction,
            style: TextButton.styleFrom(
              foregroundColor: color,
              visualDensity: VisualDensity.compact,
            ),
            child: Text(action, style: const TextStyle(fontWeight: FontWeight.bold)),
          )
        else
          Text(
            '$count',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2937),
            ),
          ),
      ],
    );
  }
}
