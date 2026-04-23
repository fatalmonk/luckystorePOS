import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/pos_models.dart';
import '../../providers/pos_provider.dart';
import 'receipt_screen.dart';

/// Cashier-optimised payment screen.
///
/// Layout (landscape / wide tablet):
///   LEFT 55% — numpad + quick-exact buttons + tendered list
///   RIGHT 45% — order summary + change-due callout
///
/// On portrait / narrow: single column, summary collapses to a top card.
///
/// Design goals:
///   • Zero soft-keyboard fumbling — the built-in numpad is the primary input.
///   • One-tap "Exact Cash" for the most common case.
///   • Split-payment support via "Add" before switching methods.
///   • Green COMPLETE button appears only once fully paid.
class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final List<PaymentTender> _tenders = [];
  PaymentMethod? _selectedMethod;

  // Numpad accumulator — stored as a string to handle leading zeros cleanly.
  String _numpadValue = '';
  String? _referenceText;
  bool _showReferenceField = false;
  final TextEditingController _refCtrl = TextEditingController();

  bool _processing = false;
  String? _error;

  // ── Computed ─────────────────────────────────────────────────────────────────

  double get _parsedAmount {
    if (_numpadValue.isEmpty) return 0;
    return double.tryParse(_numpadValue) ?? 0;
  }

  double get _tenderTotal => _tenders.fold(0, (s, t) => s + t.amount);

  double _remaining(PosProvider pos) =>
      (pos.totalAmount - _tenderTotal).clamp(0, double.infinity);

  bool _isPaid(PosProvider pos) => _tenderTotal >= pos.totalAmount;

  double _change(PosProvider pos) =>
      (_tenderTotal - pos.totalAmount).clamp(0, double.infinity);

  // ── Initialize ───────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    final pos = context.read<PosProvider>();
    if (pos.paymentMethods.isNotEmpty) {
      _selectedMethod = pos.paymentMethods.firstWhere(
        (m) => m.type == 'cash',
        orElse: () => pos.paymentMethods.first,
      );
    }
    // Seed numpad with the total so cashier just has to press CHARGE for exact
    _numpadValue = pos.totalAmount.toStringAsFixed(0);
  }

  @override
  void dispose() {
    _refCtrl.dispose();
    super.dispose();
  }

  // ── Numpad logic ─────────────────────────────────────────────────────────────

  void _numpadTap(String key) {
    setState(() {
      _error = null;
      if (key == '⌫') {
        if (_numpadValue.isNotEmpty) {
          _numpadValue = _numpadValue.substring(0, _numpadValue.length - 1);
        }
      } else if (key == '.') {
        if (!_numpadValue.contains('.')) _numpadValue += '.';
      } else {
        if (_numpadValue == '0') {
          _numpadValue = key;
        } else {
          // Limit to 2 decimal places
          final parts = _numpadValue.split('.');
          if (parts.length == 2 && parts[1].length >= 2) return;
          _numpadValue += key;
        }
      }
    });
  }

  void _setExact(PosProvider pos) {
    setState(() => _numpadValue = _remaining(pos).toStringAsFixed(0));
  }

  // ── Quick amount presets ─────────────────────────────────────────────────────

  void _setPreset(double amount) {
    setState(() => _numpadValue = amount.toStringAsFixed(0));
  }

  List<double> _presets(PosProvider pos) {
    final total = pos.totalAmount;
    final rounded = <double>[];
    // Round-up presets: 10, 50, 100 above total
    for (final step in [10.0, 50.0, 100.0, 500.0]) {
      final v = (total / step).ceil() * step;
      if (!rounded.contains(v) && v != total) rounded.add(v);
      if (rounded.length >= 3) break;
    }
    return rounded;
  }

  // ── Tender management ────────────────────────────────────────────────────────

  void _addTender(PosProvider pos) {
    final amount = _parsedAmount;
    if (amount <= 0) {
      setState(() => _error = 'Enter an amount first');
      return;
    }
    if (_selectedMethod == null) {
      setState(() => _error = 'Select a payment method');
      return;
    }

    final tender = PaymentTender(
      method: _selectedMethod!,
      amount: amount,
      reference:
          _referenceText?.trim().isEmpty == true ? null : _referenceText?.trim(),
    );

    setState(() {
      _tenders.add(tender);
      // Seed next numpad with remaining
      final rem = _remaining(pos);
      _numpadValue = rem > 0 ? rem.toStringAsFixed(0) : '';
      _referenceText = null;
      _refCtrl.clear();
      _showReferenceField = false;
      _error = null;
    });
  }

  void _removeTender(int index) {
    setState(() {
      _tenders.removeAt(index);
      _error = null;
    });
  }

  // ── Complete sale ────────────────────────────────────────────────────────────

  Future<void> _completeSale(PosProvider pos) async {
    List<PaymentTender> finalisedTenders = List.from(_tenders);

    // If no tenders added yet, treat current numpad value as single payment
    if (finalisedTenders.isEmpty) {
      final amount = _parsedAmount;
      if (amount <= 0 || _selectedMethod == null) {
        setState(() => _error = 'Enter an amount to charge');
        return;
      }
      finalisedTenders.add(PaymentTender(
        method: _selectedMethod!,
        amount: amount,
        reference:
            _referenceText?.trim().isEmpty == true ? null : _referenceText?.trim(),
      ));
    }

    setState(() { _processing = true; _error = null; });
    try {
      final result = await pos.completeSale(finalisedTenders);
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => ReceiptScreen(saleResult: result)),
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _processing = false;
          _error = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final pos = context.watch<PosProvider>();
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFF0D1117),
        appBar: AppBar(
          backgroundColor: const Color(0xFF161B22),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: Colors.white70, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text('Payment',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w600)),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child:
                Container(height: 1, color: Colors.white.withValues(alpha: 0.06)),
          ),
        ),
        body: LayoutBuilder(builder: (ctx, constraints) {
          final wide = constraints.maxWidth > 680;
          if (wide) {
            return Row(
              children: [
                Expanded(flex: 55, child: _buildLeftPanel(pos)),
                Container(
                    width: 1, color: Colors.white.withValues(alpha: 0.06)),
                Expanded(flex: 45, child: _buildSummaryPanel(pos)),
              ],
            );
          }
          // Portrait: stack summary card on top, controls below
          return Column(
            children: [
              _buildCompactSummary(pos),
              Expanded(child: _buildLeftPanel(pos)),
            ],
          );
        }),
      ),
    );
  }

  // ── Left panel: method selector + numpad + action ─────────────────────────

  Widget _buildLeftPanel(PosProvider pos) {
    return Column(
      children: [
        // Total due / remaining display
        _buildAmountDisplay(pos),

        // Payment method chips
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: _buildMethodChips(pos),
        ),

        // Reference field (mobile banking / card)
        if (_showReferenceField)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
            child: TextField(
              controller: _refCtrl,
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: _selectedMethod?.type == 'mobile_banking'
                    ? 'bKash / Nagad Trx ID…'
                    : 'Last 4 digits…',
                hintStyle: const TextStyle(color: Colors.white30),
                prefixIcon: const Icon(Icons.tag_rounded,
                    color: Colors.white38, size: 18),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.06),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide.none),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide:
                        const BorderSide(color: Color(0xFFE8B84B))),
              ),
              onChanged: (v) => _referenceText = v,
            ),
          ),

        // Tender list
        if (_tenders.isNotEmpty) _buildTenderList(pos),

        const Spacer(),

        // Error
        if (_error != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border:
                    Border.all(color: Colors.red.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded,
                      color: Colors.red, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                      child: Text(_error!,
                          style: const TextStyle(
                              color: Colors.red, fontSize: 12))),
                ],
              ),
            ),
          ),

        // Quick presets + numpad
        _buildQuickPresets(pos),
        _buildNumpad(pos),
        _buildActionButton(pos),
        const SizedBox(height: 8),
      ],
    );
  }

  // ── Amount display ────────────────────────────────────────────────────────

  Widget _buildAmountDisplay(PosProvider pos) {
    final isPaid = _isPaid(pos);
    final change = _change(pos);
    final remaining = _remaining(pos);
    final entered = _parsedAmount;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: isPaid
                ? const Color(0xFF2ECC71).withValues(alpha: 0.4)
                : Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(isPaid ? 'PAID ✓' : 'TOTAL DUE',
                  style: TextStyle(
                      color: isPaid
                          ? const Color(0xFF2ECC71)
                          : Colors.white.withValues(alpha: 0.45),
                      fontSize: 10,
                      letterSpacing: 1.5,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text('৳ ${pos.totalAmount.toStringAsFixed(2)}',
                  style: const TextStyle(
                      color: Color(0xFFE8B84B),
                      fontSize: 28,
                      fontWeight: FontWeight.w800)),
            ],
          ),
          if (!isPaid)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text('ENTERING',
                    style: TextStyle(
                        color: Colors.white30,
                        fontSize: 10,
                        letterSpacing: 1)),
                const SizedBox(height: 2),
                Text(
                  entered > 0
                      ? '৳ ${entered.toStringAsFixed(2)}'
                      : '৳ —',
                  style: TextStyle(
                      color: entered > 0
                          ? Colors.white
                          : Colors.white30,
                      fontSize: 22,
                      fontWeight: FontWeight.w700),
                ),
                if (_tenders.isNotEmpty)
                  Text('Remaining: ৳ ${remaining.toStringAsFixed(2)}',
                      style: const TextStyle(
                          color: Colors.white38, fontSize: 11)),
              ],
            )
          else
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2ECC71).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                children: [
                  const Text('CHANGE',
                      style: TextStyle(
                          color: Color(0xFF2ECC71),
                          fontSize: 10,
                          letterSpacing: 1,
                          fontWeight: FontWeight.w700)),
                  Text('৳ ${change.toStringAsFixed(2)}',
                      style: const TextStyle(
                          color: Color(0xFF2ECC71),
                          fontSize: 22,
                          fontWeight: FontWeight.w800)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // ── Payment method chips ──────────────────────────────────────────────────

  Widget _buildMethodChips(PosProvider pos) {
    if (pos.paymentMethods.isEmpty) {
      return const Text('No payment methods configured',
          style: TextStyle(color: Colors.white38, fontSize: 12));
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: pos.paymentMethods.map((m) {
        final sel = _selectedMethod?.id == m.id;
        return GestureDetector(
          onTap: () {
            setState(() {
              _selectedMethod = m;
              _showReferenceField =
                  m.type == 'mobile_banking' || m.type == 'card';
              _refCtrl.clear();
              _referenceText = null;
            });
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: sel
                  ? const Color(0xFFE8B84B)
                  : Colors.white.withValues(alpha: 0.07),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: sel
                      ? const Color(0xFFE8B84B)
                      : Colors.white.withValues(alpha: 0.12)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(_methodIcon(m.type),
                    color: sel ? Colors.black : Colors.white70,
                    size: 16),
                const SizedBox(width: 6),
                Text(m.name,
                    style: TextStyle(
                        color: sel ? Colors.black : Colors.white,
                        fontWeight:
                            sel ? FontWeight.w700 : FontWeight.w400,
                        fontSize: 13)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  // ── Tender list ───────────────────────────────────────────────────────────

  Widget _buildTenderList(PosProvider pos) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Payments Added  (৳ ${_tenderTotal.toStringAsFixed(2)})',
              style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 12,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          ..._tenders.asMap().entries.map((e) {
            final t = e.value;
            return Container(
              margin: const EdgeInsets.only(bottom: 4),
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(_methodIcon(t.method.type),
                      color: const Color(0xFFE8B84B), size: 14),
                  const SizedBox(width: 8),
                  Text(t.method.name,
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12)),
                  if (t.reference != null) ...[
                    const SizedBox(width: 4),
                    Text('(${t.reference})',
                        style: const TextStyle(
                            color: Colors.white30, fontSize: 11)),
                  ],
                  const Spacer(),
                  Text('৳ ${t.amount.toStringAsFixed(2)}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _removeTender(e.key),
                    child: const Icon(Icons.close_rounded,
                        color: Colors.white30, size: 16),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  // ── Quick amount presets ─────────────────────────────────────────────────

  Widget _buildQuickPresets(PosProvider pos) {
    final presets = _presets(pos);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      child: Row(
        children: [
          // Exact button
          Expanded(
            child: _presetButton(
              label: 'Exact\n৳${_remaining(pos).toStringAsFixed(0)}',
              color: const Color(0xFF2ECC71),
              onTap: () => _setExact(pos),
            ),
          ),
          const SizedBox(width: 8),
          ...presets.expand((p) => <Widget>[
                Expanded(
                  child: _presetButton(
                    label: '৳${p.toStringAsFixed(0)}',
                    onTap: () => _setPreset(p),
                  ),
                ),
                const SizedBox(width: 8),
              ]),
        ],
      ),
    );
  }

  Widget _presetButton({
    required String label,
    required VoidCallback onTap,
    Color color = const Color(0xFF30363D),
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 40,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        alignment: Alignment.center,
        child: Text(label,
            textAlign: TextAlign.center,
            style: TextStyle(
                color: color == const Color(0xFF30363D)
                    ? Colors.white70
                    : color,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                height: 1.2)),
      ),
    );
  }

  // ── Numpad ────────────────────────────────────────────────────────────────

  Widget _buildNumpad(PosProvider pos) {
    const keys = [
      ['7', '8', '9'],
      ['4', '5', '6'],
      ['1', '2', '3'],
      ['.', '0', '⌫'],
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      child: Column(
        children: keys.map((row) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: row.map((key) {
                final isBack = key == '⌫';
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => _numpadTap(key),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          height: 52,
                          decoration: BoxDecoration(
                            color: isBack
                                ? Colors.white.withValues(alpha: 0.04)
                                : Colors.white.withValues(alpha: 0.07),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: Colors.white.withValues(alpha: 0.08)),
                          ),
                          alignment: Alignment.center,
                          child: isBack
                              ? Icon(Icons.backspace_outlined,
                                  color: Colors.white54, size: 20)
                              : Text(key,
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 20,
                                      fontWeight: FontWeight.w500)),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Action button ─────────────────────────────────────────────────────────

  Widget _buildActionButton(PosProvider pos) {
    final isPaid = _isPaid(pos);
    final change = _change(pos);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 4),
      child: Row(
        children: [
          // Add split payment (only visible when not yet fully paid)
          if (!isPaid && _tenders.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: OutlinedButton(
                onPressed: () => _addTender(pos),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF30363D)),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 15),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('+ Add',
                    style: TextStyle(color: Colors.white70, fontSize: 13)),
              ),
            ),

          // Main action
          Expanded(
            child: ElevatedButton(
              onPressed: _processing ? null : () => _completeSale(pos),
              style: ElevatedButton.styleFrom(
                backgroundColor: isPaid
                    ? const Color(0xFF2ECC71)
                    : const Color(0xFFE8B84B),
                disabledBackgroundColor:
                    Colors.white.withValues(alpha: 0.1),
                padding: const EdgeInsets.symmetric(vertical: 17),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: _processing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.black, strokeWidth: 2.5),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isPaid
                              ? Icons.check_circle_rounded
                              : Icons.payment_rounded,
                          color: Colors.black,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          isPaid
                              ? (change > 0
                                  ? 'COMPLETE  •  Change ৳${change.toStringAsFixed(2)}'
                                  : 'COMPLETE SALE')
                              : 'CHARGE  ৳${_parsedAmount > 0 ? _parsedAmount.toStringAsFixed(2) : pos.totalAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                              color: Colors.black,
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.3),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Right panel: order summary ────────────────────────────────────────────

  Widget _buildSummaryPanel(PosProvider pos) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Order Summary',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.separated(
              itemCount: pos.cart.length,
              separatorBuilder: (_, __) => Divider(
                  color: Colors.white.withValues(alpha: 0.05), height: 16),
              itemBuilder: (ctx, i) {
                final c = pos.cart[i];
                return Row(
                  children: [
                    Expanded(
                        child: Text('${c.item.name} × ${c.qty}',
                            style: const TextStyle(
                                color: Colors.white70, fontSize: 12),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis)),
                    Text('৳${c.lineTotal.toStringAsFixed(0)}',
                        style: const TextStyle(
                            color: Colors.white, fontSize: 12)),
                  ],
                );
              },
            ),
          ),
          const Divider(color: Color(0xFF30363D)),
          if (pos.cartDiscount > 0) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal',
                    style: TextStyle(color: Colors.white54, fontSize: 13)),
                Text('৳ ${pos.subtotal.toStringAsFixed(2)}',
                    style: const TextStyle(
                        color: Colors.white, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Discount',
                    style: TextStyle(
                        color: Color(0xFF2ECC71), fontSize: 13)),
                Text('- ৳ ${pos.cartDiscount.toStringAsFixed(2)}',
                    style: const TextStyle(
                        color: Color(0xFF2ECC71), fontSize: 13)),
              ],
            ),
            const SizedBox(height: 4),
          ],
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('TOTAL',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700)),
              Text('৳ ${pos.totalAmount.toStringAsFixed(2)}',
                  style: const TextStyle(
                      color: Color(0xFFE8B84B),
                      fontSize: 22,
                      fontWeight: FontWeight.w800)),
            ],
          ),

          // Change callout
          if (_isPaid(pos)) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF2ECC71).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: const Color(0xFF2ECC71).withValues(alpha: 0.3)),
              ),
              child: Column(
                children: [
                  const Text('CHANGE DUE',
                      style: TextStyle(
                          color: Color(0xFF2ECC71),
                          fontSize: 11,
                          letterSpacing: 1.5,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(
                    '৳ ${_change(pos).toStringAsFixed(2)}',
                    style: const TextStyle(
                        color: Color(0xFF2ECC71),
                        fontSize: 36,
                        fontWeight: FontWeight.w800),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── Compact summary (portrait top card) ──────────────────────────────────

  Widget _buildCompactSummary(PosProvider pos) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: const Color(0xFF161B22),
      child: Row(
        children: [
          Text('${pos.itemCount} item${pos.itemCount != 1 ? "s" : ""}',
              style: const TextStyle(color: Colors.white54, fontSize: 13)),
          const Spacer(),
          Text('৳ ${pos.totalAmount.toStringAsFixed(2)}',
              style: const TextStyle(
                  color: Color(0xFFE8B84B),
                  fontSize: 18,
                  fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  IconData _methodIcon(String type) {
    switch (type) {
      case 'mobile_banking':
        return Icons.phone_android_rounded;
      case 'card':
        return Icons.credit_card_rounded;
      default:
        return Icons.payments_rounded;
    }
  }
}
