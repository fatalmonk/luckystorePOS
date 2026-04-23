import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/pos_models.dart';
import '../../providers/pos_provider.dart';
import '../../services/label_printer_service.dart';

class LabelPrintScreen extends StatefulWidget {
  const LabelPrintScreen({super.key});

  @override
  State<LabelPrintScreen> createState() => _LabelPrintScreenState();
}

class _LabelPrintScreenState extends State<LabelPrintScreen> {
  final _searchCtrl = TextEditingController();
  List<PosItem> _searchResults = [];
  bool _isSearching = false;
  PosItem? _selectedItem;

  int _copies = 1;
  bool _isPrinting = false;
  String? _statusMsg;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _performSearch(String query) async {
    if (query.isEmpty) {
      if (mounted) setState(() => _searchResults = []);
      return;
    }
    setState(() => _isSearching = true);
    try {
      final posP = context.read<PosProvider>();
      final results = await posP.searchItems(query);
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
          _statusMsg = e.toString();
        });
      }
    }
  }

  Future<void> _handleScan(String barcode) async {
    setState(() => _searchCtrl.text = barcode);
    await _performSearch(barcode);
    if (_searchResults.isNotEmpty) {
      _selectItem(_searchResults.first);
    }
  }

  void _selectItem(PosItem item) {
    setState(() {
      _selectedItem = item;
      _copies = 1;
      _searchResults = [];
      _searchCtrl.clear();
      _statusMsg = null;
    });
  }

  Future<void> _printLabel() async {
    if (_selectedItem == null || _copies < 1) return;
    FocusScope.of(context).unfocus();

    setState(() {
      _isPrinting = true;
      _statusMsg = 'Connecting to printer...';
    });

    try {
      final printer = LabelPrinterService.instance;
      // You can update this to accept a dynamic name if you save it in receipt_config
      await printer.connect();
      
      setState(() => _statusMsg = 'Printing $_copies labels...');
      await printer.printLabels(_selectedItem!, _copies);
      
      setState(() {
        _statusMsg = 'Print successful!';
        _isPrinting = false;
      });

      // Clear success message after 3 seconds
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted && _statusMsg == 'Print successful!') {
          setState(() => _statusMsg = null);
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _statusMsg = 'Error: $e';
          _isPrinting = false;
        });
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
          title: const Text('Label Printer', style: TextStyle(fontWeight: FontWeight.bold)),
          elevation: 0,
        ),
        body: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Bar
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF161B22),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                ),
                child: TextField(
                  controller: _searchCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Search or Scan Barcode...',
                    hintStyle: const TextStyle(color: Colors.white38),
                    prefixIcon: const Icon(Icons.search, color: Colors.white54),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: Colors.white54),
                          onPressed: () {
                            _searchCtrl.clear();
                            _performSearch('');
                            setState((){});
                          },
                        )
                      : const Icon(Icons.qr_code_scanner, color: Colors.white54),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.all(16),
                  ),
                  onChanged: (val) {
                    setState((){});
                    // Debounce logic omitted for UI simplicity; perform search instantly or when submitted
                  },
                  onSubmitted: _handleScan,
                ),
              ),

              const SizedBox(height: 16),

              // Search Results
              if (_isSearching)
                const Center(child: CircularProgressIndicator(color: Color(0xFFE8B84B)))
              else if (_searchResults.isNotEmpty)
                Expanded(
                  flex: 2,
                  child: ListView.builder(
                    itemCount: _searchResults.length,
                    itemBuilder: (ctx, i) {
                      final item = _searchResults[i];
                      return ListTile(
                        title: Text(item.name, style: const TextStyle(color: Colors.white)),
                        subtitle: Text(item.barcode ?? item.sku, style: const TextStyle(color: Colors.white54)),
                        trailing: Text('৳ ${item.price.toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFFE8B84B))),
                        onTap: () => _selectItem(item),
                      );
                    },
                  ),
                ),

              if (_statusMsg != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  color: _statusMsg!.contains('Error') ? Colors.redAccent.withValues(alpha: 0.1) : const Color(0xFF2ECC71).withValues(alpha: 0.1),
                  child: Row(
                    children: [
                      Icon(
                        _statusMsg!.contains('Error') ? Icons.error_outline : Icons.info_outline,
                        color: _statusMsg!.contains('Error') ? Colors.redAccent : const Color(0xFF2ECC71)
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_statusMsg!, style: TextStyle(color: _statusMsg!.contains('Error') ? Colors.redAccent : const Color(0xFF2ECC71)))),
                    ],
                  ),
                ),
              ],

              // Selected Item Builder
              if (_selectedItem != null && _searchResults.isEmpty) ...[
                const SizedBox(height: 24),
                const Text('Selected for Printing:', style: TextStyle(color: Colors.white54, fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF161B22),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE8B84B).withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    children: [
                      // Virtual Label Preview
                      Container(
                        width: 250,
                        height: 150,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 10)],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('Lucky Store', style: TextStyle(color: Colors.black, fontSize: 14, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(_selectedItem!.name, style: const TextStyle(color: Colors.black87, fontSize: 12), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Text('Tk ${_selectedItem!.price.toStringAsFixed(2)}', style: const TextStyle(color: Colors.black, fontSize: 16, fontWeight: FontWeight.w900)),
                            const SizedBox(height: 8),
                            // Basic barcode box mock for preview
                            Container(width: 150, height: 30, color: Colors.black87, child: const Center(child: Text('|||||| |||| ||| |||', style: TextStyle(color: Colors.white)))),
                            const SizedBox(height: 2),
                            Text(_selectedItem!.barcode ?? _selectedItem!.sku, style: const TextStyle(color: Colors.black, fontSize: 10, letterSpacing: 1)),
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Copies Selector
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('Copies:', style: TextStyle(color: Colors.white70, fontSize: 16)),
                          const SizedBox(width: 20),
                          Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF0D1117),
                              borderRadius: BorderRadius.circular(50),
                            ),
                            child: Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove, color: Colors.white),
                                  onPressed: () {
                                    if (_copies > 1) setState(() => _copies--);
                                  },
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  child: Text('$_copies', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add, color: Colors.white),
                                  onPressed: () {
                                    if (_copies < 99) setState(() => _copies++);
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 32),

                      // Print Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _isPrinting ? null : _printLabel,
                          icon: _isPrinting 
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                            : const Icon(Icons.print, color: Colors.black),
                          label: Text(_isPrinting ? 'PRINTING...' : 'PRINT LABELS', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, letterSpacing: 1)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE8B84B),
                            disabledBackgroundColor: const Color(0xFFE8B84B).withValues(alpha: 0.5),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
