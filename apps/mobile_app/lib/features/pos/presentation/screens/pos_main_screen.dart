import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../../../../models/pos_models.dart';
import '../../../../shared/providers/pos_provider.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../core/services/printer/printer_test_screen.dart';
import '../../../inventory/presentation/screens/bulk_label_print_screen.dart';
import './payment_screen.dart';
import '../widgets/category_bar.dart';
import '../widgets/product_grid.dart';
import '../widgets/cart_panel.dart';
import '../widgets/pos_dialogs.dart';

/// The main POS cashier screen — a landscape split-panel tablet UI.
/// Left (60%): searchable product grid with category filters + barcode scanner.
/// Right (40%): live cart with totals and the Charge button.
class PosMainScreen extends StatefulWidget {
  const PosMainScreen({super.key});

  @override
  State<PosMainScreen> createState() => _PosMainScreenState();
}

class _PosMainScreenState extends State<PosMainScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  final MobileScannerController _scanCtrl = MobileScannerController();

  List<PosItem>  _items       = [];
  List<PosCategory> _categories = [];
  String? _selectedCategoryId;
  bool _scanning   = false;
  PosLoadState _loadState = PosLoadState.loading;
  String? _loadError;
  String _searchQuery = '';
  bool _allowProductAdd = true;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(_onSearchChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  Future<void> _init() async {
    final pos = context.read<PosProvider>();
    final auth = context.read<AuthProvider>();

    // Check if we need to set the store context from authenticated user
    if (pos.storeId == null || pos.storeId!.isEmpty) {
      final appUser = auth.appUser;
      if (appUser != null && appUser.storeId.isNotEmpty) {
        debugPrint('[PosMainScreen] Loading store context from appUser: ${appUser.storeId}');
        await pos.loadFromAppUser(appUser);
        debugPrint('[PosMainScreen] Store context after load: ${pos.storeId}');
      }
    }

    setState(() {
      _loadState = PosLoadState.loading;
      _loadError = null;
    });
    final catalog = await pos.loadProductCatalog(
      query: _searchQuery,
      categoryId: _selectedCategoryId,
    );
    if (!mounted) return;
    final hasError = catalog.hasError;
    final isEmpty = catalog.items.isEmpty;
    setState(() {
      _categories = catalog.categories;
      _items = catalog.items;
      _loadError = catalog.error;
      _allowProductAdd = !catalog.hasError;
      _loadState = hasError
          ? PosLoadState.error
          : (isEmpty ? PosLoadState.empty : PosLoadState.ready);
    });
  }

  void _onSearchChanged() {
    final q = _searchCtrl.text.trim();
    if (q == _searchQuery) return;
    _searchQuery = q;
    _doSearch(q, _selectedCategoryId);
  }

  Future<void> _doSearch(String q, String? catId) async {
    setState(() {
      _loadState = PosLoadState.loading;
      _loadError = null;
    });
    final pos = context.read<PosProvider>();
    List<PosItem> items = const [];
    String? error;
    try {
      items = await pos.searchItems(q, categoryId: catId);
    } catch (e) {
      error = _cleanError(e);
    }
    if (!mounted) return;
    setState(() {
      _items = items;
      _categories = _categories;
      _loadError = error ?? pos.posDebugSnapshot['last_load_error'] as String?;
      _allowProductAdd = _loadError == null;
      _loadState = _loadError != null
          ? PosLoadState.error
          : (items.isEmpty ? PosLoadState.empty : PosLoadState.ready);
    });
  }

  Future<void> _onBarcodeDetected(BarcodeCapture capture) async {
    final rawValue = capture.barcodes.firstOrNull?.rawValue;
    if (rawValue == null || !_scanning) return;
    setState(() => _scanning = false);
    _scanCtrl.stop();

    final pos = context.read<PosProvider>();
    final item = await pos.scanItem(rawValue);
    if (!mounted) return;
    if (item != null) {
      pos.addItem(item);
      _showSnack('Added: ${item.name}', success: true);
    } else {
      _showSnack('Item not found: $rawValue', success: false);
    }
  }

  void _showSnack(String msg, {required bool success}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: success ? const Color(0xFF2ECC71) : const Color(0xFFE74C3C),
      duration: const Duration(seconds: 2),
      behavior: SnackBarBehavior.floating,
    ));
  }

  @override
  void dispose() {
    _searchCtrl.removeListener(_onSearchChanged);
    _searchCtrl.dispose();
    _scanCtrl.dispose();
    super.dispose();
  }

  // ─────────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth >= 600;
    final isLargeTablet = screenWidth >= 900;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFF0D1117),
        body: SafeArea(
          child: Stack(
            children: [
              // Responsive layout: split view for tablets, adjusted flex for different sizes
              Row(
                children: [
                  // ── LEFT PANEL ─────────────────────────────────────────
                  Expanded(
                    flex: isLargeTablet ? 70 : (isTablet ? 65 : 60),
                    child: _buildLeftPanel(),
                  ),
                  // Divider
                  Container(width: 1, color: Colors.white.withValues(alpha: 0.06)),
                  // ── RIGHT PANEL ────────────────────────────────────────
                  ConstrainedBox(
                    constraints: const BoxConstraints(minWidth: 280),
                    child: Expanded(
                      flex: isLargeTablet ? 30 : (isTablet ? 35 : 40),
                      child: _buildRightPanel(),
                    ),
                  ),
                ],
              ),
              // Barcode scanner overlay
              if (_scanning) _buildScannerOverlay(),
            ],
          ),
        ),
      ),
    );
  }

  // ── LEFT PANEL ─────────────────────────────────────────────────────────────

  Widget _buildLeftPanel() {
    return Column(
      children: [
        _buildTopBar(),
        if (kDebugMode) _buildDebugBanner(),
        CategoryBar(
          categories: _categories,
          selectedCategoryId: _selectedCategoryId,
          onCategorySelected: (catId) {
            setState(() => _selectedCategoryId = catId);
            _doSearch(_searchQuery, catId);
          },
        ),
        const SizedBox(height: 4),
        Expanded(
          child: ProductGrid(
            items: _items,
            loadState: _loadState,
            loadError: _loadError,
            storeId: context.read<PosProvider>().storeId ?? 'unknown',
            allowProductAdd: _allowProductAdd,
            onRetry: _init,
            onAddToCart: (item) {
              if (_allowProductAdd) {
                context.read<PosProvider>().addItem(item);
              } else {
                _showSnack(
                  'Product loading failed. Retry before adding items.',
                  success: false,
                );
              }
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTopBar() {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
      ),
      child: Row(
        children: [
          // Lucky Store logo pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [Color(0xFFE8B84B), Color(0xFFD4941A)]),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              children: [
                Icon(Icons.store_rounded, color: Colors.white, size: 14),
                SizedBox(width: 4),
                Text('LUCKY POS',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5)),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Search bar
          Expanded(
            child: TextField(
              controller: _searchCtrl,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search product, SKU, or brand...',
                hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.35), fontSize: 14),
                prefixIcon: Icon(Icons.search, color: Colors.white.withValues(alpha: 0.4), size: 18),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(Icons.clear, color: Colors.white.withValues(alpha: 0.4), size: 16),
                        onPressed: () { _searchCtrl.clear(); })
                    : null,
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.06),
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide.none),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Barcode scan button
          _iconButton(
            icon: Icons.qr_code_scanner_rounded,
            active: _scanning,
            tooltip: 'Scan barcode',
            onTap: () => setState(() => _scanning = !_scanning),
          ),
          const SizedBox(width: 4),

          Consumer<PosProvider>(
            builder: (ctx, pos, _) => _iconButton(
              icon: Icons.person_outline_rounded,
              tooltip: pos.cashierName ?? 'Cashier',
              onTap: () => showCashierDialog(context, pos),
            ),
          ),
          const SizedBox(width: 4),
          Consumer<PosProvider>(
            builder: (ctx, pos, _) => _iconButton(
              icon: Icons.bug_report_outlined,
              tooltip: 'POS debug snapshot',
              onTap: () => showPosDebugDialog(
                context,
                pos,
                categories: _categories,
                items: _items,
                onReload: () async {
                  await _init();
                  if (!mounted) return;
                  _showSnack('POS data reloaded', success: true);
                },
              ),
            ),
          ),
          const SizedBox(width: 4),
          // More actions menu
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.white70, size: 20),
            tooltip: 'More actions',
            padding: EdgeInsets.zero,
            onSelected: (value) {
              if (value == 'bulk_print') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const BulkLabelPrintScreen(),
                  ),
                );
              } else if (value == 'test_printer') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const PrinterTestScreen(),
                  ),
                );
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'bulk_print',
                child: Row(
                  children: [
                    Icon(Icons.print_outlined, size: 20),
                    SizedBox(width: 8),
                    Text('Bulk Print Labels'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'test_printer',
                child: Row(
                  children: [
                    Icon(Icons.bug_report, size: 20),
                    SizedBox(width: 8),
                    Text('Test Printer'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDebugBanner() {
    return Consumer<PosProvider>(
      builder: (context, pos, _) {
        final d = pos.posDebugSnapshot;
        final lastError = (d['last_load_error'] as String?) ?? 'none';
        const mode = 'RPC';
        final lastSuccess = _formatTimestamp(pos.lastSuccessfulCatalogLoadAt);
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          color: const Color(0xFF0B1320),
          child: Text(
            'Mode: $mode  |  Store: ${d['store_id'] ?? 'null'}  |  Items: ${d['last_item_count'] ?? 0}  |  Cats: ${d['last_category_count'] ?? 0}  |  Last OK: $lastSuccess  |  Last Error: $lastError',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 11,
              fontFamily: 'monospace',
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        );
      },
    );
  }

  // ── RIGHT PANEL ────────────────────────────────────────────────────────────

  Widget _buildRightPanel() {
    return Consumer<PosProvider>(
      builder: (ctx, pos, _) => CartPanel(
        cartItems: pos.cart,
        itemCount: pos.itemCount,
        cartIsEmpty: pos.cartIsEmpty,
        subtotal: pos.subtotal,
        cartDiscount: pos.cartDiscount,
        totalAmount: pos.totalAmount,
        onClearCart: () => showClearCartDialog(context, pos),
        onShowDiscountDialog: () => showDiscountDialog(context, pos),
        onCharge: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const PaymentScreen()),
        ),
        onRemoveItemAt: (int index) => () => pos.removeItem(pos.cart[index].item.id),
        onQtyChangedAt: (int index) => (int q) => pos.setQty(pos.cart[index].item.id, q),
      ),
    );
  }

  // ── Scanner overlay ─────────────────────────────────────────────────────────

  Widget _buildScannerOverlay() {
    return Positioned.fill(
      child: Stack(
        children: [
          // Blurred background tap to dismiss
          GestureDetector(
            onTap: () => setState(() {
              _scanning = false;
              _scanCtrl.stop();
            }),
            child: Container(color: Colors.black.withValues(alpha: 0.75)),
          ),
          // Scanner viewport
          Center(
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE8B84B), width: 2),
              ),
              clipBehavior: Clip.hardEdge,
              child: MobileScanner(
                controller: _scanCtrl,
                onDetect: _onBarcodeDetected,
              ),
            ),
          ),
          // Label
          Center(
            child: Transform.translate(
              offset: const Offset(0, 170),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(20)),
                child: const Text('Point at barcode or QR code',
                    style: TextStyle(color: Colors.white, fontSize: 13)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  Widget _iconButton({
    required IconData icon,
    required VoidCallback onTap,
    bool active = false,
    String? tooltip,
  }) {
    return Tooltip(
      message: tooltip ?? '',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: active
                  ? const Color(0xFFE8B84B).withValues(alpha: 0.15)
                  : Colors.white.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                  color: active
                      ? const Color(0xFFE8B84B).withValues(alpha: 0.5)
                      : Colors.transparent),
            ),
            child: Icon(icon,
                color: active
                    ? const Color(0xFFE8B84B)
                    : Colors.white.withValues(alpha: 0.6),
                size: 18),
          ),
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime? value) {
    if (value == null) return 'never';
    final local = value.toLocal();
    final h = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final m = local.minute.toString().padLeft(2, '0');
    final s = local.second.toString().padLeft(2, '0');
    final period = local.hour < 12 ? 'AM' : 'PM';
    return '${local.month}/${local.day} $h:$m:$s $period';
  }

  String _cleanError(Object e) {
    final raw = e.toString().replaceFirst('Exception:', '').trim();
    if (raw.isEmpty) return 'Unknown error';
    return raw.length > 180 ? '${raw.substring(0, 180)}...' : raw;
  }
}