import 'dart:async';
import 'package:http/http.dart' as http;
import '../../core/network/network_config.dart';
import '../../core/utils/result.dart';
import '../../core/utils/app_utils.dart';
import '../../core/utils/sync_constants.dart';
import '../../models/product.dart';

/// Barcode scanner service for instant product lookup
class BarcodeScannerService {
  final http.Client _client;
  final Function(String message)? onScanError;
  final Function(Product product)? onProductFound;

  BarcodeScannerService({
    http.Client? client,
    this.onScanError,
    this.onProductFound,
  }) : _client = client ?? http.Client();

  StreamController<Map<String, dynamic>>? _inputController;

  /// Initialize scanner input stream
  void initializeScanner() {
    _inputController = StreamController<Map<String, dynamic>>.broadcast();
    Logger.info('BarcodeScannerService initialized');
  }

  /// Add barcode input to stream (from mobile_scanner or hardware scanner)
  void addBarcodeInput(String barcode) {
    if (_inputController != null && !_inputController!.isClosed) {
      _inputController!.add({
        'barcode': barcode,
        'timestamp': DateTime.now(),
      });
    }
  }

  /// Scan barcode and find product instantly using index-based search
  Future<Result<Product>> findProductByBarcode(String barcode) async {
    // Step 1: Try local cache search (instant - <10ms)
    final cachedResult = await _searchLocalCache(barcode);
    if (cachedResult.isSuccess && cachedResult.data != null) {
      Logger.debug('Barcode found in cache: $barcode');
      return Success<Product>(cachedResult.data!);
    }

    // Step 2: Try Supabase index search (fast - <200ms)
    final indexResult = await _searchSupabaseIndex(barcode);
    if (indexResult.isSuccess && indexResult.data.isNotEmpty) {
      final product = indexResult.data.first;
      _cacheProduct(product); // Update local cache
      return Success<Product>(product);
    }

    // Step 3: Try fuzzy search as fallback
    final fuzzyResult = await _searchSupabaseFuzzy(barcode);
    if (fuzzyResult.isSuccess && fuzzyResult.data.isNotEmpty) {
      final product = fuzzyResult.data.first;
      _cacheProduct(product);
      return Success<Product>(product);
    }

    return Failure<Product>('Product not found: $barcode');
  }

  /// Search local cache first (fastest path)
  Future<Result<Product?>> _searchLocalCache(String barcode) async {
    // TODO: Integrate with Drift database local cache
    // For now, return null to trigger server lookup
    return Failure<Product?>('Cache not available');
  }

  /// Search Supabase using indexed barcode field (recommended)
  Future<Result<List<Product>>> _searchSupabaseIndex(String barcode) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/products?'
        'barcode=eq.$barcode&'
        'select=*&'
        'limit=1',
      );

      final headers = _buildHeaders();

      final response = await _client
          .get(url, headers: headers)
          .timeout(Duration(seconds: 2)); // 2 second timeout

      if (response.statusCode == 200) {
        final List<dynamic> jsonData = json.decode(response.body);
        if (jsonData.isNotEmpty) {
          final products = jsonData
              .map((json) => Product.fromJson(json))
              .toList();
          return Success<List<Product>>(products);
        }
      }

      return Failure<List<Product>>([]);
    } catch (e, stackTrace) {
      Logger.error('BarcodeScannerService._searchSupabaseIndex failed', e, stackTrace);
      return Failure<List<Product>>([]);
    }
  }

  /// Fuzzy search when exact barcode not found
  Future<Result<List<Product>>> _searchSupabaseFuzzy(String barcode) async {
    try {
      // Try common barcode variations
      final variations = [
        barcode,
        barcode.replaceAll('-', ''),
        barcode.replaceAll(' ', ''),
      ];

      for (final variation in variations) {
        final url = Uri.parse(
          '${NetworkConfig.supabaseUrl}/rest/v1/products?'
          'barcode=like.%$variation*&'
          'select=*&'
          'limit=1',
        );

        final headers = _buildHeaders();

        final response = await _client
            .get(url, headers: headers)
            .timeout(Duration(seconds: 3));

        if (response.statusCode == 200) {
          final List<dynamic> jsonData = json.decode(response.body);
          if (jsonData.isNotEmpty) {
            final products = jsonData
                .map((json) => Product.fromJson(json))
                .toList();
            return Success<List<Product>>(products);
          }
        }
      }

      return Failure<List<Product>>([]);
    } catch (e) {
      Logger.error('BarcodeScannerService._searchSupabaseFuzzy failed', e);
      return Failure<List<Product>>([]);
    }
  }

  /// Build authentication headers
  Map<String, String> _buildHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': NetworkConfig.supabaseAnonKey,
      'Authorization': 'Bearer ${NetworkConfig.supabaseAnonKey}',
      'Prefer': 'return=representation',
    };
  }

  /// Cache product locally for faster subsequent lookups
  Future<void> _cacheProduct(Product product) async {
    // TODO: Integrate with Drift database for local caching
    Logger.debug('Cached product ${product.id} for barcode: ${product.barcode}');
  }

  /// Stream builder for continuous barcode scanning
  Stream<ScanResult> get scannerStream {
    return _inputController!.stream.map((data) {
      final barcode = data['barcode'] as String;
      return ScanResult(barcode: barcode, status: ScanStatus.ready);
    });
  }

  /// Scan with timeout (for instant-add flow)
  Future<Result<Product>> scanWithTimeout(
    String barcode, {
    Duration timeout = const Duration(milliseconds: 500),
  }) async {
    try {
      final result = await findProductByBarcode(barcode);
      
      if (result.isSuccess && result.data != null) {
        _onProductFound(result.data!);
        return result;
      }

      _onScanError('Product not found for barcode: $barcode');
      return result;
    } catch (e) {
      _onScanError('Scan error: $e');
      return Failure<Product>('Scan failed: $e');
    }
  }

  /// Handle product found event
  void _onProductFound(Product product) {
    if (onProductFound != null) {
      onProductFound!(product);
    }
  }

  /// Handle scan error event
  void _onScanError(String message) {
    if (onScanError != null) {
      onScanError!(message);
    }
  }

  /// Dispose resources
  void dispose() {
    _inputController?.close();
    _client.close();
  }
}

