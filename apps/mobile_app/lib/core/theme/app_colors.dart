import 'package:flutter/material.dart';

/// Lucky Store Design Token Dictionary - Canonical Colors
/// Version: 1.0.0
class AppColors {
  // 1.1 Primitives (Raw Hex Scale)
  static const Color primitiveIndigo50 = Color(0xFFEEF2FF);
  static const Color primitiveIndigo100 = Color(0xFFE0E7FF);
  static const Color primitiveIndigo500 = Color(0xFF4F46E5);
  static const Color primitiveIndigo600 = Color(0xFF4338CA);
  static const Color primitiveIndigo700 = Color(0xFF3730A3);

  static const Color primitiveGreen50 = Color(0xFFF0FDF4);
  static const Color primitiveGreen500 = Color(0xFF22C55E);
  static const Color primitiveGreen700 = Color(0xFF15803D);

  static const Color primitiveRed50 = Color(0xFFFFF1F2);
  static const Color primitiveRed500 = Color(0xFFEF4444);
  static const Color primitiveRed700 = Color(0xFFB91C1C);

  static const Color primitiveAmber50 = Color(0xFFFFFBEB);
  static const Color primitiveAmber400 = Color(0xFFFBBF24);
  static const Color primitiveAmber600 = Color(0xFFD97706);

  static const Color primitiveNeutral0 = Color(0xFFFFFFFF);
  static const Color primitiveNeutral50 = Color(0xFFF8FAFC);
  static const Color primitiveNeutral100 = Color(0xFFF1F5F9);
  static const Color primitiveNeutral200 = Color(0xFFE2E8F0);
  static const Color primitiveNeutral400 = Color(0xFF94A3B8);
  static const Color primitiveNeutral600 = Color(0xFF475569);
  static const Color primitiveNeutral800 = Color(0xFF1E293B);
  static const Color primitiveNeutral900 = Color(0xFF0F172A);

  // 1.2 Semantic Tokens (Light Mode Default)
  
  // Background
  static const Color backgroundDefault = Color(0xFFF8FAFC);
  static const Color backgroundSubtle = Color(0xFFF1F5F9);

  // Surface
  static const Color surfaceDefault = Color(0xFFFFFFFF);
  static const Color surfaceRaised = Color(0xFFFFFFFF);
  static const Color surfaceOverlay = Color(0x730F172A); // rgba(15,23,42,0.45) -> 45% = ~73

  // Primary (Indigo-Blue)
  static const Color primaryDefault = Color(0xFF4F46E5);
  static const Color primaryHover = Color(0xFF4338CA);
  static const Color primaryPressed = Color(0xFF3730A3);
  static const Color primarySubtle = Color(0xFFEEF2FF);
  static const Color primaryOn = Color(0xFFFFFFFF);

  // Secondary (Teal-Green)
  static const Color secondaryDefault = Color(0xFF0D9488);
  static const Color secondaryHover = Color(0xFF0F766E);
  static const Color secondarySubtle = Color(0xFFF0FDFA);
  static const Color secondaryOn = Color(0xFFFFFFFF);

  // Semantic - Success
  static const Color successDefault = Color(0xFF22C55E);
  static const Color successDark = Color(0xFF15803D);
  static const Color successSubtle = Color(0xFFF0FDF4);
  static const Color successOn = Color(0xFFFFFFFF);

  // Semantic - Danger
  static const Color dangerDefault = Color(0xFFEF4444);
  static const Color dangerDark = Color(0xFFB91C1C);
  static const Color dangerSubtle = Color(0xFFFFF1F2);
  static const Color dangerOn = Color(0xFFFFFFFF);

  // Semantic - Warning
  static const Color warningDefault = Color(0xFFFBBF24);
  static const Color warningDark = Color(0xFFD97706);
  static const Color warningSubtle = Color(0xFFFFFBEB);
  static const Color warningOn = Color(0xFF1E293B);

  // Borders
  static const Color borderDefault = Color(0xFFE2E8F0);
  static const Color borderStrong = Color(0xFF94A3B8);

  // Text
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textInverse = Color(0xFFFFFFFF);
  static const Color textLink = Color(0xFF4F46E5);
}
