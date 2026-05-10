import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Lucky Store Design Token Dictionary - Canonical Text Styles
/// Version: 1.0.0
class AppTextStyles {
  static const String fontFamilyPrimary = 'HindSiliguri';
  
  static const String fontFamilyMono = 'JetBrainsMono';

  static const TextStyle display = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 32,
    height: 1.2,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  static const TextStyle headingXl = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 24,
    height: 1.3,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  static const TextStyle headingLg = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 20,
    height: 1.3,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );

  static const TextStyle headingMd = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 16,
    height: 1.4,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );

  static const TextStyle bodyLg = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 15,
    height: 1.5,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
  );

  static const TextStyle bodyMd = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 14,
    height: 1.5,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
  );

  static const TextStyle bodySm = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 13,
    height: 1.5,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
  );

  static const TextStyle labelLg = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 14,
    height: 1.2,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
  );

  static const TextStyle labelMd = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 13,
    height: 1.2,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
  );

  static const TextStyle labelSm = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 11,
    height: 1.2,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
  );

  static const TextStyle bodySmall = bodySm;

  static const TextStyle bodyXs = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 10,
    height: 1.5,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
  );

  static const TextStyle labelXs = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 9,
    height: 1.2,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
  );

  static const TextStyle monoMd = TextStyle(
    fontFamily: fontFamilyMono,
    fontSize: 14,
    height: 1.4,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
  );

  static const TextStyle monoLg = TextStyle(
    fontFamily: fontFamilyMono,
    fontSize: 20,
    height: 1.2,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
  );
}
