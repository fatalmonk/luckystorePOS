/// Conflict Resolution Dialog for manual conflict resolution with PIN protection for merge decisions.
/// 
/// Shows options: Keep Local, Use Server, Merge (requires manager PIN)
/// Displays conflict details and allows managers to resolve sync conflicts.
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../auth/presentation/screens/manager_pinch.dart';
import '../../conflict_resolver.dart';
import '../../offline_transaction_sync_service.dart';

/// Model for conflict resolution choice
enum ManualResolutionChoice {
  keepLocal,
  useServer,
  merge,
  cancel,
}

/// Result of manual conflict resolution
class ManualResolutionResult {
  final ManualResolutionChoice choice;
  final String? managerPin;
  final String? notes;
  final DateTime? resolvedAt;

  const ManualResolutionResult({
    required this.choice,
    this.managerPin,
    this.notes,
    this.resolvedAt,
  });
}

/// Dialog for resolving sync conflicts manually
class ConflictResolutionDialog extends StatefulWidget {
  final QueuedOfflineTransaction transaction;
  final Map<String, dynamic>? serverData;
  final VoidCallback? onResolved;

  const ConflictResolutionDialog({
    super.key,
    required this.transaction,
    this.serverData,
    this.onResolved,
  });

  @override
  State<ConflictResolutionDialog> createState() => _ConflictResolutionDialogState();

  /// Show the dialog and return the resolution result
  static Future<ManualResolutionResult?> show(
    BuildContext context, {
    required QueuedOfflineTransaction transaction,
    Map<String, dynamic>? serverData,
  }) async {
    return showDialog<ManualResolutionResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => ConflictResolutionDialog(
        transaction: transaction,
        serverData: serverData,
      ),
    );
  }
}

