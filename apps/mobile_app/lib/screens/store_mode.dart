import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class StoreModeScreen extends StatelessWidget {
  const StoreModeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Store Mode - Gulshan Branch'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () {
              // TODO: Integrate Barcode Scanner for shelf items
            },
          )
        ],
      ),
      body: Stack(
        children: [
          // Simulated Interactive Map Layout
          Positioned.fill(
            child: Container(
              color: Colors.white.withValues(alpha: 0.02),
              child: CustomPaint(
                painter: AisleMapPainter(), // Custom blueprint visual logic
              ),
            ),
          ),
          
          // Floating BLE Blue Dot Navigation Snippet
          Positioned(
            top: 150,
            left: 100,
            child: Column(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: Colors.blueAccent,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: Colors.blueAccent.withValues(alpha: 0.5), blurRadius: 10, spreadRadius: 4),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(4)),
                  child: const Text('You', style: TextStyle(color: Colors.white, fontSize: 10)),
                )
              ],
            ),
          ),

          // Bottom Routing Directions
          Positioned(
            left: 16,
            right: 16,
            bottom: 30,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.neomorphicDecoration,
              child: const Row(
                children: [
                  Icon(Icons.directions_walk, color: AppTheme.primaryAccent, size: 32),
                  SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Next Item: Miniket Rice', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
                        Text('Aisle 4, Shelf B - 25 meters away', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                      ],
                    ),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}

class AisleMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.shadowLight
      ..style = PaintingStyle.fill;
      
    // Draw abstract supermarket aisles
    for (int i = 0; i < 5; i++) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(50.0 + (i * 70), 80, 40, 300),
          const Radius.circular(8),
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
