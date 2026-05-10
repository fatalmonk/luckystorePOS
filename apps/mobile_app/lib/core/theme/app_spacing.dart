import 'package:flutter/material.dart';

/// Lucky Store Design Token Dictionary - Canonical Spacing
/// Version: 1.0.0
class AppSpacing {
  static const double space1 = 4.0;
  static const double space2 = 8.0;
  static const double space3 = 12.0;
  static const double space4 = 16.0;
  static const double space5 = 20.0;
  static const double space6 = 24.0;
  static const double space8 = 32.0;
  static const double space10 = 40.0;
  static const double space12 = 48.0;
  static const double space16 = 64.0;

  // Inset convenience aliases
  static const EdgeInsets insetSm = EdgeInsets.all(space2);
  static const EdgeInsets insetMd = EdgeInsets.all(space4);
  static const EdgeInsets insetLg = EdgeInsets.all(space6);

  static const EdgeInsets insetSquishSm = EdgeInsets.symmetric(vertical: space1, horizontal: space2);
  static const EdgeInsets insetSquishMd = EdgeInsets.symmetric(vertical: space2, horizontal: space4);
  static const EdgeInsets insetSquishLg = EdgeInsets.symmetric(vertical: space3, horizontal: space6);
}
