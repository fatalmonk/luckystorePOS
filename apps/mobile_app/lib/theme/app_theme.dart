import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';
import '../core/theme/app_radius.dart';

class AppTheme {
  // --- Design System Theme Definitions ---

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.backgroundDefault,
      primaryColor: AppColors.primaryDefault,
      colorScheme: ColorScheme.light(
        primary: AppColors.primaryDefault,
        secondary: AppColors.secondaryDefault,
        surface: AppColors.surfaceDefault,
        onPrimary: AppColors.primaryOn,
        onSurface: AppColors.textPrimary,
        error: AppColors.dangerDefault,
      ),
      fontFamily: AppTextStyles.fontFamilyPrimary,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.backgroundDefault,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
        titleTextStyle: AppTextStyles.headingLg,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.surfaceRaised,
        selectedItemColor: AppColors.primaryDefault,
        unselectedItemColor: AppColors.textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      textTheme: TextTheme(
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

  static ThemeData get darkTheme {
    const darkBackground = Color(0xFF0F172A);   // neutral.900
    const darkSurface = Color(0xFF1E293B);      // neutral.800
    const darkSurfaceRaised = Color(0xFF334155); // neutral.700

    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBackground,
      primaryColor: AppColors.primaryDefault,
      colorScheme: ColorScheme.dark(
        primary: AppColors.primaryDefault,
        secondary: AppColors.secondaryDefault,
        surface: darkSurface,
        onPrimary: AppColors.primaryOn,
        onSurface: AppColors.primitiveNeutral50,
        error: AppColors.dangerDefault,
      ),
      fontFamily: AppTextStyles.fontFamilyPrimary,
      appBarTheme: AppBarTheme(
        backgroundColor: darkSurface,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: AppColors.primitiveNeutral50),
        titleTextStyle: AppTextStyles.headingLg.copyWith(color: AppColors.primitiveNeutral50),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: darkSurface,
        selectedItemColor: AppColors.primaryDefault,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      dividerColor: AppColors.primitiveNeutral800,
      textTheme: TextTheme(
        displayLarge: AppTextStyles.display.copyWith(color: AppColors.primitiveNeutral50),
        headlineLarge: AppTextStyles.headingXl.copyWith(color: AppColors.primitiveNeutral50),
        headlineMedium: AppTextStyles.headingLg.copyWith(color: AppColors.primitiveNeutral50),
        headlineSmall: AppTextStyles.headingMd.copyWith(color: AppColors.primitiveNeutral50),
        bodyLarge: AppTextStyles.bodyLg.copyWith(color: AppColors.primitiveNeutral100),
        bodyMedium: AppTextStyles.bodyMd.copyWith(color: AppColors.primitiveNeutral100),
        bodySmall: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400),
        labelLarge: AppTextStyles.labelLg.copyWith(color: AppColors.primitiveNeutral50),
        labelMedium: AppTextStyles.labelMd.copyWith(color: AppColors.primitiveNeutral50),
        labelSmall: AppTextStyles.labelSm.copyWith(color: AppColors.primitiveNeutral400),
      ),
      cardColor: darkSurface,
      popupMenuTheme: PopupMenuThemeData(color: darkSurfaceRaised),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkSurface,
        labelStyle: TextStyle(color: AppColors.primitiveNeutral400),
        hintStyle: TextStyle(color: AppColors.primitiveNeutral400),
        border: OutlineInputBorder(
          borderRadius: AppRadius.borderSm,
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderSm,
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderSm,
          borderSide: const BorderSide(color: AppColors.primaryDefault, width: 2),
        ),
      ),
    );
  }
}
