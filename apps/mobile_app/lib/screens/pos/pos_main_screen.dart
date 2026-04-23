import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../../models/pos_models.dart';
import '../../providers/pos_provider.dart';
import '../../providers/auth_provider.dart';
import 'payment_screen.dart';
import 'pos_session_summary_screen.dart';

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
  bool _loadingItems = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(_onSearchChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  Future<void> _init() async {
    final pos = context.read<PosProvider>();
    final cats = await pos.loadCategories();
    final items = await pos.searchItems('');
    if (!mounted) return;
    setState(() {
      _categories = cats;
      _items = items;
    });
  }

  void _onSearchChanged() {
    final q = _searchCtrl.text.trim();
    if (q == _searchQuery) return;
    _searchQuery = q;
    _doSearch(q, _selectedCategoryId);
  }

  Future<void> _doSearch(String q, String? catId) async {
    setState(() => _loadingItems = true);
    final pos = context.read<PosProvider>();
    final items = await pos.searchItems(q, categoryId: catId);
    if (!mounted) return;
    setState(() { _items = items; _loadingItems = false; });
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
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFF0D1117),
        body: SafeArea(
          child: Stack(
            children: [
              Row(
                children: [
                  // ── LEFT PANEL ─────────────────────────────────────────
                  Expanded(
                    flex: 60,
                    child: _buildLeftPanel(),
                  ),
                  // Divider
                  Container(width: 1, color: Colors.white.withValues(alpha: 0.06)),
                  // ── RIGHT PANEL ────────────────────────────────────────
                  Expanded(
                    flex: 40,
                    child: _buildRightPanel(),
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
        _buildCategoryChips(),
        const SizedBox(height: 4),
        Expanded(child: _buildProductGrid()),
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
              onTap: () => _showCashierDialog(pos),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChips() {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        children: [
          _chip('All', selected: _selectedCategoryId == null,
              onTap: () { setState(() => _selectedCategoryId = null); _doSearch(_searchQuery, null); }),
          ..._categories.map((c) => _chip(c.name,
              selected: _selectedCategoryId == c.id,
              count: c.itemCount,
              onTap: () {
                setState(() => _selectedCategoryId = c.id);
                _doSearch(_searchQuery, c.id);
              })),
        ],
      ),
    );
  }

  Widget _chip(String label, {
    required bool selected,
    int? count,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFFE8B84B)
              : Colors.white.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: selected
                  ? const Color(0xFFE8B84B)
                  : Colors.white.withValues(alpha: 0.12)),
        ),
        child: Text(
          count != null ? '$label ($count)' : label,
          style: TextStyle(
              color: selected ? Colors.black : Colors.white.withValues(alpha: 0.75),
              fontSize: 12,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w400),
        ),
      ),
    );
  }

  Widget _buildProductGrid() {
    if (_loadingItems) {
      return const Center(
          child: CircularProgressIndicator(color: Color(0xFFE8B84B)));
    }
    if (_items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded,
                color: Colors.white.withValues(alpha: 0.2), size: 48),
            const SizedBox(height: 8),
            Text('No products found',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.35))),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 0.82,
      ),
      itemCount: _items.length,
      itemBuilder: (ctx, i) => _ProductTile(
        item: _items[i],
        onTap: () => context.read<PosProvider>().addItem(_items[i]),
      ),
    );
  }

  // ── RIGHT PANEL ────────────────────────────────────────────────────────────

  Widget _buildRightPanel() {
    return Consumer<PosProvider>(
      builder: (ctx, pos, _) => Column(
        children: [
          // Cart header
          Container(
            height: 56,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF161B22),
              border: Border(
                  bottom: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
            ),
            child: Row(
              children: [
                const Icon(Icons.shopping_cart_rounded,
                    color: Color(0xFFE8B84B), size: 18),
                const SizedBox(width: 8),
                Text('Cart',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600)),
                if (pos.itemCount > 0) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
                    decoration: BoxDecoration(
                        color: const Color(0xFFE8B84B),
                        borderRadius: BorderRadius.circular(10)),
                    child: Text('${pos.itemCount}',
                        style: const TextStyle(
                            color: Colors.black,
                            fontSize: 11,
                            fontWeight: FontWeight.w800)),
                  ),
                ],
                const Spacer(),
                if (!pos.cartIsEmpty)
                  TextButton(
                    onPressed: _confirmClearCart,
                    child: Text('Clear',
                        style: TextStyle(
                            color: Colors.red.withValues(alpha: 0.8), fontSize: 12)),
                  ),
              ],
            ),
          ),

          // Cart items
          Expanded(
            child: pos.cartIsEmpty
                ? _emptyCartPlaceholder()
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: pos.cart.length,
                    itemBuilder: (ctx, i) => _CartLine(
                      cartItem: pos.cart[i],
                      onRemove: () =>
                          pos.removeItem(pos.cart[i].item.id),
                      onQtyChanged: (q) =>
                          pos.setQty(pos.cart[i].item.id, q),
                    ),
                  ),
          ),

          // Totals + Charge button
          _buildOrderSummary(pos),
        ],
      ),
    );
  }

  Widget _emptyCartPlaceholder() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.shopping_cart_outlined,
              color: Colors.white.withValues(alpha: 0.1), size: 56),
          const SizedBox(height: 8),
          Text('Cart is empty',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.25), fontSize: 14)),
          const SizedBox(height: 4),
          Text('Tap a product or scan a barcode',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.15), fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildOrderSummary(PosProvider pos) {
    const tStyle = TextStyle(color: Colors.white70, fontSize: 13);
    const vStyle = TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
      ),
      child: Column(
        children: [
          // Subtotal
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Subtotal', style: tStyle),
            Text('৳ ${pos.subtotal.toStringAsFixed(2)}', style: vStyle),
          ]),
          if (pos.cartDiscount > 0) ...[
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Discount', style: tStyle),
              Text('- ৳ ${pos.cartDiscount.toStringAsFixed(2)}',
                  style: const TextStyle(
                      color: Color(0xFF2ECC71), fontSize: 13, fontWeight: FontWeight.w600)),
            ]),
          ],
          const Divider(color: Color(0xFF30363D), height: 16),

          // Total
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('TOTAL',
                style: TextStyle(
                    color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
            Text('৳ ${pos.totalAmount.toStringAsFixed(2)}',
                style: const TextStyle(
                    color: Color(0xFFE8B84B),
                    fontSize: 20,
                    fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 14),

          // Discount + Charge buttons
          Row(
            children: [
              // Quick discount button
              OutlinedButton(
                onPressed: pos.cartIsEmpty ? null : () => _showDiscountDialog(pos),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF30363D)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Icon(Icons.local_offer_outlined,
                    color: Color(0xFFE8B84B), size: 18),
              ),
              const SizedBox(width: 10),

              // Charge button
              Expanded(
                child: ElevatedButton(
                  onPressed: pos.cartIsEmpty
                      ? null
                      : () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const PaymentScreen()),
                          ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE8B84B),
                    disabledBackgroundColor: const Color(0xFF30363D),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.payment_rounded, color: Colors.black, size: 18),
                      SizedBox(width: 6),
                      Text('CHARGE',
                          style: TextStyle(
                              color: Colors.black,
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
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

  // ── Dialogs ─────────────────────────────────────────────────────────────────

  void _showDiscountDialog(PosProvider pos) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('Apply Discount',
            style: TextStyle(color: Colors.white, fontSize: 16)),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(color: Colors.white, fontSize: 18),
          decoration: const InputDecoration(
            prefixText: '৳ ',
            prefixStyle: TextStyle(color: Color(0xFFE8B84B), fontSize: 18),
            hintText: '0.00',
            hintStyle: TextStyle(color: Colors.white30),
            enabledBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: Color(0xFF30363D))),
            focusedBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: Color(0xFFE8B84B))),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () { pos.setCartDiscount(0); Navigator.pop(ctx); },
              child: const Text('Remove', style: TextStyle(color: Colors.red))),
          ElevatedButton(
            onPressed: () {
              final v = double.tryParse(ctrl.text) ?? 0;
              pos.setCartDiscount(v);
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE8B84B)),
            child: const Text('Apply', style: TextStyle(color: Colors.black)),
          ),
        ],
      ),
    );
  }

  void _confirmClearCart() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('Clear Cart?',
            style: TextStyle(color: Colors.white)),
        content: const Text('This will remove all items from the cart.',
            style: TextStyle(color: Colors.white60)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Colors.white54))),
          ElevatedButton(
            onPressed: () {
              context.read<PosProvider>().clearCart();
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Clear', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showCashierDialog(PosProvider pos) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF161B22),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFFE8B84B).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person_rounded,
                  color: Color(0xFFE8B84B), size: 20),
            ),
            const SizedBox(width: 10),
            Text(pos.cashierName ?? 'Cashier',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _infoRow(Icons.tag_rounded, 'Session',
                pos.session?.sessionNumber ?? '—'),
            const SizedBox(height: 6),
            _infoRow(Icons.store_outlined, 'Store ID',
                pos.storeId ?? '—'),
            const SizedBox(height: 6),
            _infoRow(Icons.access_time_rounded, 'Started',
                pos.session?.openedAt != null
                    ? _formatTime(pos.session!.openedAt)
                    : '—'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close',
                style: TextStyle(color: Colors.white38)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthProvider>().signOut();
            },
            child: const Text('Sign Out',
                style: TextStyle(color: Colors.redAccent, fontSize: 13)),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.summarize_outlined,
                color: Colors.black, size: 16),
            label: const Text('End Shift',
                style: TextStyle(
                    color: Colors.black, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE8B84B),
              elevation: 0,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              if (pos.session?.id != null) {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => PosSessionSummaryScreen(
                        sessionId: pos.session!.id),
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: Colors.white38, size: 15),
        const SizedBox(width: 8),
        Text('$label: ', style: const TextStyle(color: Colors.white38, fontSize: 12)),
        Expanded(
          child: Text(value,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
              overflow: TextOverflow.ellipsis),
        ),
      ],
    );
  }

  String _formatTime(DateTime dt) {
    final local = dt.toLocal();
    final h = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final m = local.minute.toString().padLeft(2, '0');
    final period = local.hour < 12 ? 'AM' : 'PM';
    return '$h:$m $period';
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
}

