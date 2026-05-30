// Stock Adjustment Screen for Lucky Store Mobile POS
// Allows managers/cashiers to adjust stock for:
// - Damaged, - Theft, - Found, - Return to Supplier

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../models/pos_models.dart';
import '../../../../shared/providers/pos_provider.dart';

/// Stock adjustment type with metadata
enum AdjustmentType {
  damaged,
  theft,
  found,
  returnToSupplier;

  String get displayName {
    switch (this) {
      case AdjustmentType.damaged:
        return 'Damaged';
      case AdjustmentType.theft:
        return 'Theft';
      case AdjustmentType.found:
        return 'Found';
      case AdjustmentType.returnToSupplier:
        return 'Return to Supplier';
    }
  }

  String get rpcReason {
    switch (this) {
      case AdjustmentType.damaged:
        return 'damaged';
      case AdjustmentType.theft:
        return 'theft';
      case AdjustmentType.found:
        return 'found';
      case AdjustmentType.returnToSupplier:
        return 'return_to_supplier';
    }
  }

  /// Whether this adjustment type increases or decreases stock
  bool get increasesStock => this == AdjustmentType.found;

  IconData get icon {
    switch (this) {
      case AdjustmentType.damaged:
        return Icons.broken_image_rounded;
      case AdjustmentType.theft:
        return Icons.warning_amber_rounded;
      case AdjustmentType.found:
        return Icons.inventory_2_rounded;
      case AdjustmentType.returnToSupplier:
        return Icons.undo_rounded;
    }
  }

  Color get color {
    switch (this) {
      case AdjustmentType.damaged:
        return AppColors.warningDefault;
      case AdjustmentType.theft:
        return AppColors.dangerDefault;
      case AdjustmentType.found:
        return AppColors.successDefault;
      case AdjustmentType.returnToSupplier:
        return AppColors.infoDefault;
    }
  }
}

/// Stock adjustment result model
class StockAdjustmentResult {
  final bool success;
  final String message;
  final int? newStockLevel;
  final String? errorCode;

  StockAdjustmentResult({
    required this.success,
    required this.message,
    this.newStockLevel,
    this.errorCode,
  });
}

/// Stock Adjustment Screen
class StockAdjustmentScreen extends StatefulWidget {
  const StockAdjustmentScreen({super.key});

  @override
  State<StockAdjustmentScreen> createState() => _StockAdjustmentScreenState();
}

class _StockAdjustmentScreenState extends State<StockAdjustmentScreen> {
  final _searchController = TextEditingController();
  final _quantityController = TextEditingController();
  final _notesController = TextEditingController();

  PosItem? _selectedItem;
  AdjustmentType? _selectedType;
  bool _isSearching = false;
  bool _isSubmitting = false;
  List<PosItem> _searchResults = [];
  String? _errorMessage;
  int _currentStock = 0;

