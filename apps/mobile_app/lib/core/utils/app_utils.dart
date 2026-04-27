import 'dart:async';
import 'dart:convert';

/// Utility class for common operations
class AppUtils {
  AppUtils._();
  
  /// Debounce function to limit function calls
  static T debounce<T>({
    required T Function() callback,
    required Duration duration,
  }) {
    Timer? timer;
    return () {
      timer?.cancel();
      timer = Timer(duration, callback);
    };
  }
  
  /// Throttle function to limit function calls to a maximum once per interval
  static T throttle<T>({
    required T Function() callback,
    required Duration duration,
  }) {
    Timer? timer;
    bool lock = false;
    return () {
      if (lock) return;
      lock = true;
      callback();
      timer = Timer(duration, () => lock = false);
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

/// Logging utility
class Logger {
  static const String _prefix = '✨ LuckyStore ';
  
  static void info(String message) {
    debugPrint('$_prefix$message');
  }
  
  static void warning(String message) {
    debugPrint('$_prefix⚠️ $message');
  }
  
  static void error(String message, [Object? error, StackTrace? stack]) {
    if (error != null) {
      debugPrint('$_prefix❌ $message - Error: $error');
    } else {
      debugPrint('$_prefix❌ $message');
    }
  }
  
  static void debug(String message) {
    debugPrint('$_prefix🔍 $message');
  }
}
