import 'package:csv/csv.dart';
import '../../features/inventory/presentation/screens/bulk_label_print_screen.dart';

/// Service for importing products from CSV files for bulk label printing
class CsvImportService {
  /// Column name variations accepted for each field
  static const Map<String, List<String>> _columnAliases = {
    'id': ['id', 'product_id', 'sku_id', 'item_id', 'productid', 'itemid'],
    'barcode': ['barcode', 'sku', 'code', 'gtin', 'ean', 'upc', 'product_code', 'sku_code', 'bar_code'],
    'name': ['name', 'product_name', 'title', 'product', 'description', 'productname', 'item_name'],
    'price': ['price', 'sale_price', 'retail_price', 'cost', 'unit_price', 'selling_price', 'rate', 'amount', 'our_price'],
    'mrp': ['mrp', 'max_retail_price', 'maximum_retail_price', 'list_price', 'original_price', 'old_price', 'was_price'],
    'copies': ['copies', 'quantity', 'qty', 'print_qty', 'labels', 'count', 'print_count', 'label_count'],
  };

  /// Maximum allowed rows per import
  static const int maxRows = 1000;

  /// Import result containing products and any errors
  final List<BulkPrintProduct> products = [];
  final List<CsvImportError> errors = [];
  final List<CsvImportWarning> warnings = [];

  List<String> _headers = [];

  /// Parse CSV string and return import result
  Future<CsvImportResult> parseCsv(String csvContent, {String? filename}) async {
    products.clear();
    errors.clear();
    warnings.clear();

    try {
      // Detect delimiter (comma or semicolon)
      final delimiter = _detectDelimiter(csvContent);

      // Parse CSV
      final csvConverter = CsvToListConverter(
        fieldDelimiter: delimiter,
        shouldParseNumbers: false, // Keep everything as strings for validation
      );

      final rows = csvConverter.convert(csvContent);

      if (rows.isEmpty) {
        errors.add(CsvImportError(
          row: 0,
          message: 'CSV file is empty',
          type: CsvErrorType.emptyFile,
        ));
        return CsvImportResult(
          products: [],
          errors: errors,
          warnings: warnings,
          totalRows: 0,
          successCount: 0,
        );
      }

      // Detect and validate headers
      _headers = _detectHeaders(rows);

      if (_headers.isEmpty) {
        errors.add(CsvImportError(
          row: 0,
          message: 'Could not detect column headers. First row must contain column names.',
          type: CsvErrorType.noHeaders,
        ));
        return CsvImportResult(
          products: [],
          errors: errors,
          warnings: warnings,
          totalRows: rows.length - 1,
          successCount: 0,
        );
      }

      // Check for required columns
      if (!_hasRequiredColumns()) {
        errors.add(CsvImportError(
          row: 0,
          message: 'Required column not found: "barcode" or "sku". '
              'Supported column names: ${_columnAliases['barcode']!.join(', ')}',
          type: CsvErrorType.missingRequiredColumn,
        ));
      }

      if (!_hasRequiredColumns(forName: true)) {
        errors.add(CsvImportError(
          row: 0,
          message: 'Required column not found: "name" or "product_name". '
              'Supported column names: ${_columnAliases['name']!.join(', ')}',
          type: CsvErrorType.missingRequiredColumn,
        ));
      }

      if (errors.isNotEmpty) {
        return CsvImportResult(
          products: [],
          errors: errors,
          warnings: warnings,
          totalRows: rows.length - 1,
          successCount: 0,
        );
      }

      // Check row limit
      final dataRows = rows.sublist(1);
      if (dataRows.length > maxRows) {
        errors.add(CsvImportError(
          row: 0,
          message: 'Too many rows. Maximum allowed: $maxRows. Found: ${dataRows.length}',
          type: CsvErrorType.tooManyRows,
        ));
        return CsvImportResult(
          products: [],
          errors: errors,
          warnings: warnings,
          totalRows: dataRows.length,
          successCount: 0,
        );
      }

      // Process each row
      final Set<String> seenBarcodes = {};
      for (int i = 0; i < dataRows.length; i++) {
        final row = dataRows[i];
        final rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

        final product = _parseRow(row, rowNumber);

        if (product != null) {
          // Check for duplicate barcodes
          if (seenBarcodes.contains(product.barcode)) {
            warnings.add(CsvImportWarning(
              row: rowNumber,
              message: 'Duplicate barcode "${product.barcode}". Only first occurrence imported.',
              type: CsvWarningType.duplicateBarcode,
            ));
            continue;
          }

          seenBarcodes.add(product.barcode);
          products.add(product);
        }
      }

      // Add summary warning if some rows failed
      if (products.length < dataRows.length) {
        final failedCount = dataRows.length - products.length;
        warnings.add(CsvImportWarning(
          row: 0,
          message: '$failedCount row(s) could not be imported due to errors',
          type: CsvWarningType.partialImport,
        ));
      }

      return CsvImportResult(
        products: products,
        errors: errors,
        warnings: warnings,
        totalRows: dataRows.length,
        successCount: products.length,
      );
    } catch (e) {
      errors.add(CsvImportError(
        row: 0,
        message: 'Failed to parse CSV: $e',
        type: CsvErrorType.parseError,
      ));
      return CsvImportResult(
        products: [],
        errors: errors,
        warnings: warnings,
        totalRows: 0,
        successCount: 0,
      );
    }
  }

