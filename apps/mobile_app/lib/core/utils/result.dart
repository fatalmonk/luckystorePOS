import 'package:meta/meta.dart';

/// A sealed type representing success or failure outcomes
@immutable
abstract class Result<T> {
  const Result();
  
  /// Whether this is a successful result
  bool get isSuccess => this is Success<T>;
  
  /// Whether this is a failed result
  bool get isFailure => this is Failure<T>;
}

/// Represents a successful outcome
@immutable
class Success<T> extends Result<T> {
  final T data;
  
  const Success(this.data);
  
  @override
  String toString() => 'Success(data: $data)';
}

/// Represents a failure outcome
@immutable
class Failure<T> extends Result<T> {
  final String error;
  final Exception? exception;
  final Map<String, dynamic>? metadata;
  
  const Failure(
    this.error, {
    this.exception,
    this.metadata,
  });
  
  @override
  String toString() {
    if (exception != null) {
      return 'Failure(error: $error, exception: ${exception!.toString()})';
    }
    return 'Failure(error: $error)';
  }
  
  /// Check if failure is network related
  bool get isNetworkError => 
      error.toLowerCase().contains('network') || 
      error.toLowerCase().contains('connection') ||
      error.toLowerCase().contains('timeout');
  
  /// Check if failure is authentication related
  bool get isAuthError =>
      error.toLowerCase().contains('auth') ||
      error.toLowerCase().contains('unauthorized') ||
      error.toLowerCase().contains('token');
}
