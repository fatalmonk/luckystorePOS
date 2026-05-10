import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_spacing.dart';
import 'app_radius.dart';
import 'app_text_styles.dart';

/// Lucky Store Design Token Dictionary - Canonical Button Styles
/// Version: 1.0.0
class AppButtonStyles {
  /// Primary Button Style (Indigo-Blue)
  static ButtonStyle primary = ElevatedButton.styleFrom(
    backgroundColor: AppColors.primaryDefault,
    foregroundColor: AppColors.primaryOn,
    disabledBackgroundColor: AppColors.primitiveNeutral200,
    disabledForegroundColor: AppColors.textMuted,
    minimumSize: const Size(0, 44),
    padding: AppSpacing.insetSquishMd,
    shape: RoundedRectangleBorder(
      borderRadius: AppRadius.borderMd,
    ),
    textStyle: AppTextStyles.labelLg,
    elevation: 0,
  ).copyWith(
    overlayColor: WidgetStateProperty.resolveWith((states) {
      if (states.contains(WidgetState.pressed)) return AppColors.primaryPressed;
      if (states.contains(WidgetState.hovered)) return AppColors.primaryHover;
      return null;
    }),
  );

  /// Secondary Button Style (Teal-Green)
  static ButtonStyle secondary = ElevatedButton.styleFrom(
    backgroundColor: AppColors.secondaryDefault,
    foregroundColor: AppColors.secondaryOn,
    disabledBackgroundColor: AppColors.primitiveNeutral200,
    disabledForegroundColor: AppColors.textMuted,
    minimumSize: const Size(0, 44),
    padding: AppSpacing.insetSquishMd,
    shape: RoundedRectangleBorder(
      borderRadius: AppRadius.borderSm,
    ),
    textStyle: AppTextStyles.labelLg,
    elevation: 0,
  ).copyWith(
    overlayColor: WidgetStateProperty.resolveWith((states) {
      if (states.contains(WidgetState.pressed)) return AppColors.secondaryHover;
      return null;
    }),
  );

  /// Ghost/Text Button Style
  static ButtonStyle ghost = TextButton.styleFrom(
    foregroundColor: AppColors.primaryDefault,
    padding: AppSpacing.insetSquishMd,
    shape: RoundedRectangleBorder(
      borderRadius: AppRadius.borderSm,
    ),
    textStyle: AppTextStyles.labelLg,
  );

  /// Danger Button Style
  static ButtonStyle danger = ElevatedButton.styleFrom(
    backgroundColor: AppColors.dangerDefault,
    foregroundColor: AppColors.dangerOn,
    minimumSize: const Size(0, 44),
    padding: AppSpacing.insetSquishMd,
    shape: RoundedRectangleBorder(
      borderRadius: AppRadius.borderMd,
    ),
    textStyle: AppTextStyles.labelLg,
    elevation: 0,
  );
}
