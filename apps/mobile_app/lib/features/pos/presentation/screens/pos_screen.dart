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
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_breakpoints.dart';
import './payment_screen.dart';
import '../widgets/category_bar.dart';
import '../widgets/product_grid.dart';
import '../widgets/cart_panel.dart';
import '../widgets/favorites_row.dart';
import '../widgets/pos_dialogs.dart';
import '../providers/pos_search_provider.dart';

/// The main POS cashier screen — a landscape split-panel tablet UI.
/// Left (60-75%): searchable product grid with category filters + barcode scanner.
/// Right (25-40%): live cart with totals and the Charge button.
/// 
/// Architecture:
/// - Uses ChangeNotifier for search state management (PosSearchProvider)
/// - Responsive breakpoints from AppBreakpoints
/// - FavoritesRow for quick-access items
class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  final MobileScannerController _scanCtrl = MobileScannerController();
  bool _scanning = false;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(_onSearchChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  Future<void> _init() async {
    final pos = context.read<PosProvider>();
    final auth = context.read<AuthProvider>();

    if (pos.storeId == null || pos.storeId!.isEmpty) {
      final appUser = auth.appUser;
      if (appUser != null && appUser.storeId.isNotEmpty) {
        await pos.loadFromAppUser(appUser);
      }
    }

    await context.read<PosSearchProvider>().initialize();
  }

  void _onSearchChanged() {
    final query = _searchCtrl.text.trim();
    final searchProvider = context.read<PosSearchProvider>();
    searchProvider.search(query, categoryId: searchProvider.selectedCategoryId);
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
      content: Text(msg, style: AppTextStyles.labelMd.copyWith(color: Colors.white)),
      backgroundColor: success ? AppColors.successDefault : AppColors.dangerDefault,
      duration: const Duration(seconds: 2),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
    ));
  }

  @override
  void dispose() {
    _searchCtrl.removeListener(_onSearchChanged);
    _searchCtrl.dispose();
    _scanCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final layout = AppBreakpoints.getLayout(screenWidth);
    final flex = AppBreakpoints.getPanelFlex(layout);
    final constraints = AppBreakpoints.getPanelConstraints(layout);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDefault,
        body: SafeArea(
          child: Stack(
            children: [
              Row(
                children: [
                  // ── LEFT PANEL ─────────────────────────────────────────
                  Flexible(
                    flex: flex.left,
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minWidth: constraints.minLeft),
                      child: _buildLeftPanel(layout),
                    ),
                  ),
                  // Divider
                  Container(width: 1, color: AppColors.borderDefault),
                  // ── RIGHT PANEL ────────────────────────────────────────
                  Flexible(
                    flex: flex.right,
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minWidth: constraints.minRight),
                      child: _buildRightPanel(),
                    ),
                  ),
                ],
              ),
              if (_scanning) _buildScannerOverlay(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLeftPanel(PosLayout layout) {
    return Column(
      children: [
        _buildTopBar(layout),
        if (kDebugMode) _buildDebugBanner(),
        Selector<PosSearchProvider, ({List<PosCategory> cats, String? selected})>(
          selector: (_, p) => (cats: p.categories, selected: p.selectedCategoryId),
          builder: (_, data, __) => CategoryBar(
            categories: data.cats,
            selectedCategoryId: data.selected,
            onCategorySelected: (catId) {
              context.read<PosSearchProvider>().setCategory(catId);
            },
          ),
        ),
        const SizedBox(height: 1),
        // Favorites row for quick access
        Selector<PosSearchProvider, ({List<PosItem> items, bool loading, bool allowAdd})>(
          selector: (_, p) => (
            items: p.items.take(5).toList(),
            loading: p.loadState == PosLoadState.loading,
            allowAdd: p.allowProductAdd,
          ),
          builder: (_, data, __) => FavoritesRow(
            favorites: data.items,
            onTap: (item) {
              if (data.allowAdd) {
                context.read<PosProvider>().addItem(item);
                _showSnack('Added: ${item.name}', success: true);
              } else {
                _showSnack('Product loading failed. Retry before adding items.', success: false);
              }
            },
            storeId: context.read<PosProvider>().storeId,
            isLoading: data.loading,
          ),
        ),
        Expanded(
          child: Selector<PosSearchProvider, ({List<PosItem> items, PosLoadState state, String? error, bool allowAdd})>(
            selector: (_, p) => (
              items: p.items,
              state: p.loadState,
              error: p.loadError,
              allowAdd: p.allowProductAdd,
            ),
            builder: (_, data, __) => ProductGrid(
              items: data.items,
              loadState: data.state,
              loadError: data.error,
              storeId: context.read<PosProvider>().storeId ?? 'unknown',
              allowProductAdd: data.allowAdd,
              onRetry: () => context.read<PosSearchProvider>().retry(),
              onAddToCart: (item) {
                if (data.allowAdd) {
                  context.read<PosProvider>().addItem(item);
                } else {
                  _showSnack('Product loading failed. Retry before adding items.', success: false);
                }
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTopBar(PosLayout layout) {
    final isTablet = layout == PosLayout.tablet || layout == PosLayout.largeTablet || layout == PosLayout.desktop;
    final isSmallScreen = layout == PosLayout.smallPhone;
    
    return Container(
      height: 64,
      padding: EdgeInsets.symmetric(
        horizontal: isSmallScreen ? 8 : 16, 
        vertical: 10,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surfaceDefault,
        border: Border(bottom: BorderSide(color: AppColors.borderDefault)),
      ),
      child: Row(
        children: [
          // Branded App Pill
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: isSmallScreen ? 8 : 12, 
              vertical: 6,
            ),
            decoration: BoxDecoration(
              color: AppColors.primaryDefault,
              borderRadius: AppRadius.borderMd,
              boxShadow: AppShadows.elevation1,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.shopping_bag_rounded, color: AppColors.primaryOn, size: 16),
                if (isTablet && !isSmallScreen) ...[
                  const SizedBox(width: 8),
                  Text(
                    'LUCKY POS',
                    style: AppTextStyles.labelMd.copyWith(
                      color: AppColors.primaryOn,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ],
            ),
          ),
          SizedBox(width: isSmallScreen ? 8 : 12),

          // Search bar
          Expanded(
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.backgroundSubtle,
                borderRadius: AppRadius.borderMd,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: TextField(
                controller: _searchCtrl,
                style: AppTextStyles.bodyMd,
                decoration: InputDecoration(
                  hintText: isSmallScreen ? 'Search...' : 'Search products, SKU...',
                  hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textMuted),
                  prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primaryDefault, size: 20),
                  suffixIcon: _searchCtrl.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close_rounded, color: AppColors.textMuted, size: 18),
                          onPressed: () { 
                            _searchCtrl.clear();
                            context.read<PosSearchProvider>().clearSearch();
                          })
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
          ),
          SizedBox(width: isSmallScreen ? 8 : 12),

          _iconButton(
            icon: Icons.qr_code_scanner_rounded,
            active: _scanning,
            tooltip: 'Scan',
            onTap: () => setState(() => _scanning = !_scanning),
          ),
          
          if (!isSmallScreen) ...[
            const SizedBox(width: 8),
            Consumer<PosProvider>(
              builder: (ctx, pos, _) => _iconButton(
                icon: Icons.person_rounded,
                tooltip: pos.cashierName ?? 'Cashier',
                onTap: () => showCashierDialog(context, pos),
              ),
            ),
          ],
          
          const SizedBox(width: 8),
          
          _iconButton(
            icon: Icons.more_vert_rounded,
            tooltip: 'More',
            onTap: () {},
            isMenu: true,
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
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: AppColors.primarySubtle,
          child: Text(
            'Store: ${d['store_id'] ?? 'null'} | Items: ${d['last_item_count'] ?? 0} | Last OK: ${_formatTimestamp(pos.lastSuccessfulCatalogLoadAt)} | Error: $lastError',
            style: AppTextStyles.bodyXs.copyWith(
              color: AppColors.primaryDefault,
              fontWeight: FontWeight.w600,
              fontFamily: 'monospace',
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        );
      },
    );
  }

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

  Widget _buildScannerOverlay() {
    return Positioned.fill(
      child: Stack(
        children: [
          GestureDetector(
            onTap: () => setState(() {
              _scanning = false;
              _scanCtrl.stop();
            }),
            child: Container(color: Colors.black.withValues(alpha: 0.8)),
          ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 280,
                  height: 280,
                  decoration: BoxDecoration(
                    borderRadius: AppRadius.borderLg,
                    border: Border.all(color: AppColors.primaryDefault, width: 3),
                  ),
                  clipBehavior: Clip.hardEdge,
                  child: MobileScanner(
                    controller: _scanCtrl,
                    onDetect: _onBarcodeDetected,
                  ),
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDefault,
                    borderRadius: AppRadius.borderFull,
                  ),
                  child: Text(
                    'Point at barcode or QR code',
                    style: AppTextStyles.labelMd.copyWith(color: AppColors.textPrimary),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _iconButton({
    required IconData icon,
    required VoidCallback onTap,
    bool active = false,
    String? tooltip,
    bool isMenu = false,
  }) {
    final button = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isMenu ? null : onTap,
        borderRadius: AppRadius.borderMd,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: active
                ? AppColors.primarySubtle
                : AppColors.backgroundSubtle,
            borderRadius: AppRadius.borderMd,
            border: Border.all(
              color: active ? AppColors.primaryDefault : AppColors.borderDefault,
            ),
          ),
          child: Icon(
            icon,
            color: active ? AppColors.primaryDefault : AppColors.textPrimary,
            size: 22,
          ),
        ),
      ),
    );

    if (isMenu) {
      return PopupMenuButton<String>(
        offset: const Offset(0, 52),
        shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
        child: button,
        onSelected: (value) {
          if (value == 'bulk_print') {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const BulkLabelPrintScreen()));
          } else if (value == 'test_printer') {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const PrinterTestScreen()));
          }
        },
        itemBuilder: (context) => [
          PopupMenuItem(
            value: 'bulk_print',
            child: Row(
              children: [
                const Icon(Icons.print_rounded, size: 20, color: AppColors.textPrimary),
                const SizedBox(width: 12),
                Text('Bulk Print Labels', style: AppTextStyles.labelMd),
              ],
            ),
          ),
          PopupMenuItem(
            value: 'test_printer',
            child: Row(
              children: [
                const Icon(Icons.bug_report_rounded, size: 20, color: AppColors.textPrimary),
                const SizedBox(width: 12),
                Text('Test Printer', style: AppTextStyles.labelMd),
              ],
            ),
          ),
        ],
      );
    }

    return Tooltip(message: tooltip ?? '', child: button);
  }

  String _formatTimestamp(DateTime? value) {
    if (value == null) return 'never';
    final local = value.toLocal();
    final h = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final m = local.minute.toString().padLeft(2, '0');
    final period = local.hour < 12 ? 'AM' : 'PM';
    return '${local.month}/${local.day} $h:$m $period';
  }
}
