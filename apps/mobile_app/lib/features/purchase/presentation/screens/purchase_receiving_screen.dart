import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../models/party.dart';
import '../../../../models/pos_models.dart';
import '../../../../shared/providers/pos_provider.dart';

/// PurchaseReceivingScreen — fast supplier stock intake (<30s workflow).
///
/// Features:
///   - Supplier selection (type-ahead)
///   - Barcode scanner for instant item lookup
///   - Bulk quantity & unit cost entry
///   - Invoice number + total validation
///   - Partial payment now / remaining payable
///   - Save as draft / Post immediately
///   - Duplicate invoice protection
class PurchaseReceivingScreen extends StatefulWidget {
  const PurchaseReceivingScreen({super.key});

  @override
  State<PurchaseReceivingScreen> createState() => _PurchaseReceivingScreenState();
}

class _PurchaseReceivingScreenState extends State<PurchaseReceivingScreen> {
  final _supplierCtrl = TextEditingController();
  final _invoiceCtrl = TextEditingController();
  final _invoiceTotalCtrl = TextEditingController();
  final _scanCtrl = MobileScannerController();
  final _qtyCtrl = TextEditingController();
  final _costCtrl = TextEditingController();
  final _paymentCtrl = TextEditingController();

  Party? _selectedSupplier;
  List<Party> _supplierSuggestions = [];
  final List<ReceiptLine> _lines = [];
  bool _scanning = false;
  bool _isPosting = false;
  String? _error;

  double get _totalCost =>
      _lines.fold(0, (sum, l) => sum + l.quantity * l.unitCost);
  double get _amountPaid => double.tryParse(_paymentCtrl.text) ?? 0;
  double get _payableAmount => (_totalCost - _amountPaid).clamp(0, double.infinity);

  @override
  void initState() {
    super.initState();
    _paymentCtrl.text = '0';
    _qtyCtrl.text = '1';
  }

  @override
  void dispose() {
    _supplierCtrl.dispose();
    _invoiceCtrl.dispose();
    _invoiceTotalCtrl.dispose();
    _scanCtrl.dispose();
    _qtyCtrl.dispose();
    _costCtrl.dispose();
    _paymentCtrl.dispose();
    super.dispose();
  }

  // ── Supplier search ────────────────────────────────────────────────
  Future<void> _searchSuppliers(String query) async {
    if (query.length < 2) {
      setState(() => _supplierSuggestions = []);
      return;
    }
    final supabase = Supabase.instance.client;
    final res = await supabase
        .from('parties')
        .select('id, tenant_id, type, name, phone')
        .eq('type', 'supplier')
        .ilike('name', '%$query%')
        .limit(5);
    setState(() => _supplierSuggestions = res.map((j) => Party.fromJson(j)).toList());
  }

  void _selectSupplier(Party s) {
    setState(() {
      _selectedSupplier = s;
      _supplierCtrl.text = s.name;
      _supplierSuggestions = [];
    });
  }

