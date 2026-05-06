import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../../../core/services/csv_import_service.dart';
import 'picked_file_data.dart';

// Conditional import for file picker - only on mobile
import 'file_picker_stub.dart'
    if (dart.library.io) 'file_picker_mobile.dart';
import '../../../../core/services/printer/label_printer_service.dart';
import '../../../../core/services/printer/printer_models.dart';
import '../../../../core/utils/result.dart';
import '../../../inventory/label_printer_screen.dart';

/// Product model for bulk printing
class BulkPrintProduct {
  final String id;
  final String barcode;
  final String name;
  final double price;
  final double? mrp;      // MRP with strikethrough
  int copies;
  bool selected;

  BulkPrintProduct({
    required this.id,
    required this.barcode,
    required this.name,
    required this.price,
    this.mrp,
    this.copies = 1,
    this.selected = false,
  });
}

/// Bulk Label Print Screen - Print labels for multiple products at once
class BulkLabelPrintScreen extends StatefulWidget {
  final List<BulkPrintProduct>? initialProducts;

  const BulkLabelPrintScreen({
    super.key,
    this.initialProducts,
  });

  @override
  State<BulkLabelPrintScreen> createState() => _BulkLabelPrintScreenState();
}

class _BulkLabelPrintScreenState extends State<BulkLabelPrintScreen> {
  final LabelPrinterService _printerService = LabelPrinterService();
  final TextEditingController _searchController = TextEditingController();

  List<BulkPrintProduct> _allProducts = [];
  List<BulkPrintProduct> _filteredProducts = [];
  List<BulkPrintProduct> _selectedProducts = [];

  bool _isScanning = false;
  bool _isConnected = false;
  bool _isPrinting = false;
  bool _selectAll = false;

  int _currentPrintIndex = 0;
  int _totalPrints = 0;
  String? _statusMessage;
  String? _errorMessage;

  StreamSubscription<PrinterEvent>? _printerSubscription;

  // CSV Import
  bool _isImporting = false;

  @override
  void initState() {
    super.initState();
    _loadSampleProducts(); // In real app, load from database
    _setupPrinterListener();

    if (widget.initialProducts != null) {
      _allProducts = widget.initialProducts!;
      _filteredProducts = _allProducts;
    }
  }

  void _setupPrinterListener() {
    _printerSubscription = _printerService.eventStream.listen(_handlePrinterEvent);
  }

  void _handlePrinterEvent(PrinterEvent event) {
    if (!mounted) return;

    setState(() {
      switch (event.type) {
        case PrinterEventType.scanning:
          _isScanning = true;
          break;
        case PrinterEventType.scanComplete:
          _isScanning = false;
          break;
        case PrinterEventType.connecting:
          _statusMessage = 'Connecting to printer...';
          break;
        case PrinterEventType.connected:
          _isConnected = true;
          _statusMessage = 'Printer connected';
          break;
        case PrinterEventType.disconnected:
          _isConnected = false;
          _statusMessage = 'Printer disconnected';
          break;
        case PrinterEventType.printing:
          // Handled in bulk print
          break;
        case PrinterEventType.printed:
          _currentPrintIndex++;
          _updateProgress();
          break;
        case PrinterEventType.printFailed:
        case PrinterEventType.printError:
          _errorMessage = event.error;
          break;
        default:
          break;
      }
    });
  }

  void _updateProgress() {
    if (_totalPrints > 0) {
      _statusMessage = 'Printing $_currentPrintIndex of $_totalPrints labels...';
    }
  }

  void _loadSampleProducts() {
    // In real app, load from your product database/API
    _allProducts = [
      BulkPrintProduct(id: '1', barcode: 'SKU001', name: 'Rice Premium 5kg', price: 350.00),
      BulkPrintProduct(id: '2', barcode: 'SKU002', name: 'Cooking Oil 1L', price: 180.00),
      BulkPrintProduct(id: '3', barcode: 'SKU003', name: 'Sugar 2kg', price: 120.00),
      BulkPrintProduct(id: '4', barcode: 'SKU004', name: 'Tea Premium 500g', price: 250.00),
      BulkPrintProduct(id: '5', barcode: 'SKU005', name: 'Coffee 200g', price: 450.00),
      BulkPrintProduct(id: '6', barcode: 'SKU006', name: 'Milk Powder 400g', price: 380.00),
      BulkPrintProduct(id: '7', barcode: 'SKU007', name: 'Biscuits Pack', price: 60.00),
      BulkPrintProduct(id: '8', barcode: 'SKU008', name: 'Noodles Pack', price: 45.00),
      BulkPrintProduct(id: '9', barcode: 'SKU009', name: 'Shampoo 200ml', price: 220.00),
      BulkPrintProduct(id: '10', barcode: 'SKU010', name: 'Soap Bar', price: 35.00),
    ];
    _filteredProducts = List.from(_allProducts);
  }

