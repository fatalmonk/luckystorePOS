import 'package:flutter/foundation.dart';

/// Base class for all services following the Singleton pattern
abstract class BaseService {
  final String name;
  
  BaseService(this.name);
  
  @override
  String toString() => name;
  
  /// Check if service is initialized
  bool get isInitialized => _initialized;

  bool _initialized = false;

  /// Set initialization state (protected)
  @protected
  set isInitialized(bool value) {
    _initialized = value;
  }
  
  /// Initialize the service
  Future<void> initialize();
  
  /// Clean up resources
  Future<void> dispose();
}
