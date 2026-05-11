import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';
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
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(
        title: const Text('bKash Payment'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Padding(
        padding: AppSpacing.insetLg,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // bKash logo placeholder
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFE2136E), // bKash brand pink
                borderRadius: AppRadius.borderMd,
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
            const SizedBox(height: AppSpacing.space8),

            Text(
              'Amount: ৳${widget.amount.toStringAsFixed(2)}',
              style: AppTextStyles.headingXl.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: AppSpacing.space2),

            Text(
              _statusMessage,
              style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.space12),

            Container(
              padding: AppSpacing.insetLg,
              decoration: BoxDecoration(
                color: AppColors.surfaceDefault,
                borderRadius: AppRadius.borderMd,
                boxShadow: AppShadows.elevation1,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: Column(
                children: [
                  const Icon(Icons.pin_outlined, color: AppColors.primarySubtle, size: 48),
                  const SizedBox(height: AppSpacing.space3),
                  Text(
                    'WebView: bKash PIN Entry',
                    style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: AppSpacing.space1),
                  Text(
                    widget.bkashUrl,
                    style: AppTextStyles.bodyXs.copyWith(color: AppColors.textSecondary),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 2,
                  ),
                  const SizedBox(height: AppSpacing.space5),
                  // Simulates "payment success" callback from WebView redirect
                  if (!_isExecuting)
                    ElevatedButton(
                      onPressed: _onPaymentCallback,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE2136E),
                        padding: AppSpacing.insetSquishMd,
                        shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
                      ),
                      child: const Text('Simulate PIN Confirm', style: TextStyle(color: Colors.white)),
                    )
                  else
                    const CircularProgressIndicator(color: AppColors.primaryDefault),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.space8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock_outline, color: AppColors.textSecondary, size: 14),
                const SizedBox(width: AppSpacing.space2),
                Text(
                  'Secured by bKash Tokenized Checkout',
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
