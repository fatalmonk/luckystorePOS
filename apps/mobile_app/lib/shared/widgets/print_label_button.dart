import 'package:flutter/material.dart';
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
          child: const Icon(Icons.print),
        );

      case PrintLabelButtonStyle.icon:
        return IconButton(
          onPressed: () => _onPressed(context),
          icon: const Icon(Icons.print),
          tooltip: 'Print Label',
        );

      case PrintLabelButtonStyle.elevated:
        return ElevatedButton.icon(
          onPressed: () => _onPressed(context),
          icon: const Icon(Icons.print, size: 18),
          label: const Text('Print Label'),
        );

      case PrintLabelButtonStyle.outlined:
        return OutlinedButton.icon(
          onPressed: () => _onPressed(context),
          icon: const Icon(Icons.print, size: 18),
          label: const Text('Print Label'),
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
