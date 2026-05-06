import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Utility class for common operations
class AppUtils {
  AppUtils._();
  
  /// Debounce function to limit function calls
  static Function debounce({
    required VoidCallback callback,
    required Duration duration,
  }) {
    Timer? timer;
    return () {
      timer?.cancel();
      timer = Timer(duration, callback);
    };
  }
  
  /// Throttle function to limit function calls to a maximum once per interval
  static Function throttle({
    required VoidCallback callback,
    required Duration duration,
  }) {
    bool lock = false;
    return () {
      if (lock) return;
      lock = true;
      callback();
      Timer(duration, () => lock = false);
    };
  }
  
  /// Retry a function with exponential backoff
  static Future<T> retry<T>({
    required Future<T> Function() action,
    int maxRetries = 3,
    Duration initialDelay = const Duration(seconds: 1),
    Duration maxDelay = const Duration(minutes: 1),
    required bool Function(Object error) shouldRetry,
  }) async {
    int retryCount = 0;
    Duration currentDelay = initialDelay;
    
    while (true) {
      try {
        return await action();
      } catch (error) {
        if (retryCount >= maxRetries || !shouldRetry(error)) {
          rethrow;
        }
        
        retryCount++;
        await Future.delayed(currentDelay);
        currentDelay = Duration(
          seconds: (currentDelay.inSeconds * 2).clamp(1, maxDelay.inSeconds),
        );
      }
    }
  }
  
  /// Parse JSON with error handling
  static Map<String, dynamic>? safeJsonDecode(String? jsonString) {
    if (jsonString == null || jsonString.isEmpty) return null;
    try {
      return jsonDecode(jsonString) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }
  
  /// Encode to JSON with error handling
  static String? safeJsonEncode(dynamic object) {
    try {
      return jsonEncode(object);
    } catch (e) {
      return null;
    }
  }
  
  /// Format currency in Bangladeshi Taka
  static String formatCurrency(int amount) {
    return '${amount.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    )}৳';
  }
  
  /// Get date range for today
  static Map<String, DateTime> getTodayRange() {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));
    return {'start': startOfDay, 'end': endOfDay};
  }
  
  /// Calculate time difference in seconds
  static int calculateTimeDifference(DateTime from, DateTime to) {
    return to.difference(from).inSeconds;
  }
  
  /// Check if date is end of day
  static bool isEndOfDay(DateTime date, {Duration buffer = const Duration(hours: 1)}) {
    final now = DateTime.now();
    final endOfDay = DateTime(date.year, date.month, date.day).add(
      const Duration(hours: 23, minutes: 59),
    );
    return now.isAfter(endOfDay.subtract(buffer));
  }
}

/// Production-safe logging utility
/// Logs are only output in debug/profile builds, never in release builds
class Logger {
  static const String _prefix = '✨ LuckyStore ';

  /// Check if running in release mode
  static bool get _isRelease => kReleaseMode;

  /// Log informational message (debug builds only)
  static void info(String message) {
    if (_isRelease) return;
    // ignore: avoid_print
    print('$_prefix[INFO] $message');
  }

  /// Log warning message (debug builds only)
  static void warning(String message) {
    if (_isRelease) return;
    // ignore: avoid_print
    print('$_prefix⚠️ [WARN] $message');
  }

  /// Log error message (always logged, but sanitized in release)
  static void error(String message, [Object? error, StackTrace? stack]) {
    if (_isRelease) {
      // In release, only log to crash reporting service (not console)
      // TODO: Integrate with Sentry/Crashlytics here
      return;
    }
    // ignore: avoid_print
    print('$_prefix❌ [ERROR] $message');
    if (error != null) {
      // ignore: avoid_print
      print('  Error: $error');
    }
    if (stack != null) {
      // ignore: avoid_print
      print('  Stack: $stack');
    }
  }

  /// Log debug message (debug builds only)
  static void debug(String message) {
    if (_isRelease) return;
    // ignore: avoid_print
    print('$_prefix🔍 [DEBUG] $message');
  }

  /// Log sensitive data (never logged to console, only to secure crash reporting)
  static void sensitive(String message, [Object? data]) {
    // Never log sensitive data to console
    // Only send to secure crash reporting in production
    // ignore: avoid_print
    if (!_isRelease) {
      print('$_prefix🔒 [SENSITIVE] $message (hidden in release)');
    }
  }
}
