import 'package:flutter/material.dart';

/// Lucky Store Design Token Dictionary - Canonical Shadows
/// Version: 1.0.0
class AppShadows {
  // Level 1 - Subtle (Resting Cards, Input Fields)
  // box-shadow: 0px 1px 3px 0px rgba(15,23,42,0.08), 0px 1px 2px -1px rgba(15,23,42,0.06);
  static const List<BoxShadow> elevation1 = [
    BoxShadow(
      color: Color(0x140F172A),
      blurRadius: 3,
      offset: Offset(0, 1),
    ),
    BoxShadow(
      color: Color(0x0F0F172A),
      blurRadius: 2,
      spreadRadius: -1,
      offset: Offset(0, 1),
    ),
  ];

  // Level 2 - Medium (Raised Panels, Dropdowns)
  // box-shadow: 0px 4px 8px -2px rgba(15,23,42,0.10), 0px 2px 4px -2px rgba(15,23,42,0.06);
  static const List<BoxShadow> elevation2 = [
    BoxShadow(
      color: Color(0x1A0F172A),
      blurRadius: 8,
      spreadRadius: -2,
      offset: Offset(0, 4),
    ),
    BoxShadow(
      color: Color(0x0F0F172A),
      blurRadius: 4,
      spreadRadius: -2,
      offset: Offset(0, 2),
    ),
  ];

  // Level 3 - Prominent (Modals, Bottom Sheets, Side Drawers)
  // box-shadow: 0px 20px 40px -8px rgba(15,23,42,0.14), 0px 8px 16px -4px rgba(15,23,42,0.08);
  static const List<BoxShadow> elevation3 = [
    BoxShadow(
      color: Color(0x240F172A),
      blurRadius: 40,
      spreadRadius: -8,
      offset: Offset(0, 20),
    ),
    BoxShadow(
      color: Color(0x140F172A),
      blurRadius: 16,
      spreadRadius: -4,
      offset: Offset(0, 8),
    ),
  ];
}
