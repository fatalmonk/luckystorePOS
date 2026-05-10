import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';

/// Global hardware barcode scanner listener service.
/// Uses Flutter's HardwareKeyboard to capture raw input from USB/Bluetooth
/// barcode scanners seamlessly across all screens and text fields.

class BarcodeScannerListener extends StatefulWidget {
  final Widget child;
  final ValueChanged<String> onBarcodeScan;

  const BarcodeScannerListener({
    super.key,
    required this.child,
    required this.onBarcodeScan,
  });

  @override
  State<BarcodeScannerListener> createState() => _BarcodeScannerListenerState();
}

class _BarcodeScannerListenerState extends State<BarcodeScannerListener> {
  final bool _isListening = true;
  Timer? _debounceTimer;
  String _buffer = '';

  @override
  Widget build(BuildContext context) {
    return KeyboardListener(
      focusNode: FocusNode(),
      onKeyEvent: _onKeyEvent,
      child: widget.child,
    );
  }

  void _onKeyEvent(KeyEvent event) {
    if (!_isListening) return;

    if (event is KeyDownEvent) {
      _handleKeyChar(event.logicalKey);
    } else if (event is KeyUpEvent) {
      _handleKeyUp(event.logicalKey);
    }
  }

  void _handleKeyChar(LogicalKeyboardKey key) {
    if (key == LogicalKeyboardKey.enter) {
      _processBarcode(_buffer);
      _buffer = '';
    } else if (key == LogicalKeyboardKey.backspace) {
      _buffer = _buffer.substring(0, _buffer.length - 1);
    } else if (key == LogicalKeyboardKey.escape) {
      _buffer = '';
    } else if (key.keyLabel.length == 1) {
      _buffer += key.keyLabel;
      
      // Debounce buffer processing to handle fast scanners
      _debounceTimer?.cancel();
      _debounceTimer = Timer(const Duration(milliseconds: 100), () {
        if (_buffer.isNotEmpty) {
          _processBarcode(_buffer);
          _buffer = '';
        }
      });
    }
  }

  void _handleKeyUp(LogicalKeyboardKey key) {
    if (key == LogicalKeyboardKey.enter) {
      _debounceTimer?.cancel();
      _buffer = '';
    }
  }

  void _processBarcode(String code) {
    if (code.isNotEmpty) {
      widget.onBarcodeScan(code);
      
      // Optional: vibrate/haptic feedback
      // HapticFeedback.lightImpact();
    }
  }
}

/// Utility class for barcode scanning
class BarcodeScanner {
  static void scanFromCamera(BuildContext context) {
    Navigator.of(context).pushNamed('/scan', 
      arguments: {'scannerType': 'camera'}
    );
  }

  static void scanFromHardware() {
    // Use hardware scanner (already handled by BarcodeScannerListener)
  }

  static StreamSubscription? _cameraSubscription;

  Stream<String>? startCameraScan() {
    return null; // Implement with mobile_scanner package
  }

  void stopCameraScan() {
    _cameraSubscription?.cancel();
  }
}
