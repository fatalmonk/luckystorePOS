/// Responsive breakpoints for POS screen layout
/// 
/// Usage:
/// ```dart
/// final isTablet = MediaQuery.of(context).size.width >= AppBreakpoints.tablet;
/// final layout = AppBreakpoints.getLayout(screenWidth);
/// ```
abstract class AppBreakpoints {
  /// Small phones (< 400px)
  static const double smallPhone = 400;
  
  /// Phones (400px - 599px)
  static const double phone = 600;
  
  /// Small tablets (600px - 899px)
  static const double tablet = 600;
  
  /// Large tablets (900px - 1199px)
  static const double largeTablet = 900;
  
  /// Desktop (>= 1200px)
  static const double desktop = 1200;

  /// Get layout type based on screen width
  static PosLayout getLayout(double width) {
    if (width >= desktop) return PosLayout.desktop;
    if (width >= largeTablet) return PosLayout.largeTablet;
    if (width >= tablet) return PosLayout.tablet;
    if (width >= smallPhone) return PosLayout.phone;
    return PosLayout.smallPhone;
  }

  /// Get panel flex ratios for split layout
  static PanelFlex getPanelFlex(PosLayout layout) {
    return switch (layout) {
      PosLayout.smallPhone => const PanelFlex(left: 55, right: 45),
      PosLayout.phone => const PanelFlex(left: 55, right: 45),
      PosLayout.tablet => const PanelFlex(left: 65, right: 35),
      PosLayout.largeTablet => const PanelFlex(left: 70, right: 30),
      PosLayout.desktop => const PanelFlex(left: 75, right: 25),
    };
  }

  /// Get minimum panel widths
  static PanelConstraints getPanelConstraints(PosLayout layout) {
    return switch (layout) {
      PosLayout.smallPhone => const PanelConstraints(minLeft: 180, minRight: 140),
      PosLayout.phone => const PanelConstraints(minLeft: 200, minRight: 160),
      PosLayout.tablet => const PanelConstraints(minLeft: 320, minRight: 240),
      PosLayout.largeTablet => const PanelConstraints(minLeft: 400, minRight: 280),
      PosLayout.desktop => const PanelConstraints(minLeft: 480, minRight: 320),
    };
  }
}

/// Layout types for POS screen
enum PosLayout {
  smallPhone,
  phone,
  tablet,
  largeTablet,
  desktop,
}

/// Flex ratios for split panels
class PanelFlex {
  final int left;
  final int right;
  
  const PanelFlex({required this.left, required this.right});
}

/// Minimum width constraints for panels
class PanelConstraints {
  final double minLeft;
  final double minRight;
  
  const PanelConstraints({required this.minLeft, required this.minRight});
}
