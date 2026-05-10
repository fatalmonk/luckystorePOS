import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../theme/app_theme.dart';
import '../../../../core/theme/app_motion.dart';

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
      backgroundColor: AppTheme.background,
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
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 16),
            ),
            const SizedBox(height: 32),
            GestureDetector(
              onTap: _isScratched ? null : _revealReward,
              child: Container(
                width: 250,
                height: 250,
                decoration: _isScratched 
                  ? AppTheme.neomorphicDecoration
                  : BoxDecoration(
                      color: AppTheme.primaryAccent,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: AppTheme.primaryAccent.withValues(alpha: 0.5), blurRadius: 20, spreadRadius: 5),
                      ],
                    ),
                child: _isScratched
                  ? ScaleTransition(
                      scale: _scaleAnimation,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.monetization_on, color: Colors.amber, size: 64),
                          SizedBox(height: 16),
                          Text(
                            '+50',
                            style: TextStyle(color: Colors.amber, fontSize: 48, fontWeight: FontWeight.w900),
                          ),
                          Text(
                            'Lucky Coins added to Wallet',
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
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
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryAccent,
                  padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                child: const Text('Back to Home', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              )
          ],
        ),
      ),
    );
  }
}
