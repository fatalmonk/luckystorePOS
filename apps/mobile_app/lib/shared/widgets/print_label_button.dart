import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_radius.dart';
import '../../features/inventory/label_printer_screen.dart';

/// Reusable Print Label button that navigates to the LabelPrinterScreen
///
/// Usage:
/// ```dart
/// PrintLabelButton(
///   barcode: product.sku,
///   productName: product.name,
///   price: product.price,
///   style: PrintLabelButtonStyle.fab, // or .icon, .elevated
/// )
/// ```
class PrintLabelButton extends StatelessWidget {
  final String barcode;
  final String? productName;
  final double? price;
  final PrintLabelButtonStyle style;
  final VoidCallback? onBeforePrint;

  const PrintLabelButton({
    super.key,
    required this.barcode,
    this.productName,
    this.price,
    this.style = PrintLabelButtonStyle.icon,
    this.onBeforePrint,
  });

  void _onPressed(BuildContext context) {
    onBeforePrint?.call();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LabelPrinterScreen(
          barcode: barcode,
          productName: productName,
          price: price,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (style) {
      case PrintLabelButtonStyle.fab:
        return FloatingActionButton.small(
          onPressed: () => _onPressed(context),
          heroTag: 'print_label_$barcode',
          backgroundColor: AppColors.secondaryDefault,
          foregroundColor: AppColors.secondaryOn,
          child: const Icon(Icons.print_rounded),
        );

      case PrintLabelButtonStyle.icon:
        return IconButton(
          onPressed: () => _onPressed(context),
          icon: const Icon(Icons.print_rounded),
          color: AppColors.secondaryDefault,
          tooltip: 'Print Label',
        );

      case PrintLabelButtonStyle.elevated:
        return ElevatedButton.icon(
          onPressed: () => _onPressed(context),
          icon: const Icon(Icons.print_rounded, size: 18),
          label: const Text('Print Label'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.secondaryDefault,
            foregroundColor: AppColors.secondaryOn,
            textStyle: AppTextStyles.labelMd.copyWith(fontWeight: FontWeight.bold),
            shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
            elevation: 2,
          ),
        );

      case PrintLabelButtonStyle.outlined:
        return OutlinedButton.icon(
          onPressed: () => _onPressed(context),
          icon: const Icon(Icons.print_rounded, size: 18),
          label: const Text('Print Label'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.secondaryDefault,
            side: const BorderSide(color: AppColors.secondaryDefault),
            textStyle: AppTextStyles.labelMd.copyWith(fontWeight: FontWeight.bold),
            shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
          ),
        );
    }
  }
}

enum PrintLabelButtonStyle {
  /// Small floating action button
  fab,

  /// Icon button only
  icon,

  /// Elevated button with icon and text
  elevated,

  /// Outlined button with icon and text
  outlined,
}
