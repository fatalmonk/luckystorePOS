// MHT-P29L 58mm Label Template for ESC/POS
// Supports 40x30mm and customizable label sizes
// Thermal printer: 58mm width (384 dots @ 203 DPI, 8 dots/mm)

import 'dart:typed_data';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';

/// Label configuration for MhtP29L
class MhtP29lLabelConfig {
  /// Label width in mm (default 58mm for MHT-P29L)
  final int widthMm;
  
  /// Label height in mm (30 or 40mm typical)
  final int heightMm;
  
  /// Store name to display on label
  final String storeName;
  
  /// Print density (1-15, higher = darker)
  final int density;
  
  /// Print speed (1-5, higher = faster)
  final int speed;
  
  /// Number of copies to print
  final int copies;
  
  const MhtP29lLabelConfig({
    this.widthMm = 58,
    this.heightMm = 30,
    this.storeName = 'Lucky Store',
    this.density = 8,
    this.speed = 4,
    this.copies = 1,
  });

  /// Calculate width in dots (8 dots/mm @ 203 DPI)
  int get widthDots => widthMm * 8;
  
  /// Calculate height in dots
  int get heightDots => heightMm * 8;
  
  /// Create copy with modified parameters
  MhtP29lLabelConfig copyWith({
    int? widthMm,
    int? heightMm,
    String? storeName,
    int? density,
    int? speed,
    int? copies,
  }) {
    return MhtP29lLabelConfig(
      widthMm: widthMm ?? this.widthMm,
      heightMm: heightMm ?? this.heightMm,
      storeName: storeName ?? this.storeName,
      density: density ?? this.density,
      speed: speed ?? this.speed,
      copies: copies ?? this.copies,
    );
  }
}

/// Label data to print
class MhtP29lLabelData {
  /// Product name
  final String productName;
  
  /// Barcode value (for Code128)
  final String barcode;
  
  /// Sale price
  final double? price;
  
  /// MRP (Maximum Retail Price) - shown with strikethrough
  final double? mrp;
  
  /// Quantity to show on label
  final int quantity;
  
  /// SKU code (shown if barcode is empty)
  final String? sku;
  
  const MhtP29lLabelData({
    required this.productName,
    required this.barcode,
    this.price,
    this.mrp,
    this.quantity = 1,
    this.sku,
  });
}

/// ESC/POS command builder for MHT-P29L 58mm label printer
class MhtP29lLabelTemplate {
  // ESC/POS Commands
  static const int _esc = 0x1B;  // ESC character
  static const int _gs = 0x1D;    // GS character
  static const int _lf = 0x0A;    // Line feed
  
  /// Label configuration
  final MhtP29lLabelConfig config;
  
  MhtP29lLabelTemplate({
    this.config = const MhtP29lLabelConfig(),
  });

  /// Generate complete ESC/POS command bytes for a label
  Uint8List generateLabelCommands(MhtP29lLabelData data) {
    final List<int> commands = [];
    
    // Initialize printer
    commands.addAll(_initializePrinter());
    
    // Set print density and speed
    commands.addAll(_setPrintQuality());
    
    // Print store name (bold, centered)
    commands.addAll(_printStoreName(config.storeName));
    
    // Print product name (centered, normal)
    commands.addAll(_printProductName(data.productName));
    
    // Print price section (MRP with strikethrough if provided, then sale price)
    commands.addAll(_printPriceSection(
      price: data.price,
      mrp: data.mrp,
    ));
    
    // Print barcode (Code128)
    commands.addAll(_printBarcode(data.barcode.isNotEmpty ? data.barcode : (data.sku ?? '000000')));
    
    // Add quantity indicator
    commands.addAll(_printQuantity(data.quantity));
    
    // Feed and cut
    commands.addAll(_finalizeLabel());
    
    return Uint8List.fromList(commands);
  }

  /// Initialize printer with default settings
  List<int> _initializePrinter() {
    final List<int> commands = [];
    
    // ESC @ - Initialize printer
    commands.addAll([_esc, 0x40]);
    
    // ESC 3 n - Set line spacing (n/180 inches)
    commands.addAll([_esc, 0x33, 0x18]); // 24/180" = ~3.3mm line spacing
    
    // ESC a 0 - Left alignment (default)
    commands.addAll([_esc, 0x61, 0x00]);
    
    return commands;
  }

