import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../core/theme/app_button_styles.dart';

class GamifiedRewardScreen extends StatefulWidget {
  const GamifiedRewardScreen({super.key});

  @override
  State<GamifiedRewardScreen> createState() => _GamifiedRewardScreenState();
}

class _GamifiedRewardScreenState extends State<GamifiedRewardScreen> with SingleTickerProviderStateMixin {
  bool _isScratched = false;
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: AppMotion.durationSlow,
    );
    _scaleAnimation = CurvedAnimation(parent: _controller, curve: AppMotion.easeDecelerate);
  }

  void _revealReward() {
    setState(() {
      _isScratched = true;
    });
    HapticFeedback.heavyImpact();
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(
        title: const Text('Order Confirmed! 🎉'),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Scratch the card to reveal your Lucky Coins!',
              style: AppTextStyles.headingMd.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: 32),
            GestureDetector(
              onTap: _isScratched ? null : _revealReward,
              child: Container(
                width: 250,
                height: 250,
                decoration: _isScratched 
                  ? BoxDecoration(
                      color: AppColors.surfaceDefault,
                      borderRadius: AppRadius.borderMd,
                      boxShadow: AppShadows.elevation1,
                      border: Border.all(color: AppColors.borderDefault),
                    )
                  : BoxDecoration(
                      color: AppColors.primaryDefault,
                      borderRadius: AppRadius.borderMd,
                      boxShadow: [
                        BoxShadow(color: AppColors.primaryDefault.withValues(alpha: 0.5), blurRadius: 20, spreadRadius: 5),
                      ],
                    ),
                child: _isScratched
                  ? ScaleTransition(
                      scale: _scaleAnimation,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.monetization_on, color: Colors.amber, size: 64),
                          const SizedBox(height: AppSpacing.space4),
                          const Text(
                            '+50',
                            style: TextStyle(color: Colors.amber, fontSize: 48, fontWeight: FontWeight.w900),
                          ),
                          Text(
                            'Lucky Coins added to Wallet',
                            style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    )
                  : const Center(
                      child: Text(
                        'Tap to Scratch',
                        style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                    ),
              ),
            ),
            const SizedBox(height: 48),
            if (_isScratched)
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                style: AppButtonStyles.primary,
                child: Text('Back to Home', style: AppTextStyles.labelLg.copyWith(color: AppColors.primaryOn)),
              )
          ],
        ),
      ),
    );
  }
}
