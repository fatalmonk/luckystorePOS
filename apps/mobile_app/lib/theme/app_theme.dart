import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_text_styles.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.backgroundDefault,
      primaryColor: AppColors.primaryDefault,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primaryDefault,
        secondary: AppColors.secondaryDefault,
        surface: AppColors.surfaceDefault,
        onPrimary: AppColors.primaryOn,
        onSurface: AppColors.textPrimary,
        error: AppColors.dangerDefault,
      ),
      fontFamily: AppTextStyles.fontFamilyPrimary,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.backgroundDefault,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
        titleTextStyle: AppTextStyles.headingLg,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surfaceRaised,
        selectedItemColor: AppColors.primaryDefault,
        unselectedItemColor: AppColors.textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      textTheme: const TextTheme(
        displayLarge: AppTextStyles.display,
        headlineLarge: AppTextStyles.headingXl,
        headlineMedium: AppTextStyles.headingLg,
        headlineSmall: AppTextStyles.headingMd,
        bodyLarge: AppTextStyles.bodyLg,
        bodyMedium: AppTextStyles.bodyMd,
        bodySmall: AppTextStyles.bodySm,
        labelLarge: AppTextStyles.labelLg,
        labelMedium: AppTextStyles.labelMd,
        labelSmall: AppTextStyles.labelSm,
      ),
    );
  }

  // Legacy dark theme fallback
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF1C1D21),
      primaryColor: AppColors.primaryDefault,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primaryDefault,
        secondary: AppColors.secondaryDefault,
        surface: Color(0xFF26282E),
        onPrimary: Colors.white,
        onSurface: Colors.white,
        error: AppColors.dangerDefault,
      ),
      fontFamily: AppTextStyles.fontFamilyPrimary,
    );
  }
}
