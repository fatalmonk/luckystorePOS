import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../models/party.dart';

/// Customer phone lookup for credit sales
/// Type last 4 digits → auto-fill name/balance
class CustomerPhoneLookup extends StatefulWidget {
  final Function(Party) onCustomerSelected;

  const CustomerPhoneLookup({
    super.key,
    required this.onCustomerSelected,
  });

  @override
  State<CustomerPhoneLookup> createState() => _CustomerPhoneLookupState();
}

class _CustomerPhoneLookupState extends State<CustomerPhoneLookup> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  List<Party> _matches = [];
  bool _loading = false;
  Party? _selectedCustomer;

  Future<void> _search(String query) async {
    if (query.length < 3) {
      setState(() => _matches = []);
      return;
    }

    setState(() => _loading = true);

    try {
      final supabase = Supabase.instance.client;
      final response = await supabase
          .from('parties')
          .select()
          .eq('type', 'customer')
          .ilike('phone', '%$query')
          .limit(10);

      setState(() {
        _matches = (response as List)
            .map((r) => Party.fromJson(r as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _controller,
          focusNode: _focusNode,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            hintText: 'ফোনের শেষ ৪ সংখ্যা লিখুন',
            prefixIcon: const Icon(Icons.phone),
            suffixIcon: _controller.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _controller.clear();
                      setState(() {
                        _matches = [];
                        _selectedCustomer = null;
                      });
                    },
                  )
                : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          onChanged: _search,
        ),
        if (_loading)
          const Padding(
            padding: EdgeInsets.all(8.0),
            child: LinearProgressIndicator(),
          ),
        if (_matches.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: AppColors.surfaceDefault,
              border: Border.all(color: AppColors.borderDefault),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: _matches.length,
              itemBuilder: (context, index) {
                final customer = _matches[index];
                return ListTile(
                  dense: true,
                  title: Text(customer.name),
                  subtitle: Text(
                      '${customer.phone ?? ''} | বকেয়া: ৳${customer.currentBalance.toStringAsFixed(0)}',
                  ),
                  onTap: () {
                    setState(() {
                      _selectedCustomer = customer;
                      _controller.text = customer.phone ?? '';
                      _matches = [];
                    });
                    widget.onCustomerSelected(customer);
                    _focusNode.unfocus();
                  },
                );
              },
            ),
          ),
        if (_selectedCustomer != null)
          Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.successSubtle,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.successDefault),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: AppColors.successDefault),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _selectedCustomer!.name,
                        style: AppTextStyles.bodyMd.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'বকেয়া: ৳${_selectedCustomer!.currentBalance.toStringAsFixed(0)}',
                        style: AppTextStyles.bodySm,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    setState(() {
                      _selectedCustomer = null;
                      _controller.clear();
                    });
                  },
                ),
              ],
            ),
          ),
      ],
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }
}