  /// Detect the delimiter used in CSV (comma or semicolon)
  String _detectDelimiter(String content) {
    final firstLine = content.split('\n').first;
    final semicolonCount = firstLine.split(';').length - 1;
    final commaCount = firstLine.split(',').length - 1;
    return semicolonCount > commaCount ? ';' : ',';
  }

  /// Detect headers from first row
  List<String> _detectHeaders(List<List<dynamic>> rows) {
    if (rows.isEmpty) return [];

    final firstRow = rows.first;

    // Check if first row looks like headers (contains strings, not numbers)
    bool looksLikeHeaders = firstRow.every((cell) {
      final str = cell.toString().toLowerCase().trim();
      // Headers typically contain these words
      return str.contains('barcode') ||
          str.contains('sku') ||
          str.contains('code') ||
          str.contains('name') ||
          str.contains('product') ||
          str.contains('title') ||
          str.contains('price') ||
          str.contains('cost') ||
          str.contains('qty') ||
          str.contains('quantity') ||
          str.contains('copies') ||
          str.contains('id');
    });

    if (looksLikeHeaders) {
      return firstRow.map((cell) => cell.toString().trim().toLowerCase()).toList();
    }

    return [];
  }

  /// Check if required columns are present
  bool _hasRequiredColumns({bool forName = false}) {
    final requiredKey = forName ? 'name' : 'barcode';
    final possibleNames = _columnAliases[requiredKey]!;

    for (final header in _headers) {
      if (possibleNames.contains(header)) {
        return true;
      }
    }
    return false;
  }

  /// Get column index by field name (handles aliases)
  int? _getColumnIndex(String fieldName) {
    final possibleNames = _columnAliases[fieldName]!;
    for (int i = 0; i < _headers.length; i++) {
      if (possibleNames.contains(_headers[i])) {
        return i;
      }
    }
    return null;
  }

