import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class LuckyStoreLogo extends StatelessWidget {
  final double fontSize;
  final bool isDark;

  const LuckyStoreLogo({
    super.key,
    this.fontSize = 22,
    this.isDark = false,
  });

  @override
  Widget build(BuildContext context) {
    final textColor = isDark ? AppColors.primitiveNeutral0 : AppColors.textPrimary;
    final subtitleColor = isDark ? AppColors.primitiveNeutral400 : AppColors.textSecondary;

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text(
          'LUCKY STORE',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: fontSize,
            letterSpacing: -1.0,
            color: textColor,
            height: 1.0,
          ),
        ),
        const SizedBox(width: 4),
        Container(
          width: fontSize * 0.22,
          height: fontSize * 0.22,
          decoration: const BoxDecoration(
            color: Color(0xFFF5C518), // Canonical Brand Yellow
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          '1947',
          style: TextStyle(
            fontFamily: 'Courier', // Monospace font
            fontWeight: FontWeight.w500,
            fontSize: fontSize * 0.55,
            color: subtitleColor,
            height: 1.0,
          ),
        ),
      ],
    );
  }
}