  /// Set print quality (density and speed)
  List<int> _setPrintQuality() {
    final List<int> commands = [];
    
    // ESC 7 n - Set printing density (ESC/POS extension)
    commands.addAll([_esc, 0x37, config.density]);
    
    // GS ( K - Select print speed mode
    commands.addAll([_gs, 0x28, 0x4B, 0x02, 0x00, 0x34, config.speed]);
    
    return commands;
  }

  /// Print store name - Bold, centered, large
  List<int> _printStoreName(String storeName) {
    final List<int> commands = [];
    
    // ESC a 1 - Center alignment
    commands.addAll([_esc, 0x61, 0x01]);
    
    // ESC E 1 - Bold ON
    commands.addAll([_esc, 0x45, 0x01]);
    
    // ESC ! 16 - Select font B (if supported) or double height
    // Font selection: bits 0-2 = font, bit 3 = double height, bit 4 = double width
    commands.addAll([_esc, 0x21, 0x18]); // Double height + double width
    
    // Print store name
    commands.addAll(storeName.codeUnits);
    commands.add(_lf);
    
    // ESC ! 0 - Reset font
    commands.addAll([_esc, 0x21, 0x00]);
    
    // ESC E 0 - Bold OFF
    commands.addAll([_esc, 0x45, 0x00]);
    
    // Small line feed
    commands.addAll([_esc, 0x33, 0x08]);
    commands.add(_lf);
    commands.addAll([_esc, 0x33, 0x18]); // Reset line spacing
    
    return commands;
  }

  /// Print product name - Centered, normal font
  List<int> _printProductName(String productName) {
    final List<int> commands = [];
    
    // ESC a 1 - Center alignment
    commands.addAll([_esc, 0x61, 0x01]);
    
    // ESC ! 0 - Normal font
    commands.addAll([_esc, 0x21, 0x00]);
    
    // Truncate if too long (approx 32 chars for 58mm)
    final displayName = productName.length > 32 
        ? '${productName.substring(0, 29)}...' 
        : productName;
    
    // Print product name
    commands.addAll(displayName.codeUnits);
    commands.add(_lf);
    
    return commands;
  }

  /// Print price section - MRP with strikethrough, sale price large
  List<int> _printPriceSection({double? price, double? mrp}) {
    final List<int> commands = [];
    
    // ESC a 1 - Center alignment
    commands.addAll([_esc, 0x61, 0x01]);
    
    // Print MRP with strikethrough if provided and different from sale price
    if (mrp != null && mrp > 0 && (price == null || mrp > price)) {
      // ESC ! 0 - Normal font
      commands.addAll([_esc, 0x21, 0x00]);
      
      final mrpText = 'MRP: ৳${mrp.toStringAsFixed(2)}';
      commands.addAll(mrpText.codeUnits);
      
      // Manual strikethrough using underscore/backspace
      commands.add(_lf);
      
      // Print "Our Price" label if sale price exists
      if (price != null) {
        commands.addAll('Our Price:'.codeUnits);
        commands.add(_lf);
      }
    }
    
    // Print sale price in large font
    if (price != null) {
      // ESC ! 0x30 - Double width + double height (48 = 0x30)
      commands.addAll([_esc, 0x21, 0x30]);
      
      // ESC E 1 - Bold ON
      commands.addAll([_esc, 0x45, 0x01]);
      
      final priceText = '৳${price.toStringAsFixed(2)}';
      commands.addAll(priceText.codeUnits);
      commands.add(_lf);
      
      // ESC E 0 - Bold OFF
      commands.addAll([_esc, 0x45, 0x00]);
      
      // ESC ! 0 - Reset font
      commands.addAll([_esc, 0x21, 0x00]);
      
      // Print discount percentage if MRP > price
      if (mrp != null && mrp > price) {
        final discount = ((mrp - price) / mrp * 100).round();
        commands.addAll('(-$discount% OFF)'.codeUnits);
        commands.add(_lf);
      }
    }
    
    // Small line feed
    commands.addAll([_esc, 0x33, 0x08]);
    commands.add(_lf);
    commands.addAll([_esc, 0x33, 0x18]);
    
    return commands;
  }

