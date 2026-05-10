import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';

class StoreModeScreen extends StatelessWidget {
  const StoreModeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceDefault,
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
            left: AppSpacing.space4,
            right: AppSpacing.space4,
            bottom: AppSpacing.space8,
            child: Container(
              padding: AppSpacing.insetLg,
              decoration: BoxDecoration(
                color: AppColors.surfaceRaised,
                borderRadius: AppRadius.borderMd,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Icon(Icons.directions_walk, color: AppColors.primaryDefault, size: AppSpacing.space8),
                  const SizedBox(width: AppSpacing.space4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Next Item: Miniket Rice', style: AppTextStyles.labelLg),
                        Text('Aisle 4, Shelf B - 25 meters away', style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
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
      ..color = AppColors.borderDefault
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