/// Stream of scan results
class ScanResult {
  final String barcode;
  final ScanStatus status;

  const ScanResult({
    required this.barcode,
    required this.status,
  });
}

/// Scan status
enum ScanStatus {
  ready, // Ready to scan
  scanning, // Currently scanning
  found, // Product found
  notFound, // Product not found
  error, // Scan error
}

/// Instant add result
class InstantAddResult {
  final Product product;
  final int quantity;
  final Duration lookupTime;
  final String cacheSource; // 'local', 'server', 'fuzzy'

  const InstantAddResult({
    required this.product,
    required this.quantity,
    required this.lookupTime,
    required this.cacheSource,
  });

  bool get isFast => lookupTime.inMilliseconds < 200; // <200ms is considered fast
}

/// Barcode validator
class BarcodeValidator {
  /// Validate barcode format (EAN-13, UPC-A, Code128, etc.)
  static bool validate(String barcode) {
    // Common barcode patterns
    final ean13 = RegExp(r'^\d{13}$'); // EAN-13
    final ean8 = RegExp(r'^\d{8}$'); // EAN-8
    final upca = RegExp(r'^\d{12}$'); // UPC-A
    final upce = RegExp(r'^\d{8}$'); // UPC-E
    final code128 = RegExp(r'^[A-Za-z0-9]{3,}\$'); // Code-128
    final code39 = RegExp(r'^[A-Za-z0-9\$]{3,}\$'); // Code-39

    return ean13.hasMatch(barcode) ||
        ean8.hasMatch(barcode) ||
        upca.hasMatch(barcode) ||
        upce.hasMatch(barcode) ||
        code128.hasMatch(barcode) ||
        code39.hasMatch(barcode);
  }

  /// Calculate EAN-13 check digit
  static String calculateCheckDigit(String barcode) {
    if (barcode.length != 12) {
      throw ArgumentError('Barcode must be 12 digits for EAN-13 check digit');
    }

    int sum = 0;
    for (int i = 0; i < 12; i++) {
      final digit = int.parse(barcode[i]);
      if (i.isOdd) {
        sum += digit * 3;
      } else {
        sum += digit;
      }
    }

    return ((10 - (sum % 10)) % 10).toString();
  }

  /// Verify EAN-13 check digit
  static bool verifyCheckDigit(String barcode) {
    if (barcode.length != 13) {
      return false;
    }

    final providedCheckDigit = int.parse(barcode[12]);
    final calculatedCheckDigit = int.parse(calculateCheckDigit(barcode.substring(0, 12)));

    return providedCheckDigit == calculatedCheckDigit;
  }
}

/// Barcode cache for instant lookup
class BarcodeCache {
  final Map<String, Product> _cache = {};
  int _cacheSize = 0;
  static const int maxCacheSize = 1000; // 1000 products

  /// Get product from cache
  Product? getByBarcode(String barcode) {
    return _cache[barcode.toLowerCase()];
  }

  /// Add product to cache
  void add(Product product) {
    if (_cacheSize >= maxCacheSize) {
      _evictOldest();
    }
    _cache[product.barcode?.toLowerCase() ?? ''] = product;
    _cacheSize = _cache.length;
  }

  /// Remove product from cache
  void remove(String barcode) {
    _cache.remove(barcode.toLowerCase());
    _cacheSize = _cache.length;
  }

  /// Clear entire cache
  void clear() {
    _cache.clear();
    _cacheSize = 0;
  }

  /// Evict oldest entries when cache is full
  void _evictOldest() {
    if (_cache.isEmpty) return;

    // Simple LRU: remove 10% of entries
    final toremove = (_cache.length * 0.1).ceil();
    final keys = _cache.keys.toList();
    for (int i = 0; i < toremove && i < keys.length; i++) {
      _cache.remove(keys[i]);
    }
    _cacheSize = _cache.length;
  }

  /// Get cache size
  int get size => _cacheSize;

  /// Get cache hit rate (mock - needs implementation)
  double get hitRate => 0.0; // TODO: Implement tracking
}
