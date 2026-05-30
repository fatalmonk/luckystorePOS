import 'package:flutter/material.dart';
import 'dart:async';
import 'label_printer_service.dart';
import 'printer_models.dart';
import '../../utils/result.dart';

/// Test screen for debugging MHT-P29L printer
/// Only available on Android/iOS - Bluetooth not supported on Web
class PrinterTestScreen extends StatefulWidget {
  const PrinterTestScreen({super.key});

  @override
  State<PrinterTestScreen> createState() => _PrinterTestScreenState();
}

class _PrinterTestScreenState extends State<PrinterTestScreen> {
  final LabelPrinterService _printer = LabelPrinterService();
  final List<String> _logs = [];
  bool _isScanning = false;
  bool _isConnected = false;
  String? _connectedDeviceId;
  StreamSubscription? _scanSubscription;

  @override
  void initState() {
    super.initState();
    _printer.eventStream.listen(_handleEvent);
  }

  void _handleEvent(PrinterEvent event) {
    _log('[${event.type.name}] ${event.message}');
    setState(() {
      _isConnected = _printer.isConnected;
      _connectedDeviceId = _printer.connectedDeviceId;
    });
  }

  void _log(String message) {
    setState(() {
      _logs.add('${DateTime.now().toIso8601String().substring(11, 19)}: $message');
      if (_logs.length > 50) _logs.removeAt(0);
    });
  }

  Future<void> _scanPrinters() async {
    _log('🔍 Scanning for printers...');
    setState(() => _isScanning = true);
    
    _scanSubscription = _printer.scanForPrinters(timeout: const Duration(seconds: 10)).listen(
      (results) {
        for (final result in results) {
          _log('Found: ${result.device.platformName} (${result.device.remoteId.str})');
        }
      },
      onDone: () {
        _log('✅ Scan complete');
        setState(() => _isScanning = false);
      },
      onError: (e) {
        _log('❌ Scan error: $e');
        setState(() => _isScanning = false);
      },
    );
  }

  void _stopScan() {
    _printer.stopScan();
    _scanSubscription?.cancel();
    _log('🛑 Scan stopped');
  }

  Future<void> _testPrintSimple() async {
    _log('Printing simple test label...');
    final result = await _printer.printLabel(
      barcode: 'TEST123456',
      productName: 'Test Product',
      price: 99.99,
      copies: 1,
    );
    if (result.isSuccess) {
      _log('✅ Simple test print SUCCESS');
    } else {
      _log('❌ Simple test print FAILED: ${(result as Failure).error}');
    }
  }

  Future<void> _testPrintWithMRP() async {
    _log('Printing with MRP...');
    final result = await _printer.printLabel(
      barcode: 'TEST-MRP-001',
      productName: 'MRP Test Product',
      price: 350.00,
      mrp: 450.00,
      copies: 1,
    );
    if (result.isSuccess) {
      _log('✅ MRP test print SUCCESS');
    } else {
      _log('❌ MRP test print FAILED: ${(result as Failure).error}');
    }
  }

  Future<void> _testPrintBulk() async {
    _log('Printing 3 labels in sequence...');
    for (int i = 1; i <= 3; i++) {
      _log('Printing label $i/3...');
      final result = await _printer.printLabel(
        barcode: 'BULK-$i',
        productName: 'Bulk Item $i',
        price: 100.0 * i,
        copies: 1,
      );
      if (result.isFailure) {
        _log('❌ Failed at label $i: ${(result as Failure).error}');
        return;
      }
      await Future.delayed(const Duration(milliseconds: 500));
    }
    _log('✅ All 3 labels printed');
  }

  void _clearLogs() {
    setState(() => _logs.clear());
  }

  @override
  void dispose() {
    _printer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('Printer Test', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep, color: Colors.white70),
            onPressed: _clearLogs,
            tooltip: 'Clear Logs',
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF161B22),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Connection Status',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: _isConnected ? Colors.green : Colors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_isConnected)
                    Text(
                      'Connected: ${_printer.connectedDeviceName ?? _connectedDeviceId ?? 'Unknown'}',
                      style: const TextStyle(color: Colors.white70),
                    )
                  else
                    const Text(
                      'Not connected',
                      style: TextStyle(color: Colors.white54),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ElevatedButton.icon(
                  onPressed: _isScanning ? _stopScan : _scanPrinters,
                  icon: Icon(_isScanning ? Icons.stop : Icons.search),
                  label: Text(_isScanning ? 'Stop Scan' : 'Scan'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isScanning ? Colors.red : const Color(0xFFE8B84B),
                    foregroundColor: Colors.black,
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _isConnected ? _testPrintSimple : null,
                  icon: const Icon(Icons.print),
                  label: const Text('Test Print'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE8B84B),
                    foregroundColor: Colors.black,
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _isConnected ? _testPrintWithMRP : null,
                  icon: const Icon(Icons.discount),
                  label: const Text('Print with MRP'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE8B84B),
                    foregroundColor: Colors.black,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D1B2A),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white24),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Logs',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Divider(height: 16, color: Colors.white24),
                    Expanded(
                      child: ListView.builder(
                        reverse: true,
                        itemCount: _logs.length,
                        itemBuilder: (context, index) {
                          final logIndex = _logs.length - 1 - index;
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2),
                            child: Text(
                              _logs[logIndex],
                              style: const TextStyle(
                                color: Colors.greenAccent,
                                fontSize: 11,
                                fontFamily: 'monospace',
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
