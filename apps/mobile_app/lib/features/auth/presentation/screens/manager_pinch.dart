/// PIN (Manager) authentication flow for voids, refunds, and high-value adjustments.
/// Requires manager-level PIN override for sensitive POS operations.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../shared/providers/pos_provider.dart';

/// PIN entry dialog for manager authentication
class ManagerPinDialog extends StatefulWidget {
  final VoidCallback? onSuccess;
  final String reason;

  const ManagerPinDialog({
    super.key,
    this.onSuccess,
    required this.reason,
  });

  @override
  State<ManagerPinDialog> createState() => _ManagerPinDialogState();
}

class _ManagerPinDialogState extends State<ManagerPinDialog> {
  String _pin = '';
  final List<TextEditingController> _pinControllers = List.generate(4, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(4, (_) => FocusNode());

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    for (var c in _pinControllers) c.dispose();
    for (var f in _focusNodes) f.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Manager Authentication'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Reason: ${widget.reason}'),
          const SizedBox(height: 16),
          _buildPinEntry(),
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _submitPin,
          child: _isLoading ? const CircularProgressIndicator() : const Text('Submit'),
        ),
      ],
    );
  }

  Widget _buildPinEntry() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(4, (index) {
        return SizedBox(
          width: 50,
          child: TextField(
            controller: _pinControllers[index],
            focusNode: _focusNodes[index],
            textAlign: TextAlign.center,
            maxLength: 1,
            keyboardType: TextInputType.number,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            decoration: const InputDecoration(
              counterText: '',
              border: OutlineInputBorder(),
            ),
            onChanged: (value) {
              setState(() {
                _pin = _pinControllers.map((c) => c.text).join();
              });
              
              // Move to next field
              if (value.isNotEmpty && index < 3) {
                _focusNodes[index + 1].requestFocus();
              }
              
              // Auto-submit if 4 digits entered
              if (_pin.length == 4) {
                _submitPin();
              }
            },
          ),
        );
      }),
    );
  }

  Future<void> _submitPin() async {
    if (_pin.length != 4) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authProvider = context.read<AuthProvider>();
      final result = await authProvider.verifyManagerPin(_pin);

      if (result) {
        _showSuccess();
      } else {
        setState(() {
          _errorMessage = 'Invalid PIN';
          _clearPin();
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Authentication failed';
        _clearPin();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _clearPin() {
    for (var i = 0; i < 4; i++) {
      _pinControllers[i].clear();
      _focusNodes[i].requestFocus();
    }
  }

  void _showSuccess() {
    Navigator.pop(context);
    
    if (widget.onSuccess != null) {
      widget.onSuccess!();
    } else {
      Navigator.of(context).pop(true);
    }
  }
}

/// Security layer for manager operations
class ManagerSecurityLayer {
  static Future<bool> requireManagerAuth(
    BuildContext context, {
    required String reason,
    required Future<void> Function() onAuthSuccess,
  }) async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => ManagerPinDialog(
          reason: reason,
          onSuccess: () {
            Navigator.pop(context, true);
          },
        ),
      ),
    );

    if (result == true) {
      await onAuthSuccess();
      return true;
    }
    return false;
  }

  static Future<void> processVoid(
    BuildContext context,
    String saleId,
  ) async {
    await requireManagerAuth(
      context,
      reason: 'Void sale: $saleId',
      onAuthSuccess: () async {
        final posProvider = context.read<PosProvider>();
        await posProvider.voidSale(saleId, 'Manager override: $saleId');
      },
    );
  }

  static Future<void> processRefund(
    BuildContext context,
    String saleId,
    double amount,
  ) async {
    // Only require manager auth for high-value refunds (e.g., > $100)
    if (amount <= 100.0) return;

    await requireManagerAuth(
      context,
      reason: 'High-value refund: \$$amount',
      onAuthSuccess: () async {
        final posProvider = context.read<PosProvider>();
        await posProvider.processRefund(saleId, amount);
      },
    );
  }

  static Future<void> processStockAdjustment(
    BuildContext context,
    String itemId,
    int delta,
  ) async {
    await requireManagerAuth(
      context,
      reason: 'Stock adjustment: $itemId (delta: $delta)',
      onAuthSuccess: () async {
        final posProvider = context.read<PosProvider>();
        await posProvider.adjustStock(itemId, delta);
      },
    );
  }
}

/// Widget for PIN-based authorization button
class PinAuthorizeButton extends StatelessWidget {
  final String reason;
  final VoidCallback onAuthorized;

  const PinAuthorizeButton({
    super.key,
    required this.reason,
    required this.onAuthorized,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () async {
        final authProvider = context.read<AuthProvider>();
        
          final role = authProvider.appUser?.role;
          if (role == 'manager' || role == 'admin') {
            // Allow managers to proceed directly
            onAuthorized();
          } else {
            // Require PIN for others
            await ManagerSecurityLayer.requireManagerAuth(
              context,
              reason: reason,
              onAuthSuccess: () async {
                onAuthorized();
              },
            );
          }
      },
      child: const Text('Authorize'),
    );
  }
}
