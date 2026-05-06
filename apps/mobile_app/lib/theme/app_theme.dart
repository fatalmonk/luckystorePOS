import 'package:flutter/material.dart';

class AppTheme {
  // Dark mode primary background
  static const Color background = Color(0xFF1C1D21);
  static const Color backgroundElevated = Color(0xFF26282E); // Slightly lighter for neomorphic depth

  // Luminous accent – updated to match web palette
  // Primary – Yellow
  static const Color primaryAccent = Color(0xFFFBBF24); // Yellow 400
  // Light variant for primary (yellow)
  static const Color primaryAccentLight = Color(0xFFFDE68A); // Yellow 300
  // Secondary – Black
  static const Color secondaryAccent = Color(0xFF000000);
  // Tertiary – Emerald Green
  static const Color tertiaryAccent = Color(0xFF10B981);
  // Light variant for tertiary (optional)
  static const Color tertiaryAccentLight = Color(0xFFD1FAE5);

  // Typography Colors
  static const Color textPrimary = Color(0xFFF3F3F3);
  static const Color textSecondary = Color(0xFFA0A0A5);

  static const Color errorAccent = Color(0xFFFF4B4B);

  // Soft UI / Neomorphic Light & Dark shadow colors
  static const Color shadowLight = Color(0xFF2A2B31);
  static const Color shadowDark = Color(0xFF0E0E11);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primaryAccent,
      colorScheme: const ColorScheme.dark(
        primary: primaryAccent,          // Yellow primary
        secondary: secondaryAccent,       // Black secondary
        surface: background,
        onPrimary: Colors.white,
        onSurface: textPrimary,
        error: errorAccent,
      ),
      fontFamily: 'Inter', // Assuming Inter for that sans-serif aesthetic, needs to be in pubspec later if using google_fonts
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: backgroundElevated,
        selectedItemColor: primaryAccent,
        unselectedItemColor: textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 10,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(color: textPrimary, fontSize: 32, fontWeight: FontWeight.bold),
        headlineMedium: TextStyle(color: textPrimary, fontSize: 24, fontWeight: FontWeight.bold),
        bodyLarge: TextStyle(color: textPrimary, fontSize: 16),
        bodyMedium: TextStyle(color: textSecondary, fontSize: 14),
        labelLarge: TextStyle(color: textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
      ),
    );
  }

  /// Reusable strict Neomorphic Container decoration method
  static BoxDecoration get neomorphicDecoration {
    return BoxDecoration(
      color: backgroundElevated,
      borderRadius: BorderRadius.circular(16),
      boxShadow: const [
        BoxShadow(
          color: shadowDark,
          offset: Offset(4, 4),
          blurRadius: 10,
          spreadRadius: 1,
        ),
        BoxShadow(
          color: shadowLight,
          offset: Offset(-4, -4),
          blurRadius: 10,
          spreadRadius: 1,
        ),
      ],
    );
  }
}
