import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../sales/offline_transaction_sync_service.dart';
import '../../../sales/store_closing_health_check_service.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../shared/providers/pos_provider.dart';

class _CloseReviewApproval {
  final bool confirmed;
  final StoreClosingHealthCheck check;
  final String? notes;
  final bool adminOverrideUsed;
  final String? adminOverrideReason;
  final String? adminOverrideReasonCategory;
  final String? adminOverrideNotes;
  final String? secondaryApproverUserId;
  final String? secondaryApproverRole;

  const _CloseReviewApproval({
    required this.confirmed,
    required this.check,
    required this.notes,
    required this.adminOverrideUsed,
    required this.adminOverrideReason,
    required this.adminOverrideReasonCategory,
    required this.adminOverrideNotes,
    required this.secondaryApproverUserId,
    required this.secondaryApproverRole,
  });
}

class PosSessionSummaryScreen extends StatefulWidget {
  final String sessionId;

  const PosSessionSummaryScreen({super.key, required this.sessionId});

  @override
  State<PosSessionSummaryScreen> createState() => _PosSessionSummaryScreenState();
}

class _PosSessionSummaryScreenState extends State<PosSessionSummaryScreen> {
  final _supabase = Supabase.instance.client;
  static const List<String> _overrideReasonCategories = [
    'internet outage',
    'queue corruption',
    'emergency close',
    'manager absence',
    'system incident',
    'other',
  ];
  // Variance threshold in Taka
  static const double _varianceThreshold = 50.0;
  
  bool _loading = true;
  String? _error;
  
  Map<String, dynamic>? _sessionData;
  List<dynamic> _salesData = [];
  double _expectedDrawer = 0.0;
  double _cashSales = 0.0;
  double _openingCash = 0.0;

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
            _cashSales = (summaryResp['total_cash_sales'] as num?)?.toDouble() ?? 0.0;
            _openingCash = (session['opening_cash'] as num?)?.toDouble() ?? 0.0;
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
            _cashSales = totalSales;
            _openingCash = openingCash;
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
    final approval = await _confirmClosingHealthReview();
    if (!approval.confirmed || !mounted) return;

    // Show drawer reconciliation dialog
    final reconciliationResult = await _showDrawerReconciliationDialog();
    if (reconciliationResult == null || !mounted) return;

    final double actualCash = reconciliationResult['actual_cash'] as double;
    final double variance = reconciliationResult['variance'] as double;
    final bool thresholdExceeded = reconciliationResult['threshold_exceeded'] as bool;
    final String? varianceNotes = reconciliationResult['variance_notes'] as String?;

    // If variance exceeds threshold, require manager override
    if (thresholdExceeded) {
      final overrideResult = await _requestManagerOverride(variance);
      if (!overrideResult['approved'] || !mounted) return;
      reconciliationResult['manager_pin_verified'] = true;
    }

