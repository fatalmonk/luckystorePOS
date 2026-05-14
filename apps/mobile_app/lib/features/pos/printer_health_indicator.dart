import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

/// MHT-P29L printer health indicator
/// Shows Bluetooth + battery status in POS header
class PrinterHealthIndicator extends StatefulWidget {
  final String? printerMacAddress;

  const PrinterHealthIndicator({
    super.key,
    this.printerMacAddress,
  });

  @override
  State<PrinterHealthIndicator> createState() => _PrinterHealthIndicatorState();
}

class _PrinterHealthIndicatorState extends State<PrinterHealthIndicator> {
  BluetoothConnectionState _connectionState = BluetoothConnectionState.disconnected;
  int? _batteryLevel;
  StreamSubscription? _connectionSubscription;

  @override
  void initState() {
    super.initState();
    _initPrinterConnection();
  }

  @override
  void dispose() {
    _connectionSubscription?.cancel();
    super.dispose();
  }

  Future<void> _initPrinterConnection() async {
    if (widget.printerMacAddress == null) return;

    try {
      // Listen to Bluetooth adapter state
      FlutterBluePlus.adapterState.listen((state) {
        if (state == BluetoothAdapterState.on) {
          _connectToPrinter();
        } else {
          setState(() => _connectionState = BluetoothConnectionState.disconnected);
        }
      });
    } catch (e) {
      debugPrint('Printer init error: $e');
    }
  }

  Future<void> _connectToPrinter() async {
    if (widget.printerMacAddress == null) return;

    try {
      // Scan for devices to find printer
      await FlutterBluePlus.startScan(timeout: const Duration(seconds: 4));
      
      await for (final results in FlutterBluePlus.scanResults) {
        for (final result in results) {
          if (result.device.remoteId.str == widget.printerMacAddress) {
            final device = result.device;
            
            // Listen to connection state
            _connectionSubscription = device.connectionState.listen((state) {
              setState(() => _connectionState = state);
            });

            // Connect if not connected
            if (await device.connectionState.first == BluetoothConnectionState.disconnected) {
              await device.connect();
            }
            
            await FlutterBluePlus.stopScan();
            return;
          }
        }
      }
    } catch (e) {
      debugPrint('Printer connection error: $e');
      setState(() => _connectionState = BluetoothConnectionState.disconnected);
    }
  }

  Color get _statusColor {
    switch (_connectionState) {
      case BluetoothConnectionState.connected:
        return AppColors.successDefault;
      default:
        return AppColors.dangerDefault;
    }
  }

  IconData get _statusIcon {
    switch (_connectionState) {
      case BluetoothConnectionState.connected:
        return Icons.print;
      default:
        return Icons.print_disabled;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: _connectionState == BluetoothConnectionState.connected
          ? 'প্রিন্টার সংযুক্ত'
          : 'প্রিন্টার সংযোগ বিচ্ছিন্ন',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: _statusColor.withAlpha(26),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _statusColor),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(_statusIcon, size: 16, color: _statusColor),
            if (_batteryLevel != null) ...[
              const SizedBox(width: 4),
              Icon(
                _batteryLevel! > 50
                    ? Icons.battery_full
                    : _batteryLevel! > 20
                        ? Icons.battery_alert
                        : Icons.battery_0_bar,
                size: 14,
                color: _batteryLevel! > 20 ? _statusColor : AppColors.dangerDefault,
              ),
              const SizedBox(width: 2),
              Text(
                '$_batteryLevel%',
                style: AppTextStyles.labelXs.copyWith(color: _statusColor),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Printer queue widget for failed prints
class PrinterQueueWidget extends StatelessWidget {
  final List<Map<String, dynamic>> failedPrints;
  final Function(String printId) onRetry;

  const PrinterQueueWidget({
    super.key,
    required this.failedPrints,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    if (failedPrints.isEmpty) return const SizedBox.shrink();

    return Card(
      margin: const EdgeInsets.all(8),
      color: AppColors.warningSubtle,
      child: ExpansionTile(
        leading: const Icon(Icons.print_disabled, color: AppColors.warningDefault),
        title: Text(
          '${failedPrints.length}টি প্রিন্ট ব্যর্থ হয়েছে',
          style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          'সংযোগ ফিরলে আবার চেষ্টা করুন',
          style: AppTextStyles.bodySm,
        ),
        children: failedPrints.map((print) {
          return ListTile(
            dense: true,
            title: Text(print['label'] ?? 'অজানা প্রিন্ট'),
            trailing: IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => onRetry(print['id']),
            ),
          );
        }).toList(),
      ),
    );
  }
}
