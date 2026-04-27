/// Constants for printer-related operations
class PrinterConstants {
  /// Printer command timeout in milliseconds
  static const int commandTimeout = 30000;
  
  /// Print job retry attempts
  static const int retryAttempts = 3;
  
  /// Delay between retry attempts in milliseconds
  static const int retryDelay = 2000;
  
  /// Maximum print queue size
  static const int maxQueueSize = 50;
  
  /// Printer connection timeout in milliseconds
  static const int connectionTimeout = 10000;
  
  /// Bluetooth scan timeout in milliseconds  
  static const int bluetoothScanTimeout = 15000;
  
  /// Default printer timeout
  static const int defaultTimeout = 15000;
  
  /// Print job priority levels
  static const int lowPriority = 1;
  static const int normalPriority = 5;
  static const int highPriority = 10;
  
  /// Printer status constants
  static const String statusOnline = 'online';
  static const String statusOffline = 'offline';
  static const String statusError = 'error';
  static const String statusBusy = 'busy';
  static const String statusPaused = 'paused';
  static const String statusInitializing = 'initializing';
}
