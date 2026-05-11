import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class FastItemScanner extends StatefulWidget {
  final Function(String barcode) onCodeEntered;
  final VoidCallback onSubtotalTrigger;

  const FastItemScanner({
    Key? key,
    required this.onCodeEntered,
    required this.onSubtotalTrigger,
  }) : super(key: key);

  @override
  State<FastItemScanner> createState() => _FastItemScannerState();
}

class _FastItemScannerState extends State<FastItemScanner> {
  late final FocusNode _inputFocus;
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _inputFocus = FocusNode();
    _controller = TextEditingController();
    
    // Automatically acquire focus immediately on bootstrap
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _inputFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _inputFocus.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _handleSubmit(String val) {
    final trimmed = val.trim();
    if (trimmed.isNotEmpty) {
      widget.onCodeEntered(trimmed);
      _controller.clear();
      // Force re-focus lock forcing sequential scanning without mouse touch
      _inputFocus.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.f12): widget.onSubtotalTrigger,
        const SingleActivator(LogicalKeyboardKey.enter, meta: true): widget.onSubtotalTrigger,
      },
      child: TextField(
        controller: _controller,
        focusNode: _inputFocus,
        onSubmitted: _handleSubmit,
        autofocus: true,
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.qr_code_scanner_rounded),
          hintText: 'Scan or type SKU... (Press [F12] to checkout)',
          filled: true,
          fillColor: Colors.grey[50],
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey[300]!),
          ),
        ),
        // Prevent system keyboard auto-hiding for extreme input frequency
        keyboardType: TextInputType.text,
        enableSuggestions: false,
        autocorrect: false,
      ),
    );
  }
}