class _ConflictResolutionDialogState extends State<ConflictResolutionDialog>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _notesController = TextEditingController();
  bool _isResolving = false;
  ManualResolutionChoice? _selectedChoice;
  String? _errorMessage;

  // Conflict details
  Map<String, dynamic> get _localData => widget.transaction.snapshot ?? {};
  Map<String, dynamic> get _serverData => widget.serverData ?? widget.transaction.conflictMeta ?? {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final conflictType = widget.transaction.conflictType ?? 'unknown';
    final hasManagerRole = _hasManagerRole();

    return AlertDialog(
      backgroundColor: Color(0xFF161B22),
      title: Row(
        children: [
          Icon(
            Icons.warning_amber_rounded,
            color: AppColors.warningDefault,
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Resolve Conflict',
              style: AppTextStyles.headingMd,
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: 600,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Transaction info header
            _buildTransactionInfo(),
            const SizedBox(height: 16),
            
            // Conflict reason
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.dangerSubtle.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.dangerSubtle.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: AppColors.dangerDefault, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Conflict: ${_formatConflictType(conflictType)}',
                      style: AppTextStyles.bodySm.copyWith(
                        color: AppColors.dangerDefault,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            
            // Comparison tabs
            TabBar(
              controller: _tabController,
              labelStyle: AppTextStyles.labelSm,
              unselectedLabelStyle: AppTextStyles.labelSm,
              tabs: const [
                Tab(text: 'LOCAL'),
                Tab(text: 'SERVER'),
                Tab(text: 'DIFF'),
              ],
            ),
            SizedBox(
              height: 200,
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildDataView(_localData, 'Local (Device)'),
                  _buildDataView(_serverData, 'Server (Cloud)'),
                  _buildDiffView(),
                ],
              ),
            ),
            const SizedBox(height: 16),
            
            // Resolution options
            Text(
              'Resolution Options',
              style: AppTextStyles.labelMd.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            _buildResolutionOptions(hasManagerRole),
            
            // Notes field
            if (_selectedChoice != null) ...[
              const SizedBox(height: 16),
              TextField(
                controller: _notesController,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Resolution Notes (optional)',
                  labelStyle: AppTextStyles.bodySm,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  contentPadding: const EdgeInsets.all(12),
                ),
                style: AppTextStyles.bodySm,
              ),
            ],
            
            // Error message
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.dangerSubtle.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: AppColors.dangerDefault, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: AppTextStyles.bodySm.copyWith(
                          color: AppColors.dangerDefault,
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
      actions: [
        TextButton(
          onPressed: _isResolving ? null : () => Navigator.pop(context),
          child: Text(
            'Cancel',
            style: AppTextStyles.labelMd.copyWith(color: AppColors.textSecondary),
          ),
        ),
        if (_selectedChoice != null)
          ElevatedButton(
            onPressed: _isResolving ? null : _resolveConflict,
            style: ElevatedButton.styleFrom(
              backgroundColor: _selectedChoice == ManualResolutionChoice.merge
                  ? AppColors.warningDefault
                  : AppColors.primaryDefault,
            ),
            child: _isResolving
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.textInverse),
                    ),
                  )
                : Text(
                    _getResolutionButtonText(),
                    style: AppTextStyles.labelMd.copyWith(color: AppColors.textInverse),
                  ),
          ),
      ],
    );
  }

  Widget _buildTransactionInfo() {
    final formatter = DateFormat('MMM dd, yyyy HH:mm:ss');
    final total = widget.transaction.items.fold<double>(
      0,
      (sum, item) => sum + ((item['quantity'] as num? ?? 0) * (item['price'] as num? ?? 0)),
    );

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundDefault,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Transaction ID',
                  style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary),
                ),
              ),
              Text(
                widget.transaction.clientTransactionId.substring(0, 16) + '...',
                style: AppTextStyles.bodySm.copyWith(fontFamily: 'monospace'),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Created',
                  style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary),
                ),
              ),
              Text(
                formatter.format(widget.transaction.createdAt),
                style: AppTextStyles.bodySm,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Total Amount',
                  style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary),
                ),
              ),
              Text(
                '\$${total.toStringAsFixed(2)}',
                style: AppTextStyles.bodySm.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Items',
                  style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary),
                ),
              ),
              Text(
                '${widget.transaction.items.length} items',
                style: AppTextStyles.bodySm,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDataView(Map<String, dynamic> data, String label) {
    if (data.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off, color: AppColors.textMuted, size: 48),
            const SizedBox(height: 8),
            Text(
              'No data available',
              style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundDefault,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTextStyles.labelSm.copyWith(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Divider(height: 16),
          Expanded(
            child: ListView.builder(
              itemCount: _extractItems(data).length,
              itemBuilder: (context, index) {
                final item = _extractItems(data)[index];
                return _buildItemRow(item);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDiffView() {
    final localItems = _extractItems(_localData);
    final serverItems = _extractItems(_serverData);
    final allItemIds = <String>{...localItems.map((i) => i['id'] ?? ''), ...serverItems.map((i) => i['id'] ?? '')};

    if (allItemIds.isEmpty || allItemIds.first.isEmpty) {
      return Center(
        child: Text(
          'No comparison data available',
          style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundDefault,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                flex: 1,
                child: Text('Item', style: AppTextStyles.labelSm),
              ),
              Expanded(
                child: Text('Local', style: AppTextStyles.labelSm.copyWith(color: AppColors.primaryDefault)),
              ),
              Expanded(
                child: Text('Server', style: AppTextStyles.labelSm.copyWith(color: AppColors.infoDefault)),
              ),
            ],
          ),
          const Divider(height: 16),
          Expanded(
            child: ListView.builder(
              itemCount: allItemIds.length,
              itemBuilder: (context, index) {
                final itemId = allItemIds.elementAt(index);
                if (itemId.isEmpty) return const SizedBox.shrink();
                
                final localItem = localItems.firstWhere(
                  (i) => i['id'] == itemId || i['product_id'] == itemId,
                  orElse: () => {},
                );
                final serverItem = serverItems.firstWhere(
                  (i) => i['id'] == itemId || i['product_id'] == itemId,
                  orElse: () => {},
                );
                
                return _buildDiffRow(itemId, localItem, serverItem);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemRow(Map<String, dynamic> item) {
    final name = item['name'] ?? item['product_name'] ?? 'Unknown Item';
    final quantity = item['quantity'] ?? 0;
    final price = (item['price'] as num? ?? 0).toDouble();
    final total = quantity * price;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              name,
              style: AppTextStyles.bodySm,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Expanded(
            child: Text(
              '$quantity × \$${price.toStringAsFixed(2)}',
              style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.right,
            ),
          ),
          Expanded(
            child: Text(
              '\$${total.toStringAsFixed(2)}',
              style: AppTextStyles.bodySm.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDiffRow(String itemId, Map<String, dynamic> localItem, Map<String, dynamic> serverItem) {
    final name = localItem['name'] ?? serverItem['name'] ?? localItem['product_name'] ?? serverItem['product_name'] ?? itemId;
    final localQty = localItem['quantity'] ?? 0;
    final serverQty = serverItem['quantity'] ?? 0;
    final localPrice = (localItem['price'] as num? ?? 0).toDouble();
    final serverPrice = (serverItem['price'] as num? ?? 0).toDouble();
    final hasDifference = localQty != serverQty || (localPrice - serverPrice).abs() > 0.01;

    return Container(
      color: hasDifference ? AppColors.warningSubtle.withOpacity(0.1) : null,
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      margin: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Row(
              children: [
                if (hasDifference)
                  Icon(Icons.warning, color: AppColors.warningDefault, size: 14),
                if (hasDifference) const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    name,
                    style: AppTextStyles.bodySm.copyWith(
                      fontWeight: hasDifference ? FontWeight.bold : null,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Text(
              localQty > 0 ? '$localQty @ \$${localPrice.toStringAsFixed(2)}' : '-',
              style: AppTextStyles.bodySm.copyWith(
                color: AppColors.primaryDefault,
                decoration: hasDifference ? TextDecoration.lineThrough : null,
              ),
              textAlign: TextAlign.right,
            ),
          ),
          Expanded(
            child: Text(
              serverQty > 0 ? '$serverQty @ \$${serverPrice.toStringAsFixed(2)}' : '-',
              style: AppTextStyles.bodySm.copyWith(
                color: AppColors.infoDefault,
                fontWeight: hasDifference ? FontWeight.bold : null,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResolutionOptions(bool hasManagerRole) {
    return Column(
      children: [
        _buildResolutionOption(
          ManualResolutionChoice.keepLocal,
          'Keep Local',
          'Use the version from this device',
          Icons.save,
          AppColors.primaryDefault,
          true,
        ),
        const SizedBox(height: 8),
        _buildResolutionOption(
          ManualResolutionChoice.useServer,
          'Use Server',
          'Accept the server version (override local)',
          Icons.cloud_done,
          AppColors.infoDefault,
          true,
        ),
        const SizedBox(height: 8),
        _buildResolutionOption(
          ManualResolutionChoice.merge,
          'Merge (Manager Only)',
          'Intelligently combine both versions',
          Icons.merge_type,
          AppColors.warningDefault,
          hasManagerRole,
        ),
        if (!hasManagerRole) ...[
          const SizedBox(height: 4),
          Text(
            '⚠️ Merge requires manager authentication',
            style: AppTextStyles.bodyXs.copyWith(color: AppColors.textMuted),
          ),
        ],
      ],
    );
  }

  Widget _buildResolutionOption(
    ManualResolutionChoice choice,
    String title,
    String subtitle,
    IconData icon,
    Color color,
    bool enabled,
  ) {
    final isSelected = _selectedChoice == choice;
    
    return InkWell(
      onTap: enabled && !_isResolving
          ? () => setState(() => _selectedChoice = choice)
          : null,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : AppColors.backgroundDefault,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? color : AppColors.borderDefault,
            width: isSelected ? 2 : 1,
          ),
          opacity: enabled ? 1.0 : 0.5,
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.labelMd.copyWith(
                      fontWeight: FontWeight.bold,
                      color: enabled ? AppColors.textPrimary : AppColors.textMuted,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: AppTextStyles.bodySm.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Radio<ManualResolutionChoice>(
              value: choice,
              groupValue: _selectedChoice,
              onChanged: enabled && !_isResolving
                  ? (value) => setState(() => _selectedChoice = value)
                  : null,
              activeColor: color,
            ),
          ],
        ),
      ),
    );
  }

  String _getResolutionButtonText() {
    switch (_selectedChoice) {
      case ManualResolutionChoice.keepLocal:
        return 'Keep Local';
      case ManualResolutionChoice.useServer:
        return 'Use Server';
      case ManualResolutionChoice.merge:
        return 'Merge (PIN Required)';
      case ManualResolutionChoice.cancel:
        return 'Cancel';
      default:
        return 'Resolve';
    }
  }

  String _formatConflictType(String type) {
    return type
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isEmpty ? '' : '${word[0].toUpperCase()}${word.substring(1)}')
        .join(' ');
  }

  bool _hasManagerRole() {
    final authProvider = context.read<AuthProvider>();
    final role = authProvider.appUser?.role;
    return role == 'manager' || role == 'admin';
  }

  List<Map<String, dynamic>> _extractItems(Map<String, dynamic> data) {
    final items = data['items'] ?? data['products'] ?? [];
    if (items is List) {
      return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  Future<void> _resolveConflict() async {
    if (_selectedChoice == null) return;

    setState(() {
      _isResolving = true;
      _errorMessage = null;
    });

    try {
      // For merge option, require manager PIN
      if (_selectedChoice == ManualResolutionChoice.merge) {
        final pin = await _requestManagerPin();
        if (pin == null) {
          setState(() => _isResolving = false);
          return;
        }

        // Verify the PIN
        final authProvider = context.read<AuthProvider>();
        final isValid = await authProvider.verifyManagerPin(pin);
        if (!isValid) {
          setState(() {
            _isResolving = false;
            _errorMessage = 'Invalid manager PIN';
          });
          return;
        }

        Navigator.pop(context, ManualResolutionResult(
          choice: _selectedChoice!,
          managerPin: pin,
          notes: _notesController.text.isEmpty ? null : _notesController.text,
          resolvedAt: DateTime.now(),
        ));
        return;
      }

      // For non-merge options, resolve immediately
      Navigator.pop(context, ManualResolutionResult(
        choice: _selectedChoice!,
        notes: _notesController.text.isEmpty ? null : _notesController.text,
        resolvedAt: DateTime.now(),
      ));
    } catch (e) {
      setState(() {
        _isResolving = false;
        _errorMessage = 'Failed to resolve conflict: $e';
      });
    }
  }

  Future<String?> _requestManagerPin() async {
    final result = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _ManagerPinInputDialog(),
    );
    return result;
  }
}

/// Simple PIN input dialog for manager authentication
class _ManagerPinInputDialog extends StatefulWidget {
  @override
  State<_ManagerPinInputDialog> createState() => _ManagerPinInputDialogState();
}

class _ManagerPinInputDialogState extends State<_ManagerPinInputDialog> {
  final List<TextEditingController> _controllers = List.generate(4, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(4, (_) => FocusNode());
  String _pin = '';

  @override
  void dispose() {
    for (var c in _controllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: Color(0xFF161B22),
      title: Text(
        'Manager PIN Required',
        style: AppTextStyles.headingSm,
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Merging conflicts requires manager authentication.',
            style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(4, (index) {
              return Container(
                width: 50,
                height: 60,
                margin: const EdgeInsets.symmetric(horizontal: 6),
                child: TextField(
                  controller: _controllers[index],
                  focusNode: _focusNodes[index],
                  textAlign: TextAlign.center,
                  maxLength: 1,
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  obscuringCharacter: '●',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: AppColors.backgroundDefault,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: AppColors.primaryDefault, width: 2),
                    ),
                  ),
                  onChanged: (value) {
                    setState(() {
                      _pin = _controllers.map((c) => c.text).join();
                    });

                    // Move to next field
                    if (value.isNotEmpty && index < 3) {
                      _focusNodes[index + 1].requestFocus();
                    }

                    // Auto-submit when complete
                    if (_pin.length == 4) {
                      Navigator.pop(context, _pin);
                    }
                  },
                ),
              );
            }),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Cancel',
            style: AppTextStyles.labelMd.copyWith(color: AppColors.textSecondary),
          ),
        ),
      ],
    );
  }
}

  /// Apply a manual conflict resolution
  Future<void> applyConflictResolution({
    required String clientTransactionId,
    required ManualResolutionResult resolution,
    required SyncActionActor actor,
  }) async {
    final i = _queue.indexWhere((q) => q.clientTransactionId == clientTransactionId);
    if (i < 0) return;

    final tx = _queue[i];

    String validationState;
    
    switch (resolution.choice) {
      case ManualResolutionChoice.keepLocal:
        validationState = 'MANUAL_KEEP_LOCAL';
        _queue[i] = tx.copyWith(
          state: OfflineSyncState.pending,
          syncValidationState: validationState,
          requiresManagerReview: false,
        );
        break;
      case ManualResolutionChoice.useServer:
        validationState = 'MANUAL_ACCEPT_SERVER';
        _queue[i] = tx.copyWith(
          state: OfflineSyncState.synced,
          syncedAt: DateTime.now(),
          syncValidationState: validationState,
          requiresManagerReview: false,
        );
        break;
      case ManualResolutionChoice.merge:
        validationState = 'MANUAL_MERGE';
        _queue[i] = tx.copyWith(
          state: OfflineSyncState.pending,
          syncValidationState: validationState,
          requiresManagerReview: false,
        );
        // For merge, we'll need additional logic to merge data
        break;
      case ManualResolutionChoice.cancel:
        await deleteCorruptedItem(
          clientTransactionId: clientTransactionId,
          actor: actor,
        );
        return;
    }

    await _persistQueue();
    notifyListeners();

    // If set to pending, trigger a sync
    if (resolution.choice == ManualResolutionChoice.keepLocal ||
        resolution.choice == ManualResolutionChoice.merge) {
      unawaited(_syncQueue());
    }
  }
}

/// Extension to apply manual resolution to sync service
extension SyncServiceConflictResolution on OfflineTransactionSyncService {
  /// Apply a manual conflict resolution
  Future<void> resolveConflict({
    required String clientTransactionId,
    required ManualResolutionResult resolution,
    required SyncActionActor actor,
  }) async {
    // Access method via extension
  }