  /// Parse a single row into a BulkPrintProduct
  BulkPrintProduct? _parseRow(List<dynamic> row, int rowNumber) {
    // Get column indices
    final barcodeIndex = _getColumnIndex('barcode');
    final nameIndex = _getColumnIndex('name');
    final priceIndex = _getColumnIndex('price');
    final mrpIndex = _getColumnIndex('mrp');
    final copiesIndex = _getColumnIndex('copies');
    final idIndex = _getColumnIndex('id');

    // Validate required fields
    if (barcodeIndex == null || barcodeIndex >= row.length) {
      errors.add(CsvImportError(
        row: rowNumber,
        message: 'Missing barcode/SKU',
        type: CsvErrorType.missingValue,
      ));
      return null;
    }

    final barcode = row[barcodeIndex].toString().trim();
    if (barcode.isEmpty) {
      errors.add(CsvImportError(
        row: rowNumber,
        message: 'Barcode/SKU cannot be empty',
        type: CsvErrorType.emptyValue,
      ));
      return null;
    }

    if (nameIndex == null || nameIndex >= row.length) {
      errors.add(CsvImportError(
        row: rowNumber,
        message: 'Missing product name',
        type: CsvErrorType.missingValue,
      ));
      return null;
    }

    final name = row[nameIndex].toString().trim();
    if (name.isEmpty) {
      errors.add(CsvImportError(
        row: rowNumber,
        message: 'Product name cannot be empty',
        type: CsvErrorType.emptyValue,
      ));
      return null;
    }

    // Parse optional fields
    double? price;
    if (priceIndex != null && priceIndex < row.length) {
      final priceStr = row[priceIndex].toString().trim();
      if (priceStr.isNotEmpty) {
        price = double.tryParse(priceStr.replaceAll(RegExp(r'[^\d.]'), ''));
        if (price == null) {
          warnings.add(CsvImportWarning(
            row: rowNumber,
            message: 'Invalid price "$priceStr" for "$name". Set to 0.',
            type: CsvWarningType.invalidPrice,
          ));
          price = 0;
        }
      }
    }

    // Parse MRP (optional)
    double? mrp;
    if (mrpIndex != null && mrpIndex < row.length) {
      final mrpStr = row[mrpIndex].toString().trim();
      if (mrpStr.isNotEmpty) {
        mrp = double.tryParse(mrpStr.replaceAll(RegExp(r'[^\d.]'), ''));
        if (mrp == null) {
          warnings.add(CsvImportWarning(
            row: rowNumber,
            message: 'Invalid MRP "$mrpStr" for "$name".',
            type: CsvWarningType.invalidPrice,
          ));
        }
      }
    }

    int copies = 1;
    if (copiesIndex != null && copiesIndex < row.length) {
      final copiesStr = row[copiesIndex].toString().trim();
      if (copiesStr.isNotEmpty) {
        copies = int.tryParse(copiesStr) ?? 1;
        if (copies < 1) {
          warnings.add(CsvImportWarning(
            row: rowNumber,
            message: 'Copies must be at least 1. Set to 1.',
            type: CsvWarningType.invalidQuantity,
          ));
          copies = 1;
        }
        if (copies > 99) {
          warnings.add(CsvImportWarning(
            row: rowNumber,
            message: 'Copies cannot exceed 99. Set to 99.',
            type: CsvWarningType.invalidQuantity,
          ));
          copies = 99;
        }
      }
    }

    String? id;
    if (idIndex != null && idIndex < row.length) {
      id = row[idIndex].toString().trim();
    }

    return BulkPrintProduct(
      id: id ?? barcode,
      barcode: barcode,
      name: name,
      price: price ?? 0,
      mrp: mrp,
      copies: copies,
      selected: true, // Auto-select imported products
    );
  }

  /// Export products to CSV format
  String exportToCsv(List<BulkPrintProduct> products) {
    final rows = <List<dynamic>>[];

    // Header
    rows.add(['barcode', 'name', 'mrp', 'price', 'copies']);

    // Data rows
    for (final product in products) {
      rows.add([
        product.barcode,
        product.name,
        product.mrp?.toStringAsFixed(2) ?? '',
        product.price.toStringAsFixed(2),
        product.copies,
      ]);
    }

    return const ListToCsvConverter().convert(rows);
  }

  /// Create a sample CSV template
  String createTemplate() {
    final rows = [
      ['barcode', 'name', 'mrp', 'price', 'copies'],
      ['SKU001', 'Product Name 1', '150.00', '100.00', '5'],
      ['SKU002', 'Product Name 2', '200.00', '150.50', '3'],
      ['SKU003', 'Product Name 3', '100.00', '75.25', '10'],
    ];
    return const ListToCsvConverter().convert(rows);
  }
}

/// Import result containing products and errors
class CsvImportResult {
  final List<BulkPrintProduct> products;
  final List<CsvImportError> errors;
  final List<CsvImportWarning> warnings;
  final int totalRows;
  final int successCount;

  bool get hasErrors => errors.isNotEmpty;
  bool get hasWarnings => warnings.isNotEmpty;
  bool get isSuccess => errors.isEmpty && successCount > 0;

  CsvImportResult({
    required this.products,
    required this.errors,
    required this.warnings,
    required this.totalRows,
    required this.successCount,
  });
}

/// CSV import error
class CsvImportError {
  final int row;
  final String message;
  final CsvErrorType type;

  CsvImportError({
    required this.row,
    required this.message,
    required this.type,
  });
}

/// CSV import warning
class CsvImportWarning {
  final int row;
  final String message;
  final CsvWarningType type;

  CsvImportWarning({
    required this.row,
    required this.message,
    required this.type,
  });
}

/// Error types
enum CsvErrorType {
  emptyFile,
  noHeaders,
  missingRequiredColumn,
  tooManyRows,
  parseError,
  missingValue,
  emptyValue,
}

/// Warning types
enum CsvWarningType {
  duplicateBarcode,
  invalidPrice,
  invalidQuantity,
  partialImport,
}