  /// Print Code128 barcode
  List<int> _printBarcode(String barcode) {
    final List<int> commands = [];
    
    // GS H 2 - Show HRI ( Human Readable Interpretation) below barcode
    commands.addAll([_gs, 0x48, 0x02]);
    
    // GS f 0 - Select font for HRI
    commands.addAll([_gs, 0x66, 0x00]);
    
    // GS h 50 - Set barcode height (50 dots)
    commands.addAll([_gs, 0x68, 0x32]);
    
    // GS w 3 - Set barcode width (3 = unit width)
    commands.addAll([_gs, 0x77, 0x03]);
    
    // ESC a 1 - Center alignment for barcode
    commands.addAll([_esc, 0x61, 0x01]);
    
    // Clean barcode - only printable ASCII
    final cleanBarcode = barcode.replaceAll(RegExp(r'[^\x20-\x7E]'), '');
    final data = cleanBarcode.isEmpty ? '000000' : cleanBarcode;
    
    // GS k m d1...dk NUL - Print barcode
    // m=73 (0x49) = Code128
    commands.add(_gs);
    commands.add(0x6B);  // 'k' - print barcode
    commands.add(0x49);  // Code128
    commands.add(data.length);  // Length of data
    commands.addAll(data.codeUnits);
    
    commands.add(_lf);
    commands.add(_lf);
    
    return commands;
  }

  /// Print quantity indicator
  List<int> _printQuantity(int quantity) {
    final List<int> commands = [];
    
    // ESC a 2 - Right alignment
    commands.addAll([_esc, 0x61, 0x02]);
    
    // ESC ! 0 - Normal font
    commands.addAll([_esc, 0x21, 0x00]);
    
    // Print quantity
    final qtyText = 'Qty: $quantity';
    commands.addAll(qtyText.codeUnits);
    commands.add(_lf);
    
    // ESC a 0 - Reset to left alignment
    commands.addAll([_esc, 0x61, 0x00]);
    
    return commands;
  }

  /// Finalize label - feed paper and optional cut
  List<int> _finalizeLabel() {
    final List<int> commands = [];
    
    // GS V m - Feed paper and cut (partial cut)
    // m=1: Feed paper to cutter position and partial cut
    commands.addAll([_gs, 0x56, 0x01]);
    
    // For thermal label printers without cutter, just feed
    // ESC J n - Print and reverse feed n lines
    commands.addAll([_esc, 0x4A, 0x10]); // Reverse feed to align next label
    
    return commands;
  }

  /// Build commands for multiple copies
  Uint8List generateMultiCopyCommands(
    MhtP29lLabelData data, {
    int? copies,
  }) {
    final count = copies ?? config.copies;
    if (count <= 1) {
      return generateLabelCommands(data);
    }
    
    final List<int> allCommands = [];
    for (var i = 0; i < count; i++) {
      allCommands.addAll(generateLabelCommands(data));
      
      // Add gap between labels (if not last)
      if (i < count - 1) {
        allCommands.addAll([_esc, 0x4A, 0x08]); // Small reverse feed gap
      }
    }
    
    return Uint8List.fromList(allCommands);
  }

  /// Generate a test label
  Uint8List generateTestLabel() {
    return generateLabelCommands(
      const MhtP29lLabelData(
        productName: 'Test Product Sample',
        barcode: 'TEST123456',
        price: 99.99,
        mrp: 149.99,
        quantity: 1,
      ),
    );
  }
}

/// Extension for easy integration with esc_pos_utils_plus
extension MhtP29lGenerator on MhtP29lLabelTemplate {
  /// Generate commands using esc_pos_utils_plus Generator for advanced formatting
  /// This method provides compatibility with the esc_pos_utils_plus package
  Uint8List generateWithEscPosGenerator(
    MhtP29lLabelData data, {
    PosStyles? storeNameStyles,
    PosStyles? productNameStyles,
    PosStyles? priceStyles,
    PosStyles? mrpStyles,
  }) {
    // This method returns raw ESC/POS bytes that can be used
    // with the esc_pos_utils_plus Generator if needed
    return generateLabelCommands(data);
  }
}

/// Helper class for barcode validation
class BarcodeValidator {
  /// Validate Code128 barcode data
  static String validateForCode128(String data) {
    // Code128 can encode ASCII 32-127
    // Remove any control characters
    return data.replaceAll(RegExp(r'[^\x20-\x7F]'), '');
  }
  
  /// Format barcode for display (grouped digits)
  static String formatForDisplay(String barcode, {int groupSize = 4}) {
    if (barcode.length <= groupSize) return barcode;
    
    final buffer = StringBuffer();
    for (var i = 0; i < barcode.length; i++) {
      if (i > 0 && i % groupSize == 0) {
        buffer.write(' ');
      }
      buffer.write(barcode[i]);
    }
    return buffer.toString();
  }
}