  // ── Barcode scan ───────────────────────────────────────────────────
  Future<void> _onBarcodeDetected(BarcodeCapture capture) async {
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null || !_scanning) return;
    setState(() => _scanning = false);
    _scanCtrl.stop();
    await _lookupAndAddItem(raw);
  }

  Future<void> _lookupAndAddItem(String value) async {
    final pos = Provider.of<PosProvider>(context, listen: false);
    final item = await pos.scanItem(value);
    if (item == null) {
      setState(() => _error = 'Item not found: $value');
      return;
    }
    _addItemToLines(item);
  }

  void _addItemToLines(PosItem item) {
    final qty = double.tryParse(_qtyCtrl.text) ?? 1;
    final cost = double.tryParse(_costCtrl.text) ?? item.price;
    setState(() {
      final existing = _lines.indexWhere((l) => l.item.id == item.id);
      if (existing >= 0) {
        _lines[existing] = ReceiptLine(
          item: item,
          quantity: _lines[existing].quantity + qty,
          unitCost: cost,
        );
      } else {
        _lines.add(ReceiptLine(item: item, quantity: qty, unitCost: cost));
      }
      _error = null;
    });
  }

  // ── Manual item search ─────────────────────────────────────────────
  void _showItemSearch() async {
    final pos = Provider.of<PosProvider>(context, listen: false);
    final query = await showSearch<String?>(
      context: context,
      delegate: _ItemSearchDelegate(pos),
    );
    if (query != null) await _lookupAndAddItem(query);
  }

  // ── Remove line ───────────────────────────────────────────────────
  void _removeLine(int index) =>
      setState(() => _lines.removeAt(index));

  // ── Submit ───────────────────────────────────────────────────────
  Future<void> _submit({bool asDraft = false}) async {
    setState(() {
      _error = null;
      _isPosting = true;
    });

    // Validation
    if (_selectedSupplier == null) {
      setState(() { _error = 'Please select a supplier'; _isPosting = false; });
      return;
    }
    if (_lines.isEmpty) {
      setState(() { _error = 'Add at least one item'; _isPosting = false; });
      return;
    }
    if (_amountPaid > _totalCost) {
      setState(() { _error = 'Amount paid cannot exceed total cost'; _isPosting = false; });
      return;
    }

    // Build items JSONB
    final itemsJson = _lines
        .map((l) => {
              'item_id': l.item.id,
              'quantity': l.quantity,
              'unit_cost': l.unitCost,
            })
        .toList();

    try {
      final supabase = Supabase.instance.client;
      final tenantId = supabase.auth.currentUser?.id; // simplified
      // In production, extract tenant_id from JWT or user profile

      await supabase.rpc('record_purchase_v2', params: {
        'p_idempotency_key': 'pr_${DateTime.now().millisecondsSinceEpoch}',
        'p_tenant_id': tenantId, // TODO: replace with actual tenant_id
        'p_store_id': supabase.auth.currentUser?.id, // TODO: replace with actual store_id
        'p_supplier_id': _selectedSupplier!.id,
        'p_invoice_number': _invoiceCtrl.text.isNotEmpty ? _invoiceCtrl.text : null,
        'p_invoice_total': _invoiceTotalCtrl.text.isNotEmpty
            ? double.parse(_invoiceTotalCtrl.text)
            : null,
        'p_items': itemsJson,
        'p_amount_paid': _amountPaid,
        'p_status': asDraft ? 'draft' : 'posted',
        'p_notes': null,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(asDraft ? 'Draft saved!' : 'Purchase posted!'),
            backgroundColor: Colors.green,
          ),
        );
        // Reset form
        setState(() {
          _lines.clear();
          _invoiceCtrl.clear();
          _invoiceTotalCtrl.clear();
          _paymentCtrl.text = '0';
          _isPosting = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error: $e';
        _isPosting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFF0D1117),
        appBar: AppBar(
          title: const Text('Purchase Receiving'),
          backgroundColor: const Color(0xFF161B22),
          actions: [
            TextButton(
              onPressed: _isPosting ? null : () => _submit(asDraft: true),
              child: const Text('Save Draft', style: TextStyle(color: Colors.amber)),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: Column(
          children: [
            // Error banner
            if (_error != null)
              Container(
                width: double.infinity,
                color: Colors.red.withValues(alpha: 0.2),
                padding: const EdgeInsets.all(12),
                child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
              ),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildSupplierSection(),
                  const SizedBox(height: 16),
                  _buildInvoiceSection(),
                  const SizedBox(height: 16),
                  _buildScannerSection(),
                  const SizedBox(height: 16),
                  _buildItemEntrySection(),
                  const SizedBox(height: 16),
                  _buildLinesSection(),
                  const SizedBox(height: 16),
                  _buildPaymentSection(),
                ],
              ),
            ),

            // Bottom bar: total + post button
            _buildBottomBar(),
          ],
        ),
      ),
    );
  }

  // ── Supplier ──────────────────────────────────────────────────────
  Widget _buildSupplierSection() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Supplier', style: TextStyle(color: Colors.white54, fontSize: 12)),
          const SizedBox(height: 8),
          TextField(
            controller: _supplierCtrl,
            style: const TextStyle(color: Colors.white),
            decoration: _inputDecoration('Search supplier...'),
            onChanged: _searchSuppliers,
          ),
          if (_supplierSuggestions.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF161B22),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white24),
              ),
              child: Column(
                children: _supplierSuggestions
                    .map((s) => ListTile(
                          title: Text(s.name, style: const TextStyle(color: Colors.white)),
                          subtitle: Text(s.phone ?? '', style: const TextStyle(color: Colors.white54)),
                          onTap: () => _selectSupplier(s),
                        ))
                    .toList(),
              ),
            ),
        ],
      );

  // ── Invoice ──────────────────────────────────────────────────────
  Widget _buildInvoiceSection() => Row(
        children: [
          Expanded(
            child: TextField(
              controller: _invoiceCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: _inputDecoration('Invoice # (optional)'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: _invoiceTotalCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: _inputDecoration('Invoice Total (৳)'),
            ),
          ),
        ],
      );

  // ── Scanner ──────────────────────────────────────────────────────
  Widget _buildScannerSection() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('Items', style: TextStyle(color: Colors.white54, fontSize: 12)),
              const Spacer(),
              IconButton(
                icon: Icon(_scanning ? Icons.stop : Icons.qr_code_scanner,
                    color: Colors.amber),
                onPressed: () {
                  setState(() => _scanning = !_scanning);
                  if (_scanning) _scanCtrl.start();
                },
              ),
              IconButton(
                icon: const Icon(Icons.search, color: Colors.amber),
                onPressed: _showItemSearch,
              ),
            ],
          ),
          if (_scanning)
            SizedBox(
              height: 200,
              child: MobileScanner(
                controller: _scanCtrl,
                onDetect: _onBarcodeDetected,
              ),
            ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _qtyCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: _inputDecoration('Qty'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _costCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: _inputDecoration('Unit Cost (৳)'),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.add_circle, color: Colors.green, size: 32),
                onPressed: () {
                  // Quick add with current qty/cost fields
                  if (_lines.isNotEmpty) {
                    // Add another copy of the last item
                    final last = _lines.last;
                    _addItemToLines(last.item);
                  }
                },
              ),
            ],
          ),
        ],
      );

  // ── Lines ─────────────────────────────────────────────────────────
  Widget _buildLinesSection() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Receipt Lines (${_lines.length})',
              style: const TextStyle(color: Colors.white54, fontSize: 12)),
          const SizedBox(height: 8),
          if (_lines.isEmpty)
            const Text('No items added yet.', style: TextStyle(color: Colors.white38)),
          ..._lines.asMap().entries.map((e) {
            final i = e.key;
            final l = e.value;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF161B22),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l.item.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                        Text('${l.quantity} × ৳${l.unitCost} = ৳${(l.quantity * l.unitCost).toStringAsFixed(2)}',
                            style: const TextStyle(color: Colors.white54, fontSize: 12)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete, color: Colors.red, size: 18),
                    onPressed: () => _removeLine(i),
                  ),
                ],
              ),
            );
          }),
        ],
      );

  // ── Item Entry (manual add) ──────────────────────────────────────
  Widget _buildItemEntrySection() => const SizedBox.shrink(); // integrated above

  // ── Payment ───────────────────────────────────────────────────────
  Widget _buildPaymentSection() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Payment', style: TextStyle(color: Colors.white54, fontSize: 12)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _paymentCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: _inputDecoration('Paid Now (৳)'),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF161B22),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Payable', style: TextStyle(color: Colors.white38, fontSize: 10)),
                      Text('৳ ${_payableAmount.toStringAsFixed(2)}',
                          style: const TextStyle(color: Colors.redAccent, fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      );

  // ── Bottom Bar ────────────────────────────────────────────────────
  Widget _buildBottomBar() => Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: Color(0xFF161B22),
          border: Border(top: BorderSide(color: Colors.white10)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Total Cost', style: TextStyle(color: Colors.white38, fontSize: 10)),
                  Text('৳ ${_totalCost.toStringAsFixed(2)}',
                      style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: _isPosting ? null : () => _submit(asDraft: false),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE8B84B),
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              ),
              child: _isPosting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('POST RECEIPT', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );

  InputDecoration _inputDecoration(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.white38),
        filled: true,
        fillColor: const Color(0xFF161B22),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Colors.white24),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Colors.white24),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      );
}

