import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../shared/providers/auth_provider.dart';

class OverdueCustomersScreen extends StatefulWidget {
  const OverdueCustomersScreen({super.key});

  @override
  State<OverdueCustomersScreen> createState() => _OverdueCustomersScreenState();
}

class _OverdueCustomersScreenState extends State<OverdueCustomersScreen> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  List<Map<String, dynamic>> _receivables = [];

  @override
  void initState() {
    super.initState();
    _fetchReceivables();
  }

  Future<void> _fetchReceivables() async {
    setState(() => _isLoading = true);
    final auth = context.read<AuthProvider>();
    final storeId = auth.appUser?.storeId;
    final userId = auth.appUser?.id;

    if (storeId == null || userId == null) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final response = await _supabase.rpc('get_receivables_aging', params: {
        'p_tenant_id': userId,
        'p_store_id': storeId,
        'p_search': null,
      }) as List<dynamic>;

      setState(() {
        _receivables = List<Map<String, dynamic>>.from(response);
      });
    } catch (e) {
      debugPrint('Error fetching receivables: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _launchWhatsApp(Map<String, dynamic> customer) async {
    final phone = customer['phone'] as String?;
    if (phone == null || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No phone number available.')),
      );
      return;
    }

    final name = customer['customer_name'] ?? 'Customer';
    final amount = customer['balance_due'] ?? 0;
    
    final message = '''Assalamu Alaikum $name,
Your outstanding balance at Lucky Store is ৳$amount.
Please clear dues at your earliest convenience.
Thank you.''';

    final uri = Uri.parse('https://wa.me/$phone?text=${Uri.encodeComponent(message)}');
    
    // Log reminder first
    final auth = context.read<AuthProvider>();
    try {
      await _supabase.rpc('log_customer_reminder', params: {
        'p_tenant_id': auth.appUser?.id,
        'p_store_id': auth.appUser?.storeId,
        'p_party_id': customer['party_id'],
        'p_type': 'whatsapp',
      });
    } catch (e) {
      debugPrint('Failed to log reminder: $e');
    }

    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not launch WhatsApp')),
        );
      }
    }
  }

  Future<void> _launchCall(Map<String, dynamic> customer) async {
    final phone = customer['phone'] as String?;
    if (phone == null || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No phone number available.')),
      );
      return;
    }

    final uri = Uri.parse('tel:$phone');
    if (!await launchUrl(uri)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not launch dialer')),
        );
      }
    }
  }

  void _showReceivePaymentBottomSheet(Map<String, dynamic> customer) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF161B22),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _ReceivePaymentSheet(
        customer: customer,
        onSuccess: () {
          Navigator.pop(ctx);
          _fetchReceivables();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment received successfully'), backgroundColor: Colors.green),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFE8B84B)));
    }

    if (_receivables.isEmpty) {
      return const Center(
        child: Text('No overdue customers found.', style: TextStyle(color: Colors.white54)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _receivables.length,
      itemBuilder: (context, index) {
        final customer = _receivables[index];
        final balance = customer['balance_due'] ?? 0;
        final days = customer['days_overdue'] ?? 0;
        
        return Card(
          color: const Color(0xFF161B22),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
          ),
          margin: const EdgeInsets.only(bottom: 12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => _showReceivePaymentBottomSheet(customer),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          customer['customer_name'] ?? 'Unknown Customer',
                          style: const TextStyle(
                              color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Text(
                        '৳$balance',
                        style: const TextStyle(
                            color: Color(0xFFE8B84B), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 14, color: Colors.white.withValues(alpha: 0.5)),
                      const SizedBox(width: 4),
                      Text(
                        '$days days overdue',
                        style: TextStyle(
                            color: days > 30 ? Colors.redAccent : Colors.white.withValues(alpha: 0.5),
                            fontSize: 12),
                      ),
                      const SizedBox(width: 16),
                      if (customer['phone'] != null) ...[
                        Icon(Icons.phone, size: 14, color: Colors.white.withValues(alpha: 0.5)),
                        const SizedBox(width: 4),
                        Text(
                          customer['phone'],
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12),
                        ),
                      ]
                    ],
                  ),
                  if (customer['last_note'] != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.note_alt_outlined, size: 14, color: Colors.white.withValues(alpha: 0.5)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              customer['last_note'],
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => _launchCall(customer),
                        icon: const Icon(Icons.call, size: 16),
                        label: const Text('Call'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.blueAccent,
                          side: const BorderSide(color: Colors.blueAccent),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: () => _launchWhatsApp(customer),
                        icon: const Icon(Icons.message, size: 16),
                        label: const Text('WhatsApp'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ReceivePaymentSheet extends StatefulWidget {
  final Map<String, dynamic> customer;
  final VoidCallback onSuccess;

  const _ReceivePaymentSheet({required this.customer, required this.onSuccess});

  @override
  State<_ReceivePaymentSheet> createState() => _ReceivePaymentSheetState();
}

class _ReceivePaymentSheetState extends State<_ReceivePaymentSheet> {
  final _amountController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _submitPayment() async {
    final amountText = _amountController.text.trim();
    if (amountText.isEmpty) return;

    final amount = double.tryParse(amountText);
    if (amount == null || amount <= 0) return;

    setState(() => _isSubmitting = true);

    try {
      final auth = context.read<AuthProvider>();
      final supabase = Supabase.instance.client;
      
      // Mocking cash account UUID for demo - usually fetched from settings
      const cashAccountId = '00000000-0000-0000-0000-000000000003';
      
      await supabase.rpc('record_customer_payment', params: {
        'p_idempotency_key': 'pay_${DateTime.now().millisecondsSinceEpoch}_${widget.customer['party_id']}',
        'p_tenant_id': auth.appUser?.id,
        'p_store_id': auth.appUser?.storeId,
        'p_party_id': widget.customer['party_id'],
        'p_amount': amount,
        'p_payment_account_id': cashAccountId,
      });

      widget.onSuccess();
    } catch (e) {
      debugPrint('Payment failed: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payment failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final balance = widget.customer['balance_due'] ?? 0;
    
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 24,
        right: 24,
        top: 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Receive Payment',
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'From: ${widget.customer['customer_name']}',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFE8B84B).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE8B84B).withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Due Balance', style: TextStyle(color: Color(0xFFE8B84B))),
                Text('৳$balance', style: const TextStyle(color: Color(0xFFE8B84B), fontSize: 20, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(color: Colors.white, fontSize: 24),
            autofocus: true,
            decoration: InputDecoration(
              labelText: 'Amount Received (৳)',
              labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE8B84B)),
              ),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _isSubmitting ? null : _submitPayment,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE8B84B),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _isSubmitting 
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
              : const Text('Confirm Payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