// =============================================================================
// _ProductTile — product card in the grid
// =============================================================================
class _ProductTile extends StatelessWidget {
  final PosItem item;
  final VoidCallback onTap;

  const _ProductTile({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final outOfStock = item.qtyOnHand <= 0;

    return GestureDetector(
      onTap: outOfStock ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color: const Color(0xFF161B22),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Product image
                Expanded(
                  flex: 5,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(10)),
                    child: item.imageUrl != null
                        ? Image.network(item.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _placeholder())
                        : _placeholder(),
                  ),
                ),
                // Product info
                Expanded(
                  flex: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.name,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                height: 1.2),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis),
                        const Spacer(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('৳${item.price.toStringAsFixed(0)}',
                                style: const TextStyle(
                                    color: Color(0xFFE8B84B),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700)),
                            Text('${item.qtyOnHand}',
                                style: TextStyle(
                                    color: item.qtyOnHand > 5
                                        ? Colors.white38
                                        : item.qtyOnHand > 0
                                            ? Colors.orange
                                            : Colors.red,
                                    fontSize: 10)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Out of stock overlay
            if (outOfStock)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: const Text('OUT OF STOCK',
                      style: TextStyle(
                          color: Colors.white60,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5)),
                ),
              ),

            // Add indicator (top-right)
            Positioned(
              top: 4,
              right: 4,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    shape: BoxShape.circle),
                child: const Icon(Icons.add, color: Colors.white, size: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      color: Colors.white.withValues(alpha: 0.04),
      child: Icon(Icons.inventory_2_outlined,
          color: Colors.white.withValues(alpha: 0.2), size: 28),
    );
  }
}

