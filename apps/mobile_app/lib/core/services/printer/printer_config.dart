/// Printer configuration constants
class PrinterConfig {
  /// Maximum retry attempts for print jobs
  static const int maxRetryAttempts = 3;

  /// Base delay between retry attempts
  static const Duration baseRetryDelay = Duration(seconds: 2);

  /// Maximum delay between retry attempts
  static const Duration maxRetryDelay = Duration(seconds: 30);

  /// Print timeout in seconds
  static const int printTimeout = 30;
}

/// Network port configuration
class PortConfig {
  /// Default printer port
  static const int defaultPort = 9100;
}

/// Printer connection types
enum PrinterType {
  bluetooth,
  network,
  local,
}
