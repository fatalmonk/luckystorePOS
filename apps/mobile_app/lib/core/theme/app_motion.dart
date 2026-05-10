import 'package:flutter/animation.dart';

/// Lucky Store Design Token Dictionary - Canonical Motion
/// Version: 1.0.0
class AppMotion {
  // Durations
  static const Duration durationFast = Duration(milliseconds: 120);
  static const Duration durationNormal = Duration(milliseconds: 220);
  static const Duration durationSlow = Duration(milliseconds: 350);

  // Easing Curves
  static const Curve easeStandard = Curves.easeInOut;
  static const Curve easeDecelerate = Curves.decelerate;
  static const Curve easeAccelerate = Curves.easeIn;
}
