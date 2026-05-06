import 'package:flutter/material.dart';
import 'dart:async';
import 'label_printer_service.dart';
import 'printer_models.dart';
import '../../utils/result.dart';

/// Test screen for debugging MHT-P29L printer
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

  @override
  void initState() {
    super.initState();
    _setupListener();
  }

  void _setupListener() {
    _printer.eventStream.listen((event) {
      _log('Event: ${event.type} - ${event.message ?? ""}');
      setState(() {
        switch (event.type) {
          case PrinterEventType.connected:
            _isConnected = true;
            _connectedDeviceId = event.printerId;
            break;
          case PrinterEventType.disconnected:
            _isConnected = false;
            _connectedDeviceId = null;
            break;
          case PrinterEventType.scanning:
            _isScanning = true;
            break;
          case PrinterEventType.scanComplete:
            _isScanning = false;
            break;
          default:
            break;
        }
      });
    });
  }

  void _log(String message) {
    setState(() {
      _logs.insert(0, '[${DateTime.now().toIso8601String()}] $message');
      if (_logs.length > 50) _logs.removeLast();
    });
  }

  Future<void> _scanPrinters() async {
    _log('Starting scan...');
    setState(() => _isScanning = true);

    final stream = _printer.scanForPrinters(timeout: const Duration(seconds: 10));
    stream.listen((results) {
      for (final result in results) {
        _log('Found: ${result.device.platformName} (${result.device.remoteId})');
      }
    }, onDone: () {
      setState(() => _isScanning = false);
      _log('Scan complete');
    });
  }

  Future<void> _testPrintSimple() async {
    _log('Printing simple test...');
    final result = await _printer.testPrint();
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
      appBar: AppBar(
        title: const Text('Printer Test'),
        actions: [
          IconButton(
            icon: const Icon(Icons.clear_all),
            onPressed: _clearLogs,
            tooltip: 'Clear logs',
          ),
        ],
      ),
      body: Column(
        children: [
          // Status Card
          Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(
                        _isConnected ? Icons.bluetooth_connected : Icons.bluetooth,
                        color: _isConnected ? Colors.green : Colors.grey,
                        size: 32,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isConnected ? 'Connected' : 'Disconnected',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (_connectedDeviceId != null)
                              Text(
                                'Device: $_connectedDeviceId',
                                style: const TextStyle(fontSize: 12),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ElevatedButton.icon(
                        onPressed: _isScanning ? null : _scanPrinters,
                        icon: _isScanning
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.search),
                        label: Text(_isScanning ? 'Scanning...' : 'Scan'),
                      ),
                      ElevatedButton.icon(
                        onPressed: _isConnected ? _testPrintSimple : null,
                        icon: const Icon(Icons.print),
                        label: const Text('Test Simple'),
                      ),
                      ElevatedButton.icon(
                        onPressed: _isConnected ? _testPrintWithMRP : null,
                        icon: const Icon(Icons.money_off),
                        label: const Text('Test with MRP'),
                      ),
                      ElevatedButton.icon(
                        onPressed: _isConnected ? _testPrintBulk : null,
                        icon: const Icon(Icons.queue),
                        label: const Text('Test Bulk (3x)'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Instructions
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Card(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Test Instructions:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text('1. Turn ON MHT-P29L printer'),
                    Text('2. Hold power until blue light flashes'),
                    Text('3. Tap "Scan" to find printer'),
                    Text('4. Tap test buttons to print'),
                    Text('5. Check logs below for details'),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Log Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                const Text(
                  'Event Logs:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                Text('${_logs.length} entries'),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Logs
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _logs.length,
              itemBuilder: (context, index) {
                final log = _logs[index];
                final isError = log.contains('❌');
                final isSuccess = log.contains('✅');
                return Card(
                  color: isError
                      ? Colors.red.shade50
                      : isSuccess
                          ? Colors.green.shade50
                          : null,
                  margin: const EdgeInsets.only(bottom: 4),
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(
                      log,
                      style: TextStyle(
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: isError
                            ? Colors.red
                            : isSuccess
                                ? Colors.green
                                : null,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