// =============================================================================
// _CartLine — one item row in the cart panel
// =============================================================================
class _CartLine extends StatelessWidget {
  final CartItem cartItem;
  final VoidCallback onRemove;
  final ValueChanged<int> onQtyChanged;

  const _CartLine({
    required this.cartItem,
    required this.onRemove,
    required this.onQtyChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(cartItem.item.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: Colors.red.withValues(alpha: 0.8),
        child: const Icon(Icons.delete_outline_rounded,
            color: Colors.white, size: 22),
      ),
      onDismissed: (_) => onRemove(),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1C2128),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            // Item info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(cartItem.item.name,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w500),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text('৳${cartItem.item.price.toStringAsFixed(2)} each',
                      style: const TextStyle(
                          color: Colors.white38, fontSize: 11)),
                ],
              ),
            ),

            // Qty control
            Row(
              children: [
                _qtyBtn(Icons.remove_rounded,
                    () => onQtyChanged(cartItem.qty - 1)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Text('${cartItem.qty}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600)),
                ),
                _qtyBtn(Icons.add_rounded,
                    () => onQtyChanged(cartItem.qty + 1)),
              ],
            ),
            const SizedBox(width: 10),

            // Line total
            SizedBox(
              width: 60,
              child: Text('৳${cartItem.lineTotal.toStringAsFixed(0)}',
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                      color: Color(0xFFE8B84B),
                      fontSize: 14,
                      fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, color: Colors.white70, size: 14),
      ),
    );
  }
}
