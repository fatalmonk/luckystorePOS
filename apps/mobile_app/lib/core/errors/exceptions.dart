/// Base exception for all custom exceptions in the app
class AppException implements Exception {
  final String message;
  final String? code;
  final Map<String, dynamic>? metadata;
  
  const AppException(
    this.message, {
    this.code,
    this.metadata,
  });

  @override
  String toString() {
    if (code != null) {
      return 'AppException(code: $code, message: $message)';
    }
    return 'AppException(message: $message)';
  }
}

/// Network-related exceptions
class NetworkException extends AppException {
  const NetworkException(super.message, {super.code});
}

/// Authentication/Authorization exceptions
class AuthException extends AppException {
  const AuthException(super.message, {super.code});
}

/// Validation exceptions
class ValidationException extends AppException {
  final Map<String, String>? fieldErrors;
  
  const ValidationException(
    super.message, {
    super.code,
    this.fieldErrors,
  });
}

/// Database-related exceptions
class DatabaseException extends AppException {
  const DatabaseException(super.message, {super.code});
}

/// Business logic exceptions
class BusinessLogicException extends AppException {
  const BusinessLogicException(super.message, {super.code});
}

/// Sync-related exceptions
class SyncException extends AppException {
  final String? operation;
  
  const SyncException(
    super.message, {
    super.code,
    this.operation,
  });
}
