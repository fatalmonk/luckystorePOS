import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../models/pos_models.dart';
import '../../../../models/party.dart';
import '../../../../shared/providers/pos_provider.dart';
import '../../../../core/theme/app_motion.dart';
import './receipt_screen.dart';

/// Cashier-optimised, single-method payment screen for cashier tablets.
/// 
/// Business Rules applied:
///   1. Pricing: Credit sales charge MRP, all others (Cash/Bkash/Card) charge discounted Price.
///   2. Orientations: Portrait + Landscape responsive layouts.
///   3. No split payments: Single payment method per transaction.
///   4. No manual discount: Pricing auto-applies based on payment method selection.
class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  PaymentMethod? _selectedMethod;

  // Numpad accumulator — stored as a string to handle leading zeros cleanly.
  String _numpadValue = '';
  String? _referenceText;
  final TextEditingController _refCtrl = TextEditingController();

  bool _processing = false;
  String? _error;

  // ── Computed ─────────────────────────────────────────────────────────────────

  double get _parsedAmount {
    if (_numpadValue.isEmpty) return 0;
    return double.tryParse(_numpadValue) ?? 0;
  }

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
      pos.setSelectedPaymentMethodId(_selectedMethod?.id);
    }
    // Seed numpad with the total
    _numpadValue = pos.totalAmount.toStringAsFixed(0);

    // Always refresh payment methods from Supabase when checkout opens,
    // then auto-select cash if the list was empty before.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await pos.refreshPaymentMethods();
      if (!mounted) return;
      if (_selectedMethod == null && pos.paymentMethods.isNotEmpty) {
        setState(() {
          _selectedMethod = pos.paymentMethods.firstWhere(
            (m) => m.type == 'cash',
            orElse: () => pos.paymentMethods.first,
          );
        });
        pos.setSelectedPaymentMethodId(_selectedMethod?.id);
      }
    });

    HardwareKeyboard.instance.addHandler(_handleKeyEvent);
  }

  @override
  void dispose() {
    HardwareKeyboard.instance.removeHandler(_handleKeyEvent);
    _refCtrl.dispose();
    super.dispose();
  }

  // ── Keyboard wedging and shortcuts ──────────────────────────────────────────

  bool _handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return false;
    
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.backspace) {
      _numpadTap('⌫');
      return true;
    } else if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.numpadEnter) {
      final pos = context.read<PosProvider>();
      if (!_processing && _canCompleteSale(pos)) {
        _completeSale(pos);
      }
      return true;
    } else if (key == LogicalKeyboardKey.escape) {
      Navigator.pop(context);
      return true;
    } else {
      final char = event.character;
      if (char != null && '0123456789.'.contains(char)) {
        _numpadTap(char);
        return true;
      }
    }
    return false;
  }

  // ── Numpad logic ─────────────────────────────────────────────────────────────

  void _numpadTap(String key) {
    if (_selectedMethod?.type != 'cash') return; // Numpad only relevant for Cash
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
    setState(() => _numpadValue = pos.totalAmount.toStringAsFixed(0));
  }

  void _setPreset(double amount) {
    setState(() => _numpadValue = amount.toStringAsFixed(0));
  }

  List<double> _presets(double total) {
    final list = <double>[];
    if (total <= 0) return [100, 500, 1000];
    
    final bills = [10.0, 20.0, 50.0, 100.0, 200.0, 500.0, 1000.0];
    for (final bill in bills) {
      if (bill > total && list.length < 3) {
        list.add(bill);
      }
    }
    while (list.length < 3) {
      final last = list.isEmpty ? total : list.last;
      list.add(last + 100);
    }
    return list;
  }

  // ── Validation and Checkout logic ───────────────────────────────────────────

  bool _isCredit(PaymentMethod? method) {
    if (method == null) return false;
    return method.name.toLowerCase().contains('credit') || method.type.toLowerCase().contains('credit');
  }

  bool _canCompleteSale(PosProvider pos) {
    // Reset any previous error
    _error = null;

    if (_selectedMethod == null) return false;

    // Credit check
    if (_isCredit(_selectedMethod) && pos.selectedParty == null) {
      _error = 'Customer selection required for credit sales.';
      return false;
    }

    // Cash short check
    if (_selectedMethod!.type == 'cash') {
      final entered = _parsedAmount > 0 ? _parsedAmount : pos.totalAmount;
      if (entered < pos.totalAmount) {
        _error = 'Cash amount is less than total. Please enter sufficient cash.';
        return false;
      }
    }

    return true;
  }

  Future<void> _completeSale(PosProvider pos) async {
    if (!_canCompleteSale(pos)) return;
    
    final amount = _selectedMethod!.type == 'cash'
        ? (_parsedAmount > 0 ? _parsedAmount : pos.totalAmount)
        : pos.totalAmount;

    final tender = PaymentTender(
      method: _selectedMethod!,
      amount: amount,
      reference: _referenceText?.trim().isEmpty == true ? null : _referenceText?.trim(),
    );

    setState(() {
      _processing = true;
      _error = null;
    });

    try {
      final traceId = 'trace-${DateTime.now().microsecondsSinceEpoch}-${identityHashCode(this)}';
      final response = await pos.completeSale(
        [tender],
        transactionTraceId: traceId,
      );
      if (!mounted) return;
      if (response.isSuccess && response.saleResult != null) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
              builder: (_) => ReceiptScreen(saleResult: response.saleResult!)),
        );
      } else {
        await _showServerOutcomeDialog(response);
        setState(() => _processing = false);
      }
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
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white70, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text(
            'Checkout & Payment',
            style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w600),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(height: 1, color: Colors.white.withValues(alpha: 0.06)),
          ),
        ),
        body: LayoutBuilder(builder: (ctx, constraints) {
          final wide = constraints.maxWidth > 720;
          if (wide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(flex: 50, child: _buildLeftPanel(pos, wide)),
                Container(width: 1, color: Colors.white.withValues(alpha: 0.06)),
                Expanded(flex: 50, child: _buildRightContextPanel(pos)),
              ],
            );
          }
          return SingleChildScrollView(
            child: Column(
              children: [
                _buildLeftPanel(pos, false),
                Container(height: 1, color: Colors.white.withValues(alpha: 0.06)),
                _buildRightContextPanel(pos),
              ],
            ),
          );
        }),
      ),
    );
  }

  // ── Left Column: Totals, Customer Selection, Payment grid ─────────────────

  Widget _buildLeftPanel(PosProvider pos, bool isWide) {
    final isCreditSelected = _isCredit(_selectedMethod);

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Total amount card
          _buildTotalDisplay(pos),
          const SizedBox(height: 16),

          // Customer selection block
          _buildCustomerSelection(pos),
          const SizedBox(height: 16),

          // Pricing dynamic rule badge
          _buildPricingRuleBadge(pos, isCreditSelected),
          const SizedBox(height: 16),

          // Payment methods title
          const Text(
            'SELECT PAYMENT METHOD',
            style: TextStyle(
              color: Colors.white38,
              fontSize: 11,
              letterSpacing: 1,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),

          // Grid / Wrap of large payment method cards
          _buildPaymentMethodGrid(pos),
          const SizedBox(height: 16),

          // Simple order preview
          if (isWide) ...[
            const Text(
              'ORDER SUMMARY',
              style: TextStyle(
                color: Colors.white38,
                fontSize: 11,
                letterSpacing: 1,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            _buildOrderSummaryWidget(pos),
          ],
        ],
      ),
    );
  }

  Widget _buildTotalDisplay(PosProvider pos) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'TOTAL AMOUNT DUE',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.45),
              fontSize: 10,
              letterSpacing: 1.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '৳ ${pos.totalAmount.toStringAsFixed(2)}',
                style: const TextStyle(
                  color: Color(0xFFE8B84B),
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${pos.itemCount} items',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerSelection(PosProvider pos) {
    final party = pos.selectedParty;
    return InkWell(
      onTap: () => _showCustomerSearchDialog(pos),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: party != null
              ? const Color(0xFFE8B84B).withValues(alpha: 0.08)
              : Colors.white.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: party != null
                ? const Color(0xFFE8B84B).withValues(alpha: 0.3)
                : Colors.white.withValues(alpha: 0.06),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: party != null
                    ? const Color(0xFFE8B84B).withValues(alpha: 0.15)
                    : Colors.white.withValues(alpha: 0.05),
                shape: BoxShape.circle,
              ),
              child: Icon(
                party != null ? Icons.person_rounded : Icons.person_add_alt_1_rounded,
                color: party != null ? const Color(0xFFE8B84B) : Colors.white38,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    party?.name ?? 'Select Customer (Walk-in)',
                    style: TextStyle(
                      color: party != null ? Colors.white : Colors.white54,
                      fontSize: 14,
                      fontWeight: party != null ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                  if (party != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      'Phone: ${party.phone ?? "No phone"}  •  Balance: ৳ ${party.currentBalance.toStringAsFixed(0)}',
                      style: const TextStyle(color: Colors.white38, fontSize: 11),
                    ),
                  ],
                ],
              ),
            ),
            if (party != null)
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white38, size: 18),
                onPressed: () {
                  pos.setSelectedParty(null);
                  if (_isCredit(_selectedMethod)) {
                    setState(() {});
                  }
                },
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              )
            else
              const Icon(Icons.chevron_right_rounded, color: Colors.white24, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildPricingRuleBadge(PosProvider pos, bool isCreditSelected) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isCreditSelected
            ? const Color(0xFFD97706).withValues(alpha: 0.12)
            : const Color(0xFF22C55E).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isCreditSelected
              ? const Color(0xFFD97706).withValues(alpha: 0.3)
              : const Color(0xFF22C55E).withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isCreditSelected ? Icons.info_outline : Icons.check_circle_outline,
            color: isCreditSelected ? const Color(0xFFFBBF24) : const Color(0xFF22C55E),
            size: 18,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              isCreditSelected
                  ? 'Credit Account: Charged Maximum Retail Price (MRP).'
                  : 'Cash/MFS/Card checkout: Charges Discounted Price.',
              style: TextStyle(
                color: isCreditSelected ? const Color(0xFFFBBF24) : const Color(0xFF22C55E),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodGrid(PosProvider pos) {
    if (pos.paymentMethods.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text('No payment methods configured.', style: TextStyle(color: Colors.white38, fontSize: 13)),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        mainAxisExtent: 64,
      ),
      itemCount: pos.paymentMethods.length,
      itemBuilder: (ctx, i) {
        final m = pos.paymentMethods[i];
        final isSelected = _selectedMethod?.id == m.id;
        final isCreditType = _isCredit(m);

        return InkWell(
          onTap: () {
            setState(() {
              _selectedMethod = m;
              pos.setSelectedPaymentMethodId(m.id);
              _refCtrl.clear();
              _referenceText = null;
              
              // Seed numpad with recalculating total amount
              _numpadValue = pos.totalAmount.toStringAsFixed(0);
            });
          },
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: AppMotion.durationNormal,
            decoration: BoxDecoration(
              color: isSelected
                  ? const Color(0xFFE8B84B)
                  : Colors.white.withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? const Color(0xFFE8B84B)
                    : Colors.white.withValues(alpha: 0.08),
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  _methodIcon(m.type),
                  color: isSelected ? Colors.black : (isCreditType ? const Color(0xFFFBBF24) : Colors.white70),
                  size: 20,
                ),
                const SizedBox(width: 8),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m.name.toUpperCase(),
                      style: TextStyle(
                        color: isSelected ? Colors.black : Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isCreditType ? 'MRP' : 'DISCOUNTED',
                      style: TextStyle(
                        color: isSelected ? Colors.black.withValues(alpha: 0.6) : Colors.white38,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildOrderSummaryWidget(PosProvider pos) {
    return Container(
      constraints: const BoxConstraints(maxHeight: 180),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22).withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        padding: const EdgeInsets.all(12),
        itemCount: pos.cart.length,
        separatorBuilder: (_, __) => Divider(color: Colors.white.withValues(alpha: 0.04), height: 12),
        itemBuilder: (ctx, i) {
          final c = pos.cart[i];
          final isCreditSelected = _isCredit(_selectedMethod);
          final price = isCreditSelected ? c.item.mrp : c.item.price;
          final lineTotal = price * c.qty;
          return Row(
            children: [
              Expanded(
                child: Text(
                  '${c.item.name} × ${c.qty}',
                  style: const TextStyle(color: Colors.white60, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '৳${lineTotal.toStringAsFixed(0)}',
                style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          );
        },
      ),
    );
  }

  // ── Right Column: Numpads & Contextual Complete flow ───────────────────────

  Widget _buildRightContextPanel(PosProvider pos) {
    if (_selectedMethod == null) {
      return const Center(child: Text('Select payment method to proceed', style: TextStyle(color: Colors.white38)));
    }

    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Render based on selected method type
          if (_selectedMethod!.type == 'cash') ...[
            _buildCashCheckoutFlow(pos),
          ] else if (_selectedMethod!.type == 'mobile_banking' || _selectedMethod!.type == 'card') ...[
            _buildReferenceCheckoutFlow(pos),
          ] else if (_isCredit(_selectedMethod)) ...[
            _buildCreditCheckoutFlow(pos),
          ] else ...[
            _buildGenericCheckoutFlow(pos),
          ],
          
          const Spacer(),

          // Error Panel
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.red.withValues(alpha: 0.25)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.redAccent, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                  ),
                ],
              ),
            ),
          ],

          // Universal Big Complete Button
          _buildCompleteActionButton(pos),
        ],
      ),
    );
  }

  // Context-specific layout 1: CASH
  Widget _buildCashCheckoutFlow(PosProvider pos) {
    final double entered = _parsedAmount > 0 ? _parsedAmount : pos.totalAmount;
    final double change = (entered - pos.totalAmount).clamp(0, double.infinity);
    final double short = (pos.totalAmount - entered).clamp(0, double.infinity);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Cash entry indicator header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'CASH TENDERED',
              style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.bold),
            ),
            if (short > 0)
              Text(
                'SHORT BY ৳${short.toStringAsFixed(0)}',
                style: const TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold),
              )
            else if (change > 0)
              Text(
                'CHANGE DUE: ৳${change.toStringAsFixed(0)}',
                style: const TextStyle(color: Color(0xFF2ECC71), fontSize: 11, fontWeight: FontWeight.bold),
              ),
          ],
        ),
        const SizedBox(height: 8),

        // Big numeric amount box
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFF161B22),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: short > 0 
                  ? Colors.redAccent.withValues(alpha: 0.3) 
                  : (change > 0 ? const Color(0xFF2ECC71).withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.08)),
              width: 1.5,
            ),
          ),
          alignment: Alignment.centerRight,
          child: Text(
            '৳ ${_numpadValue.isEmpty ? "0" : _numpadValue}',
            style: TextStyle(
              color: short > 0 
                  ? Colors.redAccent 
                  : (change > 0 ? const Color(0xFF2ECC71) : Colors.white),
              fontSize: 36,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Preset Bill shortcuts
        Row(
          children: [
            Expanded(
              child: _presetBillButton('EXACT', onTap: () => _setExact(pos), isSpecial: true),
            ),
            const SizedBox(width: 8),
            ..._presets(pos.totalAmount).map((p) => Expanded(
                  child: _presetBillButton('৳${p.toStringAsFixed(0)}', onTap: () => _setPreset(p)),
                )),
          ],
        ),
        const SizedBox(height: 16),

        // Built-in touch numpad
        _buildNumpadGridWidget(),
      ],
    );
  }

  Widget _presetBillButton(String label, {required VoidCallback onTap, bool isSpecial = false}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 40,
        decoration: BoxDecoration(
          color: isSpecial 
              ? const Color(0xFF2ECC71).withValues(alpha: 0.12)
              : Colors.white.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSpecial 
                ? const Color(0xFF2ECC71).withValues(alpha: 0.3)
                : Colors.white.withValues(alpha: 0.08),
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: isSpecial ? const Color(0xFF2ECC71) : Colors.white70,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildNumpadGridWidget() {
    const keys = [
      ['7', '8', '9'],
      ['4', '5', '6'],
      ['1', '2', '3'],
      ['.', '0', '⌫'],
    ];

    return Column(
      children: keys.map((row) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: row.map((key) {
              final isBackspace = key == '⌫';
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: InkWell(
                    onTap: () => _numpadTap(key),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      height: 52,
                      decoration: BoxDecoration(
                        color: isBackspace
                            ? Colors.white.withValues(alpha: 0.03)
                            : Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                      ),
                      alignment: Alignment.center,
                      child: isBackspace
                          ? const Icon(Icons.backspace_outlined, color: Colors.white60, size: 20)
                          : Text(
                              key,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        );
      }).toList(),
    );
  }

  // Context-specific layout 2: MOBILE CHECKOUT / CARDS
  Widget _buildReferenceCheckoutFlow(PosProvider pos) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 12),
        Center(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFE8B84B).withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _selectedMethod?.type == 'mobile_banking' ? Icons.phone_android : Icons.credit_card,
              color: const Color(0xFFE8B84B),
              size: 40,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(
            'Swipe card or verify transfer of ৳${pos.totalAmount.toStringAsFixed(2)}',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'TRANSACTION REFERENCE / LAST 4 DIGITS',
          style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _refCtrl,
          autofocus: true,
          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: _selectedMethod?.type == 'mobile_banking'
                ? 'bKash / Nagad Transaction ID...'
                : 'Last 4 digits of card...',
            hintStyle: const TextStyle(color: Colors.white24, fontSize: 14),
            prefixIcon: const Icon(Icons.tag, color: Colors.white38, size: 20),
            filled: true,
            fillColor: const Color(0xFF161B22),
            contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE8B84B), width: 1.5),
            ),
          ),
          onChanged: (v) => _referenceText = v,
        ),
      ],
    );
  }

  // Context-specific layout 3: CREDIT
  Widget _buildCreditCheckoutFlow(PosProvider pos) {
    final party = pos.selectedParty;
    if (party == null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        decoration: BoxDecoration(
          color: const Color(0xFFD97706).withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.25)),
        ),
        child: Column(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Color(0xFFFBBF24), size: 44),
            const SizedBox(height: 12),
            const Text(
              'CUSTOMER REGISTRATION REQUIRED',
              style: TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.bold, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Credit sales require associating the checkout with an existing customer ledger.',
              style: TextStyle(color: Colors.white54, fontSize: 12),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _showCustomerSearchDialog(pos),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.person_search, size: 18),
              label: const Text('Find Customer', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }

    final newBalance = party.currentBalance + pos.totalAmount;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'CREDIT ACCOUNT DETAIL',
            style: TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
          ),
          const SizedBox(height: 12),
          _ledgerRow('Customer Account', party.name),
          _ledgerRow('Phone Number', party.phone ?? 'No phone'),
          const Divider(color: Colors.white10, height: 20),
          _ledgerRow('Current Ledger Balance', '৳${party.currentBalance.toStringAsFixed(2)}', valueColor: const Color(0xFFFBBF24)),
          _ledgerRow('This Transaction Cost', '৳${pos.totalAmount.toStringAsFixed(2)}', valueColor: const Color(0xFFE8B84B)),
          const Divider(color: Colors.white10, height: 20),
          _ledgerRow(
            'New Outstanding Balance', 
            '৳${newBalance.toStringAsFixed(2)}', 
            valueColor: const Color(0xFFEF4444),
            isBold: true,
          ),
        ],
      ),
    );
  }

  Widget _ledgerRow(String label, String value, {Color valueColor = Colors.white, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 13)),
          Text(
            value,
            style: TextStyle(
              color: valueColor,
              fontSize: 13,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGenericCheckoutFlow(PosProvider pos) {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 24),
          const Icon(Icons.payment, color: Colors.white38, size: 48),
          const SizedBox(height: 12),
          Text(
            'Proceeding with ${_selectedMethod?.name ?? "selected method"} checkout',
            style: const TextStyle(color: Colors.white60),
          ),
        ],
      ),
    );
  }

  Widget _buildCompleteActionButton(PosProvider pos) {
    final isEnabled = _canCompleteSale(pos);
    
    Color btnColor = const Color(0xFF2ECC71); // Default green
    String label = 'COMPLETE SALE';

    if (_selectedMethod?.type == 'cash') {
      final double entered = _parsedAmount > 0 ? _parsedAmount : pos.totalAmount;
      final double change = (entered - pos.totalAmount).clamp(0, double.infinity);
      final double short = (pos.totalAmount - entered).clamp(0, double.infinity);
      
      if (short > 0) {
        btnColor = Colors.white.withValues(alpha: 0.1);
        label = 'SHORT BY ৳${short.toStringAsFixed(0)}';
      } else if (change > 0) {
        label = 'COMPLETE  •  Change ৳${change.toStringAsFixed(0)}';
      }
    } else if (_isCredit(_selectedMethod) && pos.selectedParty == null) {
      btnColor = Colors.white.withValues(alpha: 0.1);
      label = 'CUSTOMER REQUIRED';
    }

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _processing || !isEnabled ? null : () => _completeSale(pos),
        style: ElevatedButton.styleFrom(
          backgroundColor: btnColor,
          foregroundColor: Colors.black,
          disabledBackgroundColor: Colors.white.withValues(alpha: 0.08),
          disabledForegroundColor: Colors.white24,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: _processing
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(color: Colors.black, strokeWidth: 3),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.check_circle, size: 22, color: Colors.black),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                      color: Colors.black,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  // ── Customer Search Dialog ─────────────────────────────────────────────────

  void _showCustomerSearchDialog(PosProvider pos) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF161B22),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          title: const Text(
            'Find Ledger Customer',
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          content: SizedBox(
            width: 440,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: ctrl,
                  autofocus: true,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search by name or mobile number...',
                    hintStyle: const TextStyle(color: Colors.white30),
                    prefixIcon: const Icon(Icons.search, color: Colors.white38),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.04),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  ),
                  onChanged: (v) => setDialogState(() {}),
                ),
                const SizedBox(height: 12),
                FutureBuilder<List<Party>>(
                  future: pos.searchParties(ctrl.text),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(
                        child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: Color(0xFFE8B84B))),
                      );
                    }
                    final parties = snapshot.data ?? [];
                    if (parties.isEmpty && ctrl.text.isNotEmpty) {
                      return const Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('No customers match your query', style: TextStyle(color: Colors.white38, fontSize: 13)),
                      );
                    }
                    return SizedBox(
                      height: 250,
                      child: ListView.separated(
                        itemCount: parties.length,
                        separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
                        itemBuilder: (ctx, i) => ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                          title: Text(parties[i].name, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                          subtitle: Text(parties[i].phone ?? 'No phone number', style: const TextStyle(color: Colors.white38, fontSize: 12)),
                          trailing: Text('৳ ${parties[i].currentBalance.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFE8B84B), fontSize: 13, fontWeight: FontWeight.bold)),
                          onTap: () {
                            pos.setSelectedParty(parties[i]);
                            Navigator.pop(ctx);
                            // Refresh outer state if in credit check
                            setState(() {});
                          },
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Colors.white38)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showServerOutcomeDialog(SaleExecutionResult response) {
    final partialLines = response.partialFulfillment
        .map((e) => '${e['item_id']}: fulfilled ${e['fulfilled_qty']} / backordered ${e['backordered_qty']}')
        .join('\n');
    final details = [
      if (response.message != null) response.message!,
      if (response.conflictReason != null) 'Reason: ${response.conflictReason}',
      if (partialLines.isNotEmpty) partialLines,
    ].join('\n');
    return showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF161B22),
        title: Text('Server Result: ${response.status.name.toUpperCase()}', style: const TextStyle(color: Colors.white)),
        content: Text(details.isEmpty ? 'No additional details.' : details, style: const TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK', style: TextStyle(color: Color(0xFFE8B84B))),
          ),
        ],
      ),
    );
  }

  IconData _methodIcon(String type) {
    switch (type) {
      case 'mobile_banking':
        return Icons.phone_android_rounded;
      case 'card':
        return Icons.credit_card_rounded;
      case 'credit':
        return Icons.account_balance_wallet_rounded;
      default:
        return Icons.payments_rounded;
    }
  }
}
