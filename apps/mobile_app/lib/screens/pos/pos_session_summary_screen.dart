import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

class PosSessionSummaryScreen extends StatefulWidget {
  final String sessionId;

  const PosSessionSummaryScreen({super.key, required this.sessionId});

  @override
  State<PosSessionSummaryScreen> createState() => _PosSessionSummaryScreenState();
}

class _PosSessionSummaryScreenState extends State<PosSessionSummaryScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  String? _error;
  
  Map<String, dynamic>? _sessionData;
  List<dynamic> _salesData = [];
  double _expectedDrawer = 0.0;

  @override
  void initState() {
    super.initState();
    _loadSessionSummary();
  }

  Future<void> _loadSessionSummary() async {
    setState(() => _loading = true);
    try {
      // 1. Try to fetch summary using Backend RPC (Server-Side Math)
      try {
        final summaryResp = await _supabase.rpc('get_session_summary', params: {'p_session_id': widget.sessionId});
        
        final session = summaryResp['session'];
        
        // 2. Fetch Sales within this session for the list
        final salesResp = await _supabase.from('sales')
            .select('id, sale_number, total_amount, amount_tendered, status, created_at, sale_payments(amount, payment_methods(type))')
            .eq('session_id', widget.sessionId)
            .order('created_at', ascending: false);

        if (mounted) {
          setState(() {
            _sessionData = {
              ...session,
              'cashier': {'name': summaryResp['cashier_name']}
            };
            _salesData = salesResp;
            _expectedDrawer = (summaryResp['expected_drawer'] as num).toDouble();
            _loading = false;
          });
        }
      } catch (rpcError) {
        // Fallback if RPC is not yet applied
        final sessionResp = await _supabase.from('pos_sessions')
            .select('*, cashier:users(name)')
            .eq('id', widget.sessionId)
            .single();
        
        final salesResp = await _supabase.from('sales')
            .select('id, sale_number, total_amount, amount_tendered, status, created_at, sale_payments(amount, payment_methods(type))')
            .eq('session_id', widget.sessionId)
            .order('created_at', ascending: false);

        double openingCash = (sessionResp['opening_cash'] as num?)?.toDouble() ?? 0;
        double totalSales = 0;
        for (var sale in salesResp) {
          if (sale['status'] == 'completed') totalSales += (sale['total_amount'] as num).toDouble();
        }

        if (mounted) {
          setState(() {
            _sessionData = sessionResp;
            _salesData = salesResp;
            _expectedDrawer = openingCash + totalSales;
            _loading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Unable to establish secure connection to the server to verify session data. Please ensure you have stable internet connection and try again.';
          _loading = false;
        });
      }
    }
  }

  Future<void> _closeSession() async {
    // Show dialog to enter closing cash
    double closingCash = _expectedDrawer; // default
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF161B22),
          title: const Text('Close Session', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Enter the actual cash amount in the drawer:', style: TextStyle(color: Colors.white70)),
              const SizedBox(height: 16),
              TextField(
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(color: Colors.white, fontSize: 18),
                decoration: InputDecoration(
                  prefixText: '৳ ',
                  prefixStyle: const TextStyle(color: Colors.white70),
                  filled: true,
                  fillColor: const Color(0xFF0D1117),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  hintText: '0.00'
                ),
                onChanged: (val) {
                  closingCash = double.tryParse(val) ?? 0.0;
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE8B84B)),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Close Session', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      }
    );

    if (confirmed == true) {
      setState(() => _loading = true);
      try {
        // Backend validated checkout
        try {
          await _supabase.rpc('close_pos_session', params: {
            'p_session_id': widget.sessionId,
            'p_closing_cash': closingCash
          });
        } catch (rpcErr) {
          // Fallback if RPC is missing
          await _supabase.from('pos_sessions').update({
            'status': 'closed',
            'closed_at': DateTime.now().toIso8601String(),
            'closing_cash': closingCash,
          }).eq('id', widget.sessionId);
        }
        await _loadSessionSummary();
      } catch (e) {
         if (mounted) {
            showDialog(
              context: context,
              builder: (ctx) => AlertDialog(
                backgroundColor: const Color(0xFF161B22),
                title: const Row(children: [Icon(Icons.error_outline, color: Colors.redAccent), SizedBox(width: 8), Text('Session Error', style: TextStyle(color: Colors.white))]),
                content: const Text('The server rejected the closing request. This normally happens if another device already closed the session or connection failed. Please refresh your screen and contact IT if the issue persists.', style: TextStyle(color: Colors.white70)),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Dismiss', style: TextStyle(color: Colors.white54)))
                ]
              )
            );
            setState(() { _loading = false; });
         }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFF0D1117),
        appBar: AppBar(
          backgroundColor: const Color(0xFF161B22),
          title: const Text('Session Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          elevation: 0,
        ),
        body: _loading 
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFE8B84B)))
          : _error != null || _sessionData == null
            ? Center(child: Text(_error ?? 'Session not found', style: const TextStyle(color: Colors.redAccent)))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeaderCard(),
                    const SizedBox(height: 24),
                    _buildSalesList(),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    final session = _sessionData!;
    final bool isOpen = session['status'] == 'open';
    final cashierName = session['cashier']?['name'] ?? 'Unknown';
    final openedAt = DateTime.parse(session['opened_at']).toLocal();
    final closedAt = session['closed_at'] != null ? DateTime.parse(session['closed_at']).toLocal() : null;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isOpen ? const Color(0xFFE8B84B).withValues(alpha: 0.5) : Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(session['session_number'] ?? '', style: const TextStyle(color: Color(0xFFE8B84B), fontSize: 16, fontWeight: FontWeight.bold)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isOpen ? const Color(0xFFE8B84B).withValues(alpha: 0.1) : Colors.white10,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(isOpen ? 'IN PROGRESS' : 'CLOSED', style: TextStyle(color: isOpen ? const Color(0xFFE8B84B) : Colors.white54, fontSize: 11, fontWeight: FontWeight.bold)),
              )
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Icon(Icons.person_outline, color: Colors.white54, size: 18),
              const SizedBox(width: 8),
              Text('Cashier: $cashierName', style: const TextStyle(color: Colors.white)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.access_time, color: Colors.white54, size: 18),
              const SizedBox(width: 8),
              Text('Opened: ${DateFormat('MMM dd, yyyy - hh:mm a').format(openedAt)}', style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ],
          ),
          if (closedAt != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.timer_off_outlined, color: Colors.white54, size: 18),
                const SizedBox(width: 8),
                Text('Closed: ${DateFormat('MMM dd, yyyy - hh:mm a').format(closedAt)}', style: const TextStyle(color: Colors.white70, fontSize: 13)),
              ],
            ),
          ],
          
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Divider(color: Colors.white10, height: 1),
          ),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _amountCol('Opening Cash', (session['opening_cash'] as num?)?.toDouble() ?? 0),
              _amountCol('Total Sales', (session['total_sales'] as num?)?.toDouble() ?? 0),
              _amountCol(isOpen ? 'Expected Drawer' : 'Closing Cash', isOpen ? _expectedDrawer : ((session['closing_cash'] as num?)?.toDouble() ?? 0), isHighlighted: true),
            ],
          ),

          if (isOpen) ...[
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.lock_rounded, color: Colors.black, size: 18),
                label: const Text('Z-Report & Close Session', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE8B84B),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _closeSession,
              ),
            ),
          ]
        ],
      ),
    );
  }

  Widget _amountCol(String label, double amount, {bool isHighlighted = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
        const SizedBox(height: 4),
        Text('৳ ${amount.toStringAsFixed(2)}', style: TextStyle(
          color: isHighlighted ? const Color(0xFF2ECC71) : Colors.white,
          fontSize: isHighlighted ? 18 : 16,
          fontWeight: FontWeight.bold
        )),
      ],
    );
  }

  Widget _buildSalesList() {
    if (_salesData.isEmpty) {
      return Container(
        decoration: BoxDecoration(
          color: const Color(0xFF161B22),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
        ),
        padding: const EdgeInsets.all(30),
        alignment: Alignment.center,
        child: const Text('No transactions in this session yet.', style: TextStyle(color: Colors.white54)),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          iconColor: const Color(0xFFE8B84B),
          collapsedIconColor: Colors.white54,
          title: Text('Sales Transactions (${_salesData.length})', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          subtitle: const Text('Tap to expand full transaction list', style: TextStyle(color: Colors.white54, fontSize: 12)),
          children: [
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _salesData.length,
              separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
              itemBuilder: (context, index) {
                final sale = _salesData[index];
                final isVoid = sale['status'] == 'voided';
                final time = DateTime.parse(sale['created_at']).toLocal();

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(sale['sale_number'], style: TextStyle(color: isVoid ? Colors.redAccent : Colors.white, fontWeight: FontWeight.w600, decoration: isVoid ? TextDecoration.lineThrough : null)),
                          const SizedBox(height: 4),
                          Text(DateFormat('hh:mm a').format(time), style: const TextStyle(color: Colors.white54, fontSize: 12)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('৳ ${(sale['total_amount'] as num).toDouble().toStringAsFixed(2)}', style: TextStyle(color: isVoid ? Colors.redAccent : Colors.white, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text(isVoid ? 'VOIDED' : 'COMPLETED', style: TextStyle(color: isVoid ? Colors.redAccent : const Color(0xFF2ECC71), fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
