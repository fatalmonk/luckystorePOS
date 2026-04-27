import 'package:flutter/foundation.dart';

/// Base class for all services following the Singleton pattern
abstract class BaseService {
  final String name;
  
  BaseService(this.name);
  
  @override
  String toString() => name;
  
  /// Check if service is initialized
  @protected
  bool get isInitialized => _initialized;
  
  bool _initialized = false;
  
  /// Initialize the service
  Future<void> initialize();
  
  /// Clean up resources
  Future<void> dispose();
}
