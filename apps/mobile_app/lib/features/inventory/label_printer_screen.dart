import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../../core/services/printer/label_printer_service.dart';
import '../../core/services/printer/printer_models.dart';
import '../../core/utils/result.dart';

/// Screen for connecting to and printing labels with MHT-P29L
class LabelPrinterScreen extends StatefulWidget {
  final String? barcode;
  final String? productName;
  final double? price;

  const LabelPrinterScreen({
    super.key,
    this.barcode,
    this.productName,
    this.price,
  });

  @override
  State<LabelPrinterScreen> createState() => _LabelPrinterScreenState();
}

class _LabelPrinterScreenState extends State<LabelPrinterScreen> {
  final LabelPrinterService _printerService = LabelPrinterService();
  List<ScanResult> _scanResults = [];
  bool _isScanning = false;
  bool _isConnecting = false;
  bool _isConnected = false;
  String? _connectedDeviceName;
  String? _errorMessage;

  // Print settings
  final _barcodeController = TextEditingController();
  final _productNameController = TextEditingController();
  final _priceController = TextEditingController();
  int _copies = 1;

  @override
  void initState() {
    super.initState();
    _barcodeController.text = widget.barcode ?? '';
    _productNameController.text = widget.productName ?? '';
    _priceController.text = widget.price?.toString() ?? '';

    // Listen to printer events
    _printerService.eventStream.listen(_handlePrinterEvent);
  }

  void _handlePrinterEvent(PrinterEvent event) {
    if (!mounted) return;

    setState(() {
      switch (event.type) {
        case PrinterEventType.scanning:
          _isScanning = true;
          _errorMessage = null;
          break;
        case PrinterEventType.scanComplete:
          _isScanning = false;
          break;
        case PrinterEventType.connecting:
          _isConnecting = true;
          _errorMessage = null;
          break;
        case PrinterEventType.connected:
          _isConnecting = false;
          _isConnected = true;
          _connectedDeviceName = event.printerId;
          break;
        case PrinterEventType.connectionFailed:
          _isConnecting = false;
          _isConnected = false;
          _errorMessage = event.error;
          break;
        case PrinterEventType.disconnected:
          _isConnected = false;
          _connectedDeviceName = null;
          break;
        default:
          break;
      }
    });

    // Show snackbar for important events
    if (event.message != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(event.message!),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _startScan() async {
    setState(() {
      _scanResults = [];
      _errorMessage = null;
    });

    final scanStream = _printerService.scanForPrinters(timeout: const Duration(seconds: 10));

    scanStream.listen((results) {
      if (!mounted) return;
      setState(() {
        // Filter for printer-like devices
        _scanResults = results.where((r) {
          final name = r.device.platformName.toLowerCase();
          return name.contains('printer') ||
                 name.contains('mht') ||
                 name.contains('tsc') ||
                 name.contains('label') ||
                 name.contains('pos') ||
                 name.contains('thermal');
        }).toList();
      });
    });

    // Auto-stop after timeout
    Future.delayed(const Duration(seconds: 10), () {
      if (mounted) {
        setState(() => _isScanning = false);
      }
    });
  }

  Future<void> _connectToDevice(ScanResult result) async {
    await _printerService.stopScan();

    final device = result.device;
    final result_conn = await _printerService.connect(
      deviceId: device.remoteId.str,
      deviceName: device.platformName,
    );

    if (result_conn is Failure<String> && mounted) {
      setState(() => _errorMessage = result_conn.error);
    }
  }

  Future<void> _disconnect() async {
    await _printerService.disconnect();
  }

  Future<void> _printLabel() async {
    if (_barcodeController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a barcode')),
      );
      return;
    }

    double? price;
    if (_priceController.text.isNotEmpty) {
      price = double.tryParse(_priceController.text);
    }

    final result = await _printerService.printLabel(
      barcode: _barcodeController.text,
      productName: _productNameController.text.isEmpty
          ? null
          : _productNameController.text,
      price: price,
      copies: _copies,
    );

    if (result is Failure<void> && mounted) {
      setState(() => _errorMessage = result.error);
    }
  }

  Future<void> _testPrint() async {
    final result = await _printerService.testPrint();
    if (result is Failure<void> && mounted) {
      setState(() => _errorMessage = result.error);
    }
  }

  @override
  void dispose() {
    _barcodeController.dispose();
    _productNameController.dispose();
    _priceController.dispose();
    _printerService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Label Printer'),
        actions: [
          if (_isConnected)
            IconButton(
              icon: const Icon(Icons.bluetooth_disabled),
              onPressed: _disconnect,
              tooltip: 'Disconnect',
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Connection Status
            Card(
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
                                _isConnected
                                    ? 'Connected to $_connectedDeviceName'
                                    : 'Not Connected',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              if (_isConnected)
                                const Text(
                                  'Ready to print',
                                  style: TextStyle(color: Colors.green),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (!_isConnected) ...[
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _isScanning ? null : _startScan,
                        icon: _isScanning
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.search),
                        label: Text(_isScanning ? 'Scanning...' : 'Scan for Printers'),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Error Message
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Card(
                color: Colors.red.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Icon(Icons.error, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => setState(() => _errorMessage = null),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            // Scan Results
            if (_scanResults.isNotEmpty && !_isConnected) ...[
              const SizedBox(height: 16),
              const Text(
                'Available Printers',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ..._scanResults.map((result) => Card(
                child: ListTile(
                  leading: const Icon(Icons.print),
                  title: Text(result.device.platformName.isNotEmpty
                      ? result.device.platformName
                      : 'Unknown Printer'),
                  subtitle: Text(result.device.remoteId.str),
                  trailing: _isConnecting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : ElevatedButton(
                          onPressed: () => _connectToDevice(result),
                          child: const Text('Connect'),
                        ),
                ),
              )),
            ],

            // Print Form (only when connected)
            if (_isConnected) ...[
              const SizedBox(height: 24),
              const Text(
                'Label Details',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _barcodeController,
                decoration: const InputDecoration(
                  labelText: 'Barcode *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.qr_code),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _productNameController,
                decoration: const InputDecoration(
                  labelText: 'Product Name',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.label),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _priceController,
                decoration: const InputDecoration(
                  labelText: 'Price',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.attach_money),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Text('Copies:'),
                  const SizedBox(width: 16),
                  IconButton(
                    onPressed: _copies > 1 ? () => setState(() => _copies--) : null,
                    icon: const Icon(Icons.remove),
                  ),
                  Text(
                    _copies.toString(),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    onPressed: () => setState(() => _copies++),
                    icon: const Icon(Icons.add),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _printLabel,
                icon: const Icon(Icons.print),
                label: const Text('Print Label'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _testPrint,
                icon: const Icon(Icons.bug_report),
                label: const Text('Test Print'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
