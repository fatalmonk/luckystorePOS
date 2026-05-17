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
    final approval = await _confirmClosingHealthReview();
    if (!approval.confirmed || !mounted) return;

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

    if (confirmed == true && mounted) {
      setState(() => _loading = true);
      try {
        try {
          await _writeCloseReviewLog(
            check: approval.check,
            notes: approval.notes,
            adminOverrideUsed: approval.adminOverrideUsed,
            adminOverrideReason: approval.adminOverrideReason,
            adminOverrideReasonCategory: approval.adminOverrideReasonCategory,
            adminOverrideNotes: approval.adminOverrideNotes,
            secondaryApproverUserId: approval.secondaryApproverUserId,
            secondaryApproverRole: approval.secondaryApproverRole,
          );
        } catch (_) {
          // Do not block physical close if review row already exists.
        }
        // Backend validated checkout
        if (!mounted) return;
        final posProvider = context.read<PosProvider>();
        // Assuming we look up the cash account for the store
        final cashAccountRow = await _supabase.from('accounts')
            .select('id')
            .eq('tenant_id', _supabase.auth.currentUser?.userMetadata?['tenant_id'])
            .eq('name', 'Cash in Hand')
            .limit(1)
            .single();
            
        final result = await posProvider.recordCashClosing(
          actualCash: closingCash,
          accountId: cashAccountRow['id'] as String,
        );

        if (result['status'] == 'success') {
          // If variance is too high, we might show a warning, but for now we just close.
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

  Future<void> _writeCloseReviewLog({
    required StoreClosingHealthCheck check,
    required String? notes,
    required bool adminOverrideUsed,
    required String? adminOverrideReason,
    required String? adminOverrideReasonCategory,
    required String? adminOverrideNotes,
    required String? secondaryApproverUserId,
    required String? secondaryApproverRole,
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
    });
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