// ── Receipt Line Model ───────────────────────────────────────────────
class ReceiptLine {
  final PosItem item;
  final double quantity;
  final double unitCost;
  ReceiptLine({required this.item, required this.quantity, required this.unitCost});
}

// ── Item Search Delegate ────────────────────────────────────────────
class _ItemSearchDelegate extends SearchDelegate<String?> {
  final PosProvider pos;
  _ItemSearchDelegate(this.pos);

  @override
  List<Widget> buildActions(BuildContext context) => [
        IconButton(icon: const Icon(Icons.clear), onPressed: () => query = ''),
      ];

  @override
  Widget buildLeading(BuildContext context) =>
      IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => close(context, null));

  @override
  Widget buildResults(BuildContext context) => _buildResults();

  @override
  Widget buildSuggestions(BuildContext context) => _buildResults();

  Widget _buildResults() {
    if (query.length < 2) {
      return const Center(child: Text('Type at least 2 characters...', style: TextStyle(color: Colors.white54)));
    }
    return FutureBuilder<List<PosItem>>(
      future: pos.searchItems(query),
      builder: (context, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final items = snap.data!;
        return ListView(
          children: items.map<Widget>((item) {
            return ListTile(
              title: Text(item.name, style: const TextStyle(color: Colors.white)),
              subtitle: Text('৳ ${item.price} | ${item.sku}', style: const TextStyle(color: Colors.white54)),
              onTap: () => close(context, item.barcode ?? item.id),
            );
          }).toList(),
        );
      },
    );
  }
}