  @override
  void dispose() {
    _searchController.dispose();
    _quantityController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  /// Search for items using the PosProvider
  Future<void> _searchItems(String query) async {
    if (query.trim().length < 2) {
      setState(() {
        _searchResults = [];
        _errorMessage = null;
      });
      return;
    }

    setState(() {
      _isSearching = true;
      _errorMessage = null;
    });

    try {
      final posProvider = context.read<PosProvider>();
      final results = await posProvider.searchItems(query.trim());

      if (mounted) {
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _searchResults = [];
          _isSearching = false;
          _errorMessage = 'Failed to search items: $e';
        });
      }
    }
  }

  /// Scan barcode using PosProvider
  Future<void> _scanBarcode() async {
    setState(() {
      _isSearching = true;
      _errorMessage = null;
    });

    try {
      // Use the search field value or show a barcode input dialog
      final barcode = _searchController.text.trim();
      if (barcode.isEmpty) {
        // Show scanning simulation or barcode input
        _showBarcodeInputDialog();
        setState(() => _isSearching = false);
        return;
      }

      final posProvider = context.read<PosProvider>();
      final item = await posProvider.scanItem(barcode);

      if (mounted) {
        setState(() {
          _isSearching = false;
          if (item != null) {
            _selectItem(item);
            _searchResults = [];
          } else {
            _errorMessage = 'No item found with barcode: $barcode';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
          _errorMessage = 'Failed to scan: $e';
        });
      }
    }
  }

  void _showBarcodeInputDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enter Barcode'),
        content: TextField(
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Scan or type barcode...',
            border: OutlineInputBorder(),
          ),
          onSubmitted: (value) {
            Navigator.pop(context);
            _searchController.text = value;
            _scanBarcode();
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  void _selectItem(PosItem item) async {
    setState(() {
      _selectedItem = item;
      _searchController.text = '${item.name} (${item.sku})';
      _searchResults = [];
      _currentStock = item.qtyOnHand;
    });

    // Fetch current stock from database for accuracy
    await _fetchCurrentStock(item);
  }

  Future<void> _fetchCurrentStock(PosItem item) async {
    try {
      final supabase = Supabase.instance.client;
      final storeId = context.read<PosProvider>().storeId;
      
      if (storeId == null) return;

      final result = await supabase
          .from('stock_levels')
          .select('qty')
          .eq('store_id', storeId)
          .eq('item_id', item.id)
          .maybeSingle();

      if (result != null && mounted) {
        setState(() {
          _currentStock = result['qty'] as int;
        });
      }
    } catch (e) {
      // Log error - stock fetch failed
      // Keep the cached stock level
    }
  }

  /// Submit the stock adjustment via RPC
  Future<void> _submitAdjustment() async {
    if (_selectedItem == null) {
      setState(() => _errorMessage = 'Please select an item');
      return;
    }

    if (_selectedType == null) {
      setState(() => _errorMessage = 'Please select an adjustment type');
      return;
    }

    final quantityText = _quantityController.text.trim();
    if (quantityText.isEmpty) {
      setState(() => _errorMessage = 'Please enter a quantity');
      return;
    }

    final quantity = int.tryParse(quantityText);
    if (quantity == null || quantity <= 0) {
      setState(() => _errorMessage = 'Please enter a valid positive quantity');
      return;
    }

    // Calculate adjustment delta (positive for found, negative for others)
    final delta = _selectedType!.increasesStock ? quantity : -quantity;

    // Check if reducing more than available stock
    if (!_selectedType!.increasesStock && quantity > _currentStock) {
      setState(() => 
        _errorMessage = 'Cannot adjust by more than current stock ($_currentStock)');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final posProvider = context.read<PosProvider>();
      
      // Call the adjust stock RPC via edge function
      final result = await posProvider.adjustStock(
        itemId: _selectedItem!.id,
        delta: delta,
        reason: _selectedType!.rpcReason,
        notes: _notesController.text.trim().isNotEmpty 
          ? _notesController.text.trim() 
          : null,
      );

      if (!mounted) return;

      if (result['success'] == true) {
        final data = result['data'] as Map<String, dynamic>?;
        final newStock = data?['new_quantity'] as int? ?? (_currentStock + delta);
        
        setState(() {
          _isSubmitting = false;
          _currentStock = newStock;
        });

        _showSuccessDialog(
          _selectedItem!.name,
          delta,
          newStock,
        );
      } else {
        final errorCode = result['error_code'] as String?;
        final errorMsg = result['error'] as String? ?? 'Stock adjustment failed';

        if (errorCode == 'MANAGER_AUTH_REQUIRED') {
          // Manager auth required (large adjustment)
          _showManagerAuthDialog(delta);
        } else {
          setState(() {
            _isSubmitting = false;
            _errorMessage = errorMsg;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = 'Network error: $e';
        });
      }
    }
  }

  void _showManagerAuthDialog(int delta) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.admin_panel_settings, color: AppColors.warningDefault),
            const SizedBox(width: 8),
            const Text('Manager Approval Required'),
          ],
        ),
        content: const Text(
          'This stock adjustment requires manager approval.\n\n'
          'Please have a manager enter their PIN to proceed.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() => _isSubmitting = false);
            },
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _requestManagerAuth(delta);
            },
            child: const Text('Enter Manager PIN'),
          ),
        ],
      ),
    );
  }

  Future<void> _requestManagerAuth(int delta) async {
    // This should call the manager PIN screen
    // For now, we'll just retry with a placeholder
    // In production, this would integrate with ManagerPinch
    setState(() => _isSubmitting = true);

    try {
      // Call the manager auth flow from manager_pinch.dart
      final posProvider = context.read<PosProvider>();
      
      // Retry with manager pin (would be retrieved from manager_pinch)
      final result = await posProvider.adjustStock(
        itemId: _selectedItem!.id,
        delta: delta,
        reason: _selectedType!.rpcReason,
        notes: _notesController.text.trim().isNotEmpty 
          ? _notesController.text.trim() 
          : null,
        managerPin: 'MANAGER_PIN_PLACEHOLDER',
      );

      if (!mounted) return;

      if (result['success'] == true) {
        final data = result['data'] as Map<String, dynamic>?;
        final newStock = data?['new_quantity'] as int? ?? (_currentStock + delta);
        
        setState(() {
          _isSubmitting = false;
          _currentStock = newStock;
        });

        _showSuccessDialog(
          _selectedItem!.name,
          delta,
          newStock,
        );
      } else {
        setState(() {
          _isSubmitting = false;
          _errorMessage = result['error'] ?? 'Manager authorization failed';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = 'Authorization error: $e';
        });
      }
    }
  }

  void _showSuccessDialog(String itemName, int delta, int newStock) {
    final isPositive = delta > 0;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              Icons.check_circle,
              color: AppColors.successDefault,
            ),
            const SizedBox(width: 8),
            const Text('Adjustment Complete'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              itemName,
              style: AppTextStyles.headingMd,
            ),
            const SizedBox(height: 16),
            _buildInfoRow(
              'Adjustment Type',
              _selectedType!.displayName,
            ),
            _buildInfoRow(
              'Quantity ${isPositive ? 'Added' : 'Removed'}',
              '${isPositive ? '+' : ''}$delta',
              valueColor: isPositive ? AppColors.successDefault : AppColors.dangerDefault,
            ),
            const Divider(height: 24),
            _buildInfoRow(
              'New Stock Level',
              '$newStock units',
              valueColor: AppColors.primaryDefault,
              isBold: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _clearForm();
            },
            child: const Text('Done'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _clearForm();
            },
            child: const Text('Make Another Adjustment'),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTextStyles.bodySm,
          ),
          Text(
            value,
            style: AppTextStyles.bodyMd.copyWith(
              color: valueColor,
              fontWeight: isBold ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  void _clearForm() {
    setState(() {
      _selectedItem = null;
      _selectedType = null;
      _searchController.clear();
      _quantityController.clear();
      _notesController.clear();
      _currentStock = 0;
      _errorMessage = null;
      _searchResults = [];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceDefault,
        elevation: 0,
        centerTitle: true,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.inventory_2_rounded,
              color: AppColors.primaryDefault,
              size: 24,
            ),
            const SizedBox(width: 8),
            Text(
              'Stock Adjustment',
              style: AppTextStyles.headingMd.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        actions: [
          if (_selectedItem != null)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _clearForm,
              tooltip: 'Clear',
            ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.space6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Section
              _buildSearchSection(),

              const SizedBox(height: AppSpacing.space6),

              // Selected Item Info
              if (_selectedItem != null) ...[
                _buildSelectedItemCard(),
                const SizedBox(height: AppSpacing.space6),
              ],

              // Adjustment Type Selection
              if (_selectedItem != null) ...[
                _buildAdjustmentTypeSection(),
                const SizedBox(height: AppSpacing.space6),
              ],

              // Quantity and Notes
              if (_selectedType != null) ...[
                _buildQuantitySection(),
                const SizedBox(height: AppSpacing.space6),
                _buildNotesSection(),
                const SizedBox(height: AppSpacing.space8),
              ],

              // Error Message
              if (_errorMessage != null)
                _buildErrorSection(),

              const SizedBox(height: AppSpacing.space8),

              // Submit Button
              if (_selectedItem != null && _selectedType != null)
                _buildSubmitButton(),

              const SizedBox(height: AppSpacing.space16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchSection() {
    return Card(
      elevation: 0,
      color: AppColors.surfaceDefault,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.borderDefault),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Search Product',
              style: AppTextStyles.headingMd,
            ),
            const SizedBox(height: AppSpacing.space4),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Type name, SKU, or barcode...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _isSearching
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: Padding(
                                padding: EdgeInsets.all(8.0),
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {
                                  _searchResults = [];
                                });
                              },
                            ),
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: _searchItems,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _scanBarcode(),
                  ),
                ),
                const SizedBox(width: AppSpacing.space3),
                ElevatedButton.icon(
                  onPressed: _isSearching ? null : _scanBarcode,
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Text('Scan'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryDefault,
                    foregroundColor: AppColors.primaryOn,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.space4,
                      vertical: AppSpacing.space4,
                    ),
                  ),
                ),
              ],
            ),

            // Search Results
            if (_searchResults.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: AppSpacing.space3),
                constraints: const BoxConstraints(maxHeight: 250),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.borderDefault),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _searchResults.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final item = _searchResults[index];
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.space4,
                        vertical: AppSpacing.space1,
                      ),
                      leading: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.backgroundSubtle,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: item.imageUrl != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: Image.network(
                                  item.imageUrl!,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.image_not_supported,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              )
                            : const Icon(
                                Icons.inventory_2_outlined,
                                color: AppColors.textMuted,
                              ),
                      ),
                      title: Text(
                        item.name,
                        style: AppTextStyles.labelLg,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'SKU: ${item.sku}',
                            style: AppTextStyles.bodySm,
                          ),
                          Text(
                            'Stock: ${item.qtyOnHand} units',
                            style: AppTextStyles.bodySm.copyWith(
                              color: item.qtyOnHand <= 5
                                  ? AppColors.dangerDefault
                                  : AppColors.successDefault,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      trailing: Text(
                        '৳${item.price.toStringAsFixed(2)}',
                        style: AppTextStyles.labelLg.copyWith(
                          color: AppColors.primaryDefault,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      onTap: () => _selectItem(item),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectedItemCard() {
    return Card(
      elevation: 0,
      color: AppColors.primarySubtle,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.primaryDefault.withValues(alpha: 0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDefault,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: _selectedItem!.imageUrl != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            _selectedItem!.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.image_not_supported,
                              color: AppColors.textMuted,
                            ),
                          ),
                        )
                      : Icon(
                          Icons.inventory_2_rounded,
                          size: 28,
                          color: AppColors.primaryDefault,
                        ),
                ),
                const SizedBox(width: AppSpacing.space4),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _selectedItem!.name,
                        style: AppTextStyles.headingMd.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'SKU: ${_selectedItem!.sku}',
                        style: AppTextStyles.bodySm,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStockStat(
                  'Current Stock',
                  '$_currentStock',
                  _currentStock <= 5 ? AppColors.dangerDefault : AppColors.successDefault,
                ),
                Container(
                  height: 40,
                  width: 1,
                  color: AppColors.borderDefault,
                ),
                _buildStockStat(
                  'Price',
                  '৳${_selectedItem!.price.toStringAsFixed(2)}',
                  AppColors.textPrimary,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStockStat(String label, String value, Color valueColor) {
    return Column(
      children: [
        Text(
          label,
          style: AppTextStyles.bodySm,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTextStyles.headingLg.copyWith(
            color: valueColor,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildAdjustmentTypeSection() {
    return Card(
      elevation: 0,
      color: AppColors.surfaceDefault,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.borderDefault),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Adjustment Type',
              style: AppTextStyles.headingMd,
            ),
            const SizedBox(height: 4),
            Text(
              'Select the reason for this stock adjustment',
              style: AppTextStyles.bodySm,
            ),
            const SizedBox(height: AppSpacing.space4),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: AppSpacing.space3,
              crossAxisSpacing: AppSpacing.space3,
              childAspectRatio: 1.6,
              children: AdjustmentType.values.map((type) {
                final isSelected = _selectedType == type;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  child: Material(
                    color: isSelected 
                        ? type.color.withValues(alpha: 0.1) 
                        : AppColors.backgroundSubtle,
                    borderRadius: BorderRadius.circular(10),
                    child: InkWell(
                      onTap: () => setState(() => _selectedType = type),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.space4),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: isSelected ? type.color : AppColors.borderDefault,
                            width: isSelected ? 2 : 1,
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              type.icon,
                              color: isSelected ? type.color : AppColors.textSecondary,
                              size: 28,
                            ),
                            const SizedBox(height: AppSpacing.space2),
                            Text(
                              type.displayName,
                              style: AppTextStyles.labelMd.copyWith(
                                color: isSelected 
                                    ? type.color 
                                    : AppColors.textPrimary,
                                fontWeight: isSelected 
                                    ? FontWeight.w600 
                                    : FontWeight.w500,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 2),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: type.increasesStock
                                    ? AppColors.successSubtle
                                    : AppColors.dangerSubtle,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                type.increasesStock ? 'ADD STOCK' : 'REMOVE STOCK',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: type.increasesStock
                                      ? AppColors.successDark
                                      : AppColors.dangerDark,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuantitySection() {
    final isPositive = _selectedType?.increasesStock ?? false;
    
    return Card(
      elevation: 0,
      color: AppColors.surfaceDefault,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.borderDefault),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Quantity',
                  style: AppTextStyles.headingMd,
                ),
                const SizedBox(width: AppSpacing.space3),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.space2,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: isPositive
                        ? AppColors.successSubtle
                        : AppColors.dangerSubtle,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    isPositive ? 'POSITIVE (+)' : 'NEGATIVE (-)',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: isPositive
                          ? AppColors.successDark
                          : AppColors.dangerDark,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Enter the number of units to ${isPositive ? 'add as found' : 'remove'}',
              style: AppTextStyles.bodySm,
            ),
            const SizedBox(height: AppSpacing.space4),
            TextField(
              controller: _quantityController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: 'Enter quantity...',
                prefixIcon: Icon(
                  Icons.numbers,
                  color: isPositive
                      ? AppColors.successDefault
                      : AppColors.dangerDefault,
                ),
                suffixText: 'units',
                border: const OutlineInputBorder(),
                focusedBorder: OutlineInputBorder(
                  borderSide: BorderSide(
                    color: isPositive
                        ? AppColors.successDefault
                        : AppColors.dangerDefault,
                    width: 2,
                  ),
                ),
              ),
            ),
            if (_selectedType?.increasesStock == false)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.space3),
                child: Row(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      size: 14,
                      color: AppColors.textMuted,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        'Max adjustment: $_currentStock units (current stock)',
                        style: AppTextStyles.bodySm.copyWith(
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotesSection() {
    return Card(
      elevation: 0,
      color: AppColors.surfaceDefault,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.borderDefault),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Notes (Optional)',
              style: AppTextStyles.headingMd,
            ),
            const SizedBox(height: 4),
            Text(
              'Add any additional details about this adjustment',
              style: AppTextStyles.bodySm,
            ),
            const SizedBox(height: AppSpacing.space4),
            TextField(
              controller: _notesController,
              maxLines: 3,
              maxLength: 200,
              decoration: const InputDecoration(
                hintText: 'e.g., Box damaged during delivery, customer never picked up...',
                prefixIcon: Icon(Icons.notes),
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              textInputAction: TextInputAction.done,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.space4),
      decoration: BoxDecoration(
        color: AppColors.dangerSubtle,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.dangerDefault),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline,
            color: AppColors.dangerDefault,
            size: 20,
          ),
          const SizedBox(width: AppSpacing.space3),
          Expanded(
            child: Text(
              _errorMessage!,
              style: AppTextStyles.bodySm.copyWith(
                color: AppColors.dangerDark,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: () => setState(() => _errorMessage = null),
            color: AppColors.dangerDefault,
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    final isPositive = _selectedType?.increasesStock ?? false;
    
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _submitAdjustment,
        style: ElevatedButton.styleFrom(
          backgroundColor: isPositive
              ? AppColors.successDefault
              : AppColors.primaryDefault,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        child: _isSubmitting
            ? const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  SizedBox(width: 12),
                  Text(
                    'Processing...',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isPositive ? Icons.add_circle : Icons.remove_circle,
                    size: 22,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Submit Adjustment',
                    style: AppTextStyles.labelLg.copyWith(
                      color: Colors.white,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
