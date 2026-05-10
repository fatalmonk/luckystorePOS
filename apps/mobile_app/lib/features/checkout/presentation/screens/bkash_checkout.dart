import 'package:flutter/material.dart';
import '../../../../theme/app_theme.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../features/checkout/data/bkash_service.dart';

/// Opens the bKash PIN entry page via an in-app WebView wrapper.
/// For a real implementation, add `webview_flutter` to pubspec.yaml.
/// This screen handles the final redirect after Create Payment returns bkashURL.
class BkashCheckoutScreen extends StatefulWidget {
  final String bkashUrl;
  final String paymentId;
  final double amount;

  const BkashCheckoutScreen({
    super.key,
    required this.bkashUrl,
    required this.paymentId,
    required this.amount,
  });

  @override
  State<BkashCheckoutScreen> createState() => _BkashCheckoutScreenState();
}

class _BkashCheckoutScreenState extends State<BkashCheckoutScreen> {
  bool _isExecuting = false;
  String _statusMessage = 'Enter your bKash PIN to authorize payment';

  /// In production, this is triggered by a deep-link callback from the bkashURL WebView.
  /// The bKash gateway redirects to your callbackURL with ?paymentID=xxx&status=success.
  /// Your backend should then call /execute and notify the app via a WebSocket or polling.
  Future<void> _onPaymentCallback() async {
    setState(() {
      _isExecuting = true;
      _statusMessage = 'Verifying payment...';
    });

    final service = BkashService();
    final idToken = await service.grantToken();
    if (idToken == null) {
      setState(() => _statusMessage = 'Token error. Please try again.');
      return;
    }

    final success = await service.executePayment(idToken, widget.paymentId);

    if (!mounted) return;
    if (success) {
      Navigator.of(context).pushReplacementNamed('/order-confirmed');
    } else {
      setState(() {
        _isExecuting = false;
        _statusMessage = 'Payment failed. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('bKash Payment'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // bKash logo placeholder
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFE2136E), // bKash brand pink
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Center(
                child: Text(
                  'bKash',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),

            Text(
              'Amount: ৳${widget.amount.toStringAsFixed(2)}',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),

            Text(
              _statusMessage,
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),

            // NOTE: In production, replace the button below with a real WebView
            // loading widget.bkashUrl. The WebView's navigationDelegate intercepts
            // the callbackURL redirect and triggers _onPaymentCallback().
            Container(
              padding: const EdgeInsets.all(20),
              decoration: AppTheme.neomorphicDecoration,
              child: Column(
                children: [
                  Icon(Icons.pin_outlined, color: AppTheme.primaryAccentLight, size: 48),
                  Icon(Icons.pin_outlined, color: AppTheme.secondaryAccent, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    'WebView: bKash PIN Entry',
                    style: TextStyle(color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.bkashUrl,
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 10),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 2,
                  ),
                  const SizedBox(height: 20),
                  // Simulates "payment success" callback from WebView redirect
                  if (!_isExecuting)
                    ElevatedButton(
                      onPressed: _onPaymentCallback,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE2136E),
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Simulate PIN Confirm', style: TextStyle(color: Colors.white)),
                    )
                  else
                    CircularProgressIndicator(color: AppColors.primaryDefault),
                ],
              ),
            ),

            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_outline, color: AppTheme.textSecondary, size: 14),
                const SizedBox(width: 6),
                Text(
                  'Secured by bKash Tokenized Checkout',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