  void _filterProducts(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredProducts = List.from(_allProducts);
      } else {
        _filteredProducts = _allProducts.where((p) =>
          p.name.toLowerCase().contains(query.toLowerCase()) ||
          p.barcode.toLowerCase().contains(query.toLowerCase())
        ).toList();
      }
    });
  }

  void _toggleSelection(BulkPrintProduct product) {
    setState(() {
      product.selected = !product.selected;
      if (product.selected) {
        _selectedProducts.add(product);
      } else {
        _selectedProducts.removeWhere((p) => p.id == product.id);
      }
      _updateSelectAllState();
    });
  }

  void _updateSelectAllState() {
    _selectAll = _filteredProducts.isNotEmpty &&
                 _filteredProducts.every((p) => p.selected);
  }

  void _toggleSelectAll() {
    setState(() {
      _selectAll = !_selectAll;
      for (var product in _filteredProducts) {
        product.selected = _selectAll;
        if (_selectAll) {
          if (!_selectedProducts.any((p) => p.id == product.id)) {
            _selectedProducts.add(product);
          }
        } else {
          _selectedProducts.removeWhere((p) => p.id == product.id);
        }
      }
    });
  }

  void _updateCopies(BulkPrintProduct product, int copies) {
    if (copies < 1) copies = 1;
    if (copies > 99) copies = 99;
    setState(() {
      product.copies = copies;
    });
  }

  Future<void> _startBulkPrint() async {
    if (_selectedProducts.isEmpty) {
      _showError('Please select at least one product');
      return;
    }

    if (!_isConnected) {
      // Navigate to printer setup
      final result = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (context) => const LabelPrinterScreen(),
        ),
      );
      if (result != true) return;
    }

    setState(() {
      _isPrinting = true;
      _currentPrintIndex = 0;
      _errorMessage = null;
    });

    // Calculate total prints
    _totalPrints = _selectedProducts.fold(0, (sum, p) => sum + p.copies);

    // Print each selected product
    for (var product in _selectedProducts) {
      if (!_isPrinting) break; // Allow cancellation

      for (int i = 0; i < product.copies; i++) {
        final result = await _printerService.printLabel(
          barcode: product.barcode,
          productName: product.name,
          price: product.price,
          mrp: product.mrp,
          copies: 1,
        );

        if (result is Failure<void>) {
          setState(() {
            _errorMessage = 'Failed to print ${product.name}: ${result.error}';
            _isPrinting = false;
          });
          _showPrintResultDialog(success: false);
          return;
        }

        setState(() {
          _currentPrintIndex++;
          _statusMessage = 'Printed $_currentPrintIndex of $_totalPrints labels';
        });

        // Small delay between prints to prevent printer buffer overflow
        await Future.delayed(const Duration(milliseconds: 500));
      }
    }

    setState(() {
      _isPrinting = false;
      _statusMessage = 'All labels printed successfully!';
    });

    _showPrintResultDialog(success: true);
  }

  void _showPrintResultDialog({required bool success}) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(success ? 'Print Complete' : 'Print Failed'),
        content: Text(
          success
              ? 'Successfully printed $_totalPrints labels'
              : _errorMessage ?? 'Unknown error occurred',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _clearSelection() {
    setState(() {
      for (var product in _allProducts) {
        product.selected = false;
      }
      _selectedProducts.clear();
      _selectAll = false;
    });
  }

  /// Import products from CSV file
  Future<void> _importFromCsv() async {
    // CSV import not supported on web
    if (kIsWeb) {
      _showError('CSV import is not available on web. Please use the mobile app.');
      return;
    }

    try {
      setState(() {
        _isImporting = true;
        _statusMessage = 'Selecting CSV file...';
      });

      // Pick file using conditional import (returns PickedFileData on mobile, throws on web)
      final fileData = await pickCsvFile() as PickedFileData?;

      if (fileData == null) {
        setState(() => _isImporting = false);
        return;
      }

      // fileData is PickedFileData with name, bytes
      setState(() => _statusMessage = 'Reading ${fileData.name}...');

      // Read file content
      final bytes = fileData.bytes;
      if (bytes == null) {
        _showError('Could not read file content');
        setState(() => _isImporting = false);
        return;
      }

      final content = utf8.decode(bytes);

      // Parse CSV
      final importService = CsvImportService();
      final importResult = await importService.parseCsv(content, filename: fileData.name);

      setState(() {
        _isImporting = false;
      });

      if (importResult.products.isNotEmpty) {
        // Add imported products to the list
        setState(() {
          // Remove duplicates (by barcode)
          final existingBarcodes = _allProducts.map((p) => p.barcode).toSet();
          final newProducts = importResult.products
              .where((p) => !existingBarcodes.contains(p.barcode))
              .toList();

          _allProducts.addAll(newProducts);
          _filteredProducts = List.from(_allProducts);

          // Select all imported products
          _selectedProducts.addAll(newProducts);

          _statusMessage = 'Imported ${importResult.successCount} products from ${fileData.name}';
        });

        // Show import summary dialog
        _showImportSummary(importResult);
      } else {
        _showError('No products could be imported. Check the file format.');
      }
    } catch (e) {
      setState(() {
        _isImporting = false;
        _errorMessage = 'Import failed: $e';
      });
    }
  }

  /// Show import summary dialog
  void _showImportSummary(CsvImportResult result) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Import Summary'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('✅ Successfully imported: ${result.successCount} products'),
            Text('📊 Total rows in file: ${result.totalRows}'),
            if (result.hasWarnings) ...[
              const SizedBox(height: 12),
              const Text('⚠️ Warnings:', style: TextStyle(fontWeight: FontWeight.bold)),
              ...result.warnings.take(5).map((w) =>
                Text('  • Row ${w.row}: ${w.message}', style: const TextStyle(fontSize: 12)),
              ),
              if (result.warnings.length > 5)
                Text('  • ... and ${result.warnings.length - 5} more', style: const TextStyle(fontSize: 12)),
            ],
            if (result.hasErrors) ...[
              const SizedBox(height: 12),
              const Text('❌ Errors:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
              ...result.errors.take(3).map((e) =>
                Text('  • Row ${e.row}: ${e.message}', style: const TextStyle(fontSize: 12, color: Colors.red)),
              ),
              if (result.errors.length > 3)
                Text('  • ... and ${result.errors.length - 3} more', style: const TextStyle(fontSize: 12)),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  /// Download CSV template
  Future<void> _downloadTemplate() async {
    final importService = CsvImportService();
    final template = importService.createTemplate();

    // In a real app, save to device storage or share
    // For now, show the template content
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('CSV Template'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Copy this content and save as a .csv file:',
                style: TextStyle(fontSize: 12),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SelectableText(
                  template,
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Required columns: barcode, name\n'
                'Optional columns: price, copies',
                style: TextStyle(fontSize: 12),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    _printerSubscription?.cancel();
    _printerService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bulk Label Printing'),
        actions: [
          // CSV Import
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'import') {
                _importFromCsv();
              } else if (value == 'template') {
                _downloadTemplate();
              }
            },
            itemBuilder: (context) => [
              // Only show import on non-web platforms (file_picker doesn't support web)
              if (!kIsWeb)
                const PopupMenuItem(
                  value: 'import',
                  child: Row(
                    children: [
                      Icon(Icons.upload_file),
                      SizedBox(width: 8),
                      Text('Import from CSV'),
                    ],
                  ),
                ),
              const PopupMenuItem(
                value: 'template',
                child: Row(
                  children: [
                    Icon(Icons.download),
                    SizedBox(width: 8),
                    Text('Download Template'),
                  ],
                ),
              ),
            ],
            icon: _isImporting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.more_vert),
          ),
          // Connection indicator
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Row(
                children: [
                  Icon(
                    Icons.bluetooth,
                    color: _isConnected ? Colors.green : Colors.grey,
                    size: 20,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _isConnected ? 'Connected' : 'Offline',
                    style: TextStyle(
                      color: _isConnected ? Colors.green : Colors.grey,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // CSV Import Instructions (shown when no products)
          if (_allProducts.isEmpty)
            Card(
              margin: const EdgeInsets.all(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue),
                        SizedBox(width: 8),
                        Text(
                          'Quick Start: Import from CSV',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      '1. Create a CSV file with columns: barcode, name, price, copies\n'
                      '2. Tap the menu (⋮) and select "Import from CSV"\n'
                      '3. Select your CSV file\n'
                      '4. Review imported products and tap "Print Labels"',
                      style: TextStyle(fontSize: 14),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: _downloadTemplate,
                          icon: const Icon(Icons.download, size: 18),
                          label: const Text('Download Template'),
                        ),
                        const SizedBox(width: 12),
                        OutlinedButton.icon(
                          onPressed: _importFromCsv,
                          icon: const Icon(Icons.upload_file, size: 18),
                          label: const Text('Import CSV'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

          // Search and Filter Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search products by name or barcode...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _filterProducts('');
                            },
                          )
                        : _allProducts.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.upload_file),
                                tooltip: 'Import from CSV',
                                onPressed: _importFromCsv,
                              )
                            : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onChanged: _filterProducts,
                ),
                const SizedBox(height: 12),
                // Selection controls
                Row(
                  children: [
                    Checkbox(
                      value: _selectAll,
                      onChanged: (_) => _toggleSelectAll(),
                    ),
                    const Text('Select All'),
                    const Spacer(),
                    Text(
                      '${_selectedProducts.length} selected',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    if (_selectedProducts.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      TextButton.icon(
                        onPressed: _clearSelection,
                        icon: const Icon(Icons.clear_all, size: 18),
                        label: const Text('Clear'),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),

          // Status message
          if (_statusMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: _errorMessage != null ? Colors.red.shade100 : Colors.green.shade100,
              child: Row(
                children: [
                  Icon(
                    _errorMessage != null ? Icons.error : Icons.info,
                    color: _errorMessage != null ? Colors.red : Colors.green,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage ?? _statusMessage!,
                      style: TextStyle(
                        color: _errorMessage != null ? Colors.red.shade900 : Colors.green.shade900,
                      ),
                    ),
                  ),
                  if (_isPrinting)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
            ),

          // Product List
          Expanded(
            child: _filteredProducts.isEmpty
                ? const Center(
                    child: Text(
                      'No products found',
                      style: TextStyle(color: Colors.grey),
                    ),
                  )
                : ListView.builder(
                    itemCount: _filteredProducts.length,
                    itemBuilder: (context, index) {
                      final product = _filteredProducts[index];
                      return Card(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 4,
                        ),
                        child: ListTile(
                          leading: Checkbox(
                            value: product.selected,
                            onChanged: (_) => _toggleSelection(product),
                          ),
                          title: Text(
                            product.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text('Barcode: ${product.barcode}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Price
                              Text(
                                '৳${product.price.toStringAsFixed(2)}',
                                style: TextStyle(
                                  color: Theme.of(context).primaryColor,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 16),
                              // Copy counter
                              if (product.selected)
                                Container(
                                  decoration: BoxDecoration(
                                    border: Border.all(color: Colors.grey.shade300),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.remove, size: 18),
                                        onPressed: () => _updateCopies(
                                          product,
                                          product.copies - 1,
                                        ),
                                      ),
                                      Text(
                                        '${product.copies}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add, size: 18),
                                        onPressed: () => _updateCopies(
                                          product,
                                          product.copies + 1,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                          onTap: () => _toggleSelection(product),
                        ),
                      );
                    },
                  ),
          ),

          // Bottom Action Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Summary
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Selected: ${_selectedProducts.length} products',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Total labels: ${_selectedProducts.fold(0, (sum, p) => sum + p.copies)}',
                              style: TextStyle(
                                color: Colors.grey.shade600,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Printer setup button
                      if (!_isConnected)
                        TextButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const LabelPrinterScreen(),
                              ),
                            );
                          },
                          icon: const Icon(Icons.settings_bluetooth),
                          label: const Text('Setup Printer'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Print button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _selectedProducts.isEmpty || _isPrinting
                          ? null
                          : _startBulkPrint,
                      icon: _isPrinting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.print),
                      label: Text(
                        _isPrinting
                            ? 'Printing... ($_currentPrintIndex/$_totalPrints)'
                            : 'Print ${_selectedProducts.fold(0, (sum, p) => sum + p.copies)} Labels',
                      ),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