    setState(() => _loading = true);
    try {
      // 1. Write close review log with variance details
      await _writeCloseReviewLog(
        check: approval.check,
        notes: varianceNotes ?? approval.notes,
        adminOverrideUsed: approval.adminOverrideUsed || thresholdExceeded,
        adminOverrideReason: approval.adminOverrideReason,
        adminOverrideReasonCategory: approval.adminOverrideReasonCategory,
        adminOverrideNotes: approval.adminOverrideNotes,
        secondaryApproverUserId: approval.secondaryApproverUserId,
        secondaryApproverRole: approval.secondaryApproverRole,
        varianceDetails: reconciliationResult,
      );

      // 2. Close session using the reconciliation RPC
      if (!mounted) return;
      final posProvider = context.read<PosProvider>();
      final cashAccountRow = await _supabase.from('accounts')
          .select('id')
          .eq('tenant_id', _supabase.auth.currentUser?.userMetadata?['tenant_id'])
          .eq('name', 'Cash in Hand')
          .limit(1)
          .single();
          
      final result = await posProvider.recordCashClosing(
        actualCash: actualCash,
        accountId: cashAccountRow['id'] as String,
      );

      if (result['status'] == 'success') {
        // Call the close_session_with_reconciliation RPC
        final closeResult = await _supabase.rpc(
          'close_session_with_reconciliation',
          params: {
            'p_session_id': widget.sessionId,
            'p_actual_cash': actualCash,
            'p_variance': variance,
            'p_notes': varianceNotes,
          },
        );

        final closeData = closeResult as Map<String, dynamic>;
        
        // Show variance report
        if (mounted) {
          await _showVarianceReport(closeData);
        }
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

  Future<void> _writeCloseReviewLog({
    required StoreClosingHealthCheck check,
    required String? notes,
    required bool adminOverrideUsed,
    required String? adminOverrideReason,
    required String? adminOverrideReasonCategory,
    required String? adminOverrideNotes,
    required String? secondaryApproverUserId,
    required String? secondaryApproverRole,
    Map<String, dynamic>? varianceDetails,
  }) async {
    final auth = context.read<AuthProvider>();
    final appUser = auth.appUser;
    if (appUser == null) return;
    final storeId = (_sessionData?['store_id'] as String?) ?? appUser.storeId;
    if (storeId.isEmpty) return;

    await _supabase.from('close_review_log').insert({
      'store_id': storeId,
      'session_id': widget.sessionId,
      'reviewer_user_id': appUser.id,
      'reviewer_role': appUser.role,
      'reviewed_at': DateTime.now().toIso8601String(),
      'queue_pending_count': check.queuedPendingCount,
      'failed_count': check.failedNeedingReview,
      'conflict_count': check.conflictsUnacknowledged,
      'last_sync_success_at':
          OfflineTransactionSyncService.instance.telemetry.lastSuccessAt
              ?.toIso8601String(),
      'close_status': check.status.name,
      'acknowledgement_confirmed': true,
      'notes': (notes?.trim().isEmpty ?? true) ? null : notes!.trim(),
      'admin_override': adminOverrideUsed,
      'override_reason': (adminOverrideReason?.trim().isEmpty ?? true)
          ? null
          : adminOverrideReason!.trim(),
      'override_reason_category':
          (adminOverrideReasonCategory?.trim().isEmpty ?? true)
              ? null
              : adminOverrideReasonCategory!.trim(),
      'override_notes': (adminOverrideNotes?.trim().isEmpty ?? true)
          ? null
          : adminOverrideNotes!.trim(),
      'dual_approval_required': check.dualApprovalRequired,
      'secondary_approver_user_id': secondaryApproverUserId,
      'secondary_approver_role': secondaryApproverRole,
      // Variance tracking fields
      'opening_cash': varianceDetails?['opening_cash'] as double? ?? _openingCash,
      'cash_sales': varianceDetails?['cash_sales'] as double? ?? _cashSales,
      'expected_drawer': varianceDetails?['expected_drawer'] as double? ?? _expectedDrawer,
      'actual_cash': varianceDetails?['actual_cash'] as double? ?? 0.0,
      'variance_amount': varianceDetails?['variance'] as double? ?? 0.0,
      'variance_status': varianceDetails?['variance_status'] ?? 'balanced',
      'variance_threshold_exceeded': varianceDetails?['threshold_exceeded'] as bool? ?? false,
      'manager_override_required': varianceDetails?['threshold_exceeded'] as bool? ?? false,
      'manager_override_pin_verified': varianceDetails?['manager_pin_verified'] as bool? ?? false,
      'variance_notes': varianceDetails?['variance_notes'] as String?,
    });
  }

  /// Shows the drawer reconciliation dialog where cashier counts actual cash
  /// and sees variance from expected amount
  Future<Map<String, dynamic>?> _showDrawerReconciliationDialog() async {
    final actualCashController = TextEditingController();
    final notesController = TextEditingController();
    double actualCash = 0.0;
    double variance = 0.0;
    bool thresholdExceeded = false;
    String varianceStatus = 'balanced';
    
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setInnerState) {
            // Calculate variance based on input
            final inputText = actualCashController.text.trim();
            actualCash = double.tryParse(inputText) ?? 0.0;
            variance = actualCash - _expectedDrawer;
            
            if (variance > 0) {
              varianceStatus = 'over';
            } else if (variance < 0) {
              varianceStatus = 'short';
            } else {
              varianceStatus = 'balanced';
            }
            
            thresholdExceeded = variance.abs() > _varianceThreshold;
            
            final bool isBalanced = variance == 0;
            final bool isOver = variance > 0;
            final Color varianceColor = isBalanced 
                ? const Color(0xFF2ECC71) 
                : isOver 
                    ? const Color(0xFF3498DB) 
                    : const Color(0xFFE74C3C);
            
            return AlertDialog(
              backgroundColor: const Color(0xFF161B22),
              title: const Row(
                children: [
                  Icon(Icons.account_balance_wallet, color: Color(0xFFE8B84B)),
                  SizedBox(width: 8),
                  Text('Drawer Reconciliation', style: TextStyle(color: Colors.white)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Summary Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0D1117),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildReconciliationRow('Opening Cash:', _openingCash),
                          const SizedBox(height: 8),
                          _buildReconciliationRow('Cash Sales:', _cashSales),
                          const Divider(color: Colors.white24, height: 16),
                          _buildReconciliationRow('Expected Drawer:', _expectedDrawer, isBold: true),
                        ],
                      ),
                    ),
                    
                    const SizedBox(height: 20),
                    
                    // Actual Cash Input
                    TextField(
                      controller: actualCashController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        labelText: 'Actual Cash Count',
                        labelStyle: const TextStyle(color: Colors.white70),
                        hintText: 'Enter amount from drawer count',
                        hintStyle: const TextStyle(color: Colors.white38),
                        prefixText: '৳ ',
                        prefixStyle: const TextStyle(color: Color(0xFFE8B84B), fontSize: 18, fontWeight: FontWeight.bold),
                        filled: true,
                        fillColor: const Color(0xFF0D1117),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Colors.white24),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Colors.white24),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFFE8B84B), width: 2),
                        ),
                      ),
                      onChanged: (_) => setInnerState(() {}),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Variance Display
                    if (inputText.isNotEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: varianceColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: varianceColor),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  isBalanced 
                                      ? '✓ Drawer Balanced' 
                                      : isOver 
                                          ? '↑ Cash Over' 
                                          : '↓ Cash Short',
                                  style: TextStyle(
                                    color: varianceColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                if (thresholdExceeded)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE74C3C).withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'THRESHOLD EXCEEDED',
                                      style: TextStyle(
                                        color: Color(0xFFE74C3C),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            _buildReconciliationRow(
                              'Variance:', 
                              variance.abs(),
                              valueColor: varianceColor,
                              prefix: isBalanced ? '' : (isOver ? '+' : '-'),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '৳ ${actualCash.toStringAsFixed(2)} (actual) vs ৳ ${_expectedDrawer.toStringAsFixed(2)} (expected)',
                              style: const TextStyle(color: Colors.white54, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      
                      if (thresholdExceeded) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE74C3C).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE74C3C)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.warning_amber, color: Color(0xFFE74C3C), size: 20),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Variance exceeds ৳50 threshold. Manager PIN will be required to proceed.',
                                  style: TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                    
                    const SizedBox(height: 16),
                    
                    // Notes Field
                    TextField(
                      controller: notesController,
                      maxLines: 2,
                      style: const TextStyle(color: Colors.white70),
                      decoration: InputDecoration(
                        labelText: 'Notes (optional)',
                        labelStyle: const TextStyle(color: Colors.white54),
                        hintText: 'Any explanation for the variance...',
                        hintStyle: const TextStyle(color: Colors.white38),
                        filled: true,
                        fillColor: const Color(0xFF0D1117),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Colors.white24),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Colors.white24),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFFE8B84B), width: 2),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, null),
                  child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
                ),
                ElevatedButton(
                  onPressed: actualCash > 0 
                      ? () => Navigator.pop(ctx, {
                          'actual_cash': actualCash,
                          'variance': variance,
                          'variance_status': varianceStatus,
                          'threshold_exceeded': thresholdExceeded,
                          'variance_notes': notesController.text.trim().isEmpty 
                              ? null 
                              : notesController.text.trim(),
                          'manager_pin_verified': false,
                        })
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: thresholdExceeded ? const Color(0xFFE74C3C) : const Color(0xFFE8B84B),
                    disabledBackgroundColor: const Color(0xFF333A44),
                    foregroundColor: thresholdExceeded ? Colors.white : Colors.black,
                  ),
                  child: Text(
                    thresholdExceeded ? 'Proceed with Manager Approval →' : 'Confirm & Close',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
    
    return result;
  }

  Widget _buildReconciliationRow(String label, double value, 
      {bool isBold = false, Color? valueColor, String prefix = ''}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.white70,
            fontSize: isBold ? 15 : 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          '$prefix৳ ${value.toStringAsFixed(2)}',
          style: TextStyle(
            color: valueColor ?? (isBold ? const Color(0xFFE8B84B) : Colors.white),
            fontSize: isBold ? 18 : 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  /// Requests manager override when variance exceeds threshold
  Future<Map<String, dynamic>> _requestManagerOverride(double variance) async {
    final pinController = TextEditingController();
    String? errorMessage;
    bool approved = false;
    String? managerName;
    String? managerRole;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setInnerState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF161B22),
              title: const Row(
                children: [
                  Icon(Icons.security, color: Color(0xFFE74C3C)),
                  SizedBox(width: 8),
                  Text('Manager Override Required', style: TextStyle(color: Colors.white, fontSize: 16)),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE74C3C).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE74C3C)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'High Variance Detected',
                          style: TextStyle(
                            color: Color(0xFFE74C3C),
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Variance: ৳ ${variance.abs().toStringAsFixed(2)}',
                          style: const TextStyle(color: Colors.white, fontSize: 18),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          variance > 0 
                              ? 'Cash drawer has more money than expected'
                              : 'Cash drawer is short',
                          style: const TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Manager PIN Required',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Only admin or owner can approve this variance.',
                    style: TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: pinController,
                    keyboardType: TextInputType.number,
                    obscureText: true,
                    maxLength: 4,
                    style: const TextStyle(color: Colors.white, fontSize: 20, letterSpacing: 8),
                    textAlign: TextAlign.center,
                    decoration: InputDecoration(
                      hintText: '••••',
                      hintStyle: const TextStyle(color: Colors.white38, fontSize: 20, letterSpacing: 8),
                      filled: true,
                      fillColor: const Color(0xFF0D1117),
                      counterText: '',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Colors.white24),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Colors.white24),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFE8B84B), width: 2),
                      ),
                    ),
                  ),
                  if (errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE74C3C).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Color(0xFFE74C3C), size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              errorMessage!,
                              style: const TextStyle(color: Color(0xFFE74C3C), fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    approved = false;
                    Navigator.pop(ctx);
                  },
                  child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
                ),
                ElevatedButton(
                  onPressed: pinController.text.length >= 4 
                      ? () async {
                          // Verify manager PIN
                          final storeId = _sessionData?['store_id'];
                          if (storeId == null) {
                            setInnerState(() => errorMessage = 'Session store not found');
                            return;
                          }
                          
                          try {
                            final manager = await _supabase
                                .from('users')
                                .select('id, full_name, role, pos_pin')
                                .eq('store_id', storeId)
                                .inFilter('role', ['admin', 'owner'])
                                .eq('pos_pin', pinController.text.trim())
                                .maybeSingle();
                            
                            if (manager != null) {
                              approved = true;
                              managerName = manager['full_name'] as String?;
                              managerRole = manager['role'] as String?;
                              if (context.mounted) Navigator.pop(ctx);
                            } else {
                              setInnerState(() => errorMessage = 'Invalid manager PIN. Please try again.');
                            }
                          } catch (e) {
                            setInnerState(() => errorMessage = 'Verification failed. Please try again.');
                          }
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE8B84B),
                    disabledBackgroundColor: const Color(0xFF333A44),
                  ),
                  child: const Text(
                    'Verify & Approve',
                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            );
          },
        );
      },
    );

    return {
      'approved': approved,
      'manager_name': managerName,
      'manager_role': managerRole,
    };
  }

  /// Shows the final variance report after session is closed
  Future<void> _showVarianceReport(Map<String, dynamic> closeData) async {
    final variance = (closeData['variance'] as num?)?.toDouble() ?? 0.0;
    final varianceStatus = closeData['variance_status'] as String? ?? 'balanced';
    final thresholdExceeded = closeData['variance_threshold_exceeded'] as bool? ?? false;
    final actualCash = (closeData['actual_cash'] as num?)?.toDouble() ?? 0.0;
    final expectedDrawer = (closeData['expected_drawer'] as num?)?.toDouble() ?? 0.0;
    final openingCash = (closeData['opening_cash'] as num?)?.toDouble() ?? 0.0;
    final cashSales = (closeData['cash_sales'] as num?)?.toDouble() ?? 0.0;

    final isBalanced = varianceStatus == 'balanced';
    final isOver = varianceStatus == 'over';
    final Color statusColor = isBalanced 
        ? const Color(0xFF2ECC71) 
        : isOver 
            ? const Color(0xFF3498DB) 
            : const Color(0xFFE74C3C);

    await showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF161B22),
          title: Row(
            children: [
              Icon(
                isBalanced ? Icons.check_circle : Icons.receipt_long,
                color: statusColor,
              ),
              const SizedBox(width: 8),
              const Text('Z-Report - Session Closed', style: TextStyle(color: Colors.white)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status Banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor),
                  ),
                  child: Column(
                    children: [
                      Text(
                        isBalanced 
                            ? '✓ Drawer Balanced' 
                            : isOver 
                                ? '↑ Cash Over' 
                                : '↓ Cash Short',
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Variance: ৳ ${variance.abs().toStringAsFixed(2)}',
                        style: const TextStyle(color: Colors.white, fontSize: 16),
                      ),
                      if (thresholdExceeded) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE74C3C).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFE74C3C)),
                          ),
                          child: const Text(
                            'THRESHOLD EXCEEDED',
                            style: TextStyle(
                              color: Color(0xFFE74C3C),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                
                const SizedBox(height: 20),
                
                // Breakdown
                const Text(
                  'Drawer Summary',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D1117),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildReportRow('Opening Cash:', openingCash),
                      const SizedBox(height: 4),
                      _buildReportRow('Cash Sales:', cashSales, isPositive: true),
                      const Divider(color: Colors.white24, height: 16),
                      _buildReportRow('Expected Drawer:', expectedDrawer, isBold: true),
                      const Divider(color: Colors.white24, height: 16),
                      _buildReportRow('Actual Cash:', actualCash),
                      const Divider(color: Colors.white24, height: 16),
                      _buildReportRow(
                        'Variance:', 
                        variance.abs(),
                        valueColor: statusColor,
                        prefix: isBalanced ? '' : (isOver ? '+' : '-'),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Legend
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D1117),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Status Legend:',
                        style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      _buildLegendItem(const Color(0xFF2ECC71), 'Balanced: Variance is 0'),
                      const SizedBox(height: 4),
                      _buildLegendItem(const Color(0xFF3498DB), 'Over: More cash than expected'),
                      const SizedBox(height: 4),
                      _buildLegendItem(const Color(0xFFE74C3C), 'Short: Less cash than expected'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE8B84B),
              ),
              child: const Text(
                'Done',
                style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildReportRow(String label, double value, 
      {bool isBold = false, Color? valueColor, bool isPositive = false, String prefix = ''}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.white70,
            fontSize: 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          '${isPositive ? '+' : ''}$prefix৳ ${value.toStringAsFixed(2)}',
          style: TextStyle(
            color: valueColor ?? (isBold ? const Color(0xFFE8B84B) : Colors.white),
            fontSize: isBold ? 16 : 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildLegendItem(Color color, String text) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(color: Colors.white54, fontSize: 12),
        ),
      ],
    );
  }

  Future<_CloseReviewApproval> _confirmClosingHealthReview() async {
    final sync = OfflineTransactionSyncService.instance;
    final appUser = context.read<AuthProvider>().appUser;
    final role = appUser?.role ?? 'unknown';
    final isAdminOrOwner = role == 'admin' || role == 'owner';
    final primaryUserId = appUser?.id;
    final primaryStoreId = appUser?.storeId;
    final check = const StoreClosingHealthCheckService().evaluate(
      queue: sync.queue,
      telemetry: sync.telemetry,
      hasInventoryMismatchWarnings: false,
    );
    var confirmed = check.status == StoreCloseStatus.green;
    var notes = '';
    String? adminOverrideReasonCategory;
    var adminOverrideNotes = '';
    String? secondaryApproverRole;
    var secondaryApproverPin = '';
    String? secondaryApproverUserId;
    String? secondaryApprovalError;

    final result = await showDialog<bool>(
          context: context,
          builder: (ctx) {
            final statusLabel = check.status.name.toUpperCase();
            final statusColor = switch (check.status) {
              StoreCloseStatus.green => const Color(0xFF2ECC71),
              StoreCloseStatus.yellow => const Color(0xFFE8B84B),
              StoreCloseStatus.red => const Color(0xFFE74C3C),
            };
            return StatefulBuilder(
              builder: (context, setInnerState) {
                return AlertDialog(
                  backgroundColor: const Color(0xFF161B22),
                  title: const Text(
                    'Closing Health Review',
                    style: TextStyle(color: Colors.white),
                  ),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Close status: $statusLabel',
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Pending queue: ${check.queuedPendingCount}',
                        style: const TextStyle(color: Colors.white70),
                      ),
                      Text(
                        'Unreviewed failed: ${check.failedNeedingReview}',
                        style: const TextStyle(color: Colors.white70),
                      ),
                      Text(
                        'Unacknowledged conflicts: ${check.conflictsUnacknowledged}',
                        style: const TextStyle(color: Colors.white70),
                      ),
                      Text(
                        'Recent sync success: ${check.lastSyncIsRecent ? 'Yes' : 'No'}',
                        style: const TextStyle(color: Colors.white70),
                      ),
                      if (check.hardStop) ...[
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE74C3C).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE74C3C)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Hard-stop active',
                                style: TextStyle(
                                  color: Color(0xFFE74C3C),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (check.pendingQueueHardStop)
                                const Text(
                                  '• Pending queue exceeds 50',
                                  style: TextStyle(color: Colors.white70),
                                ),
                              if (check.staleSyncHardStop)
                                const Text(
                                  '• No sync success in last 12 hours',
                                  style: TextStyle(color: Colors.white70),
                                ),
                              if (check.criticalConflictHardStop)
                                const Text(
                                  '• Critical conflict unresolved',
                                  style: TextStyle(color: Colors.white70),
                                ),
                              if (check.dualApprovalRequired)
                                const Text(
                                  '• Escalated hard-stop: two approvals required',
                                  style: TextStyle(color: Colors.white70),
                                ),
                              const SizedBox(height: 4),
                              Text(
                                isAdminOrOwner
                                    ? 'Admin override requires category. Notes are optional.'
                                    : 'Only admin can override this close.',
                                style: const TextStyle(color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      CheckboxListTile(
                        value: confirmed,
                        onChanged: (value) {
                          setInnerState(() => confirmed = value ?? false);
                        },
                        activeColor: const Color(0xFFE8B84B),
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        title: const Text(
                          'I reviewed operational sync health and accept close decision.',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ),
                      if (check.hardStop && isAdminOrOwner) ...[
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: adminOverrideReasonCategory,
                          dropdownColor: const Color(0xFF161B22),
                          decoration: InputDecoration(
                            hintText: 'Select override category (required)',
                            hintStyle: const TextStyle(color: Colors.white38),
                            filled: true,
                            fillColor: const Color(0xFF0D1117),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide:
                                  const BorderSide(color: Colors.white12, width: 1),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide:
                                  const BorderSide(color: Colors.white12, width: 1),
                            ),
                          ),
                          items: _overrideReasonCategories
                              .map(
                                (category) => DropdownMenuItem<String>(
                                  value: category,
                                  child: Text(
                                    category,
                                    style: const TextStyle(color: Colors.white),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (value) => setInnerState(
                            () => adminOverrideReasonCategory = value,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          maxLines: 2,
                          onChanged: (value) => adminOverrideNotes = value,
                          style: const TextStyle(color: Colors.white70),
                          decoration: InputDecoration(
                            hintText: 'Override notes (optional)',
                            hintStyle: const TextStyle(color: Colors.white38),
                            filled: true,
                            fillColor: const Color(0xFF0D1117),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide:
                                  const BorderSide(color: Colors.white12, width: 1),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide:
                                  const BorderSide(color: Colors.white12, width: 1),
                            ),
                          ),
                        ),
                        if (check.dualApprovalRequired) ...[
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            value: secondaryApproverRole,
                            dropdownColor: const Color(0xFF161B22),
                            decoration: InputDecoration(
                              hintText: 'Second approver role (required)',
                              hintStyle: const TextStyle(color: Colors.white38),
                              filled: true,
                              fillColor: const Color(0xFF0D1117),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide:
                                    const BorderSide(color: Colors.white12, width: 1),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide:
                                    const BorderSide(color: Colors.white12, width: 1),
                              ),
                            ),
                            items: const [
                              DropdownMenuItem<String>(
                                value: 'admin',
                                child: Text(
                                  'admin',
                                  style: TextStyle(color: Colors.white),
                                ),
                              ),
                              DropdownMenuItem<String>(
                                value: 'owner',
                                child: Text(
                                  'owner',
                                  style: TextStyle(color: Colors.white),
                                ),
                              ),
                            ],
                            onChanged: (value) => setInnerState(
                              () => secondaryApproverRole = value,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            onChanged: (value) => secondaryApproverPin = value,
                            style: const TextStyle(color: Colors.white70),
                            obscureText: true,
                            decoration: InputDecoration(
                              hintText: 'Second approver PIN (required)',
                              hintStyle: const TextStyle(color: Colors.white38),
                              filled: true,
                              fillColor: const Color(0xFF0D1117),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide:
                                    const BorderSide(color: Colors.white12, width: 1),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide:
                                    const BorderSide(color: Colors.white12, width: 1),
                              ),
                            ),
                          ),
                          if ((secondaryApprovalError ?? '').isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                secondaryApprovalError!,
                                style: const TextStyle(
                                  color: Colors.redAccent,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                        ],
                      ],
                      const SizedBox(height: 8),
                      TextField(
                        maxLines: 3,
                        onChanged: (value) => notes = value,
                        style: const TextStyle(color: Colors.white70),
                        decoration: InputDecoration(
                          hintText: 'Optional review notes',
                          hintStyle: const TextStyle(color: Colors.white38),
                          filled: true,
                          fillColor: const Color(0xFF0D1117),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide:
                                const BorderSide(color: Colors.white12, width: 1),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide:
                                const BorderSide(color: Colors.white12, width: 1),
                          ),
                        ),
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(color: Colors.white54),
                      ),
                    ),
                    ElevatedButton(
                      onPressed: confirmed &&
                              (!check.hardStop ||
                                  (isAdminOrOwner &&
                                      adminOverrideReasonCategory != null))
                          ? () async {
                              if (check.dualApprovalRequired) {
                                if (!isAdminOrOwner ||
                                    secondaryApproverRole == null ||
                                    secondaryApproverPin.trim().isEmpty ||
                                    primaryStoreId == null ||
                                    primaryUserId == null) {
                                  setInnerState(() {
                                    secondaryApprovalError =
                                        'Second approver role + PIN are required.';
                                  });
                                  return;
                                }
                                final validCombination =
                                    (role == 'admin' &&
                                            (secondaryApproverRole == 'admin' ||
                                                secondaryApproverRole == 'owner')) ||
                                        (role == 'owner' &&
                                            secondaryApproverRole == 'admin');
                                if (!validCombination) {
                                  setInnerState(() {
                                    secondaryApprovalError =
                                        'Allowed combinations: admin+owner or admin+admin.';
                                  });
                                  return;
                                }
                                final secondaryId = await _resolveSecondaryApproverId(
                                  requiredRole: secondaryApproverRole!,
                                  pin: secondaryApproverPin.trim(),
                                  storeId: primaryStoreId,
                                  excludeUserId: primaryUserId,
                                );
                                if (secondaryId == null) {
                                  setInnerState(() {
                                    secondaryApprovalError =
                                        'Second approver verification failed.';
                                  });
                                  return;
                                }
                                secondaryApproverUserId = secondaryId;
                              }
                              if (context.mounted) Navigator.pop(ctx, true);
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE8B84B),
                        disabledBackgroundColor: const Color(0xFF333A44),
                      ),
                      child: const Text(
                        'Continue to Close',
                        style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                );
              },
            );
          },
        ) ??
        false;
    return _CloseReviewApproval(
      confirmed: result,
      check: check,
      notes: notes,
      adminOverrideUsed: check.hardStop && isAdminOrOwner && result,
      adminOverrideReason: check.hardStop ? adminOverrideReasonCategory : null,
      adminOverrideReasonCategory:
          check.hardStop ? adminOverrideReasonCategory : null,
      adminOverrideNotes: check.hardStop ? adminOverrideNotes : null,
      secondaryApproverUserId:
          check.dualApprovalRequired ? secondaryApproverUserId : null,
      secondaryApproverRole:
          check.dualApprovalRequired ? secondaryApproverRole : null,
    );
  }

  Future<String?> _resolveSecondaryApproverId({
    required String requiredRole,
    required String pin,
    required String storeId,
    required String excludeUserId,
  }) async {
    try {
      final row = await _supabase
          .from('users')
          .select('id')
          .eq('store_id', storeId)
          .eq('role', requiredRole)
          .eq('pos_pin', pin)
          .neq('id', excludeUserId)
          .maybeSingle();
      if (row == null) return null;
      return row['id'] as String?;
    } catch (_) {
      return null;
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
