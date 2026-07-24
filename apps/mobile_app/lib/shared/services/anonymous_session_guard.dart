class AnonymousSessionGuard {
  static Future<T> run<T>({
    required bool hasSession,
    required Future<void> Function() signInAnonymously,
    required Future<T> Function() authenticatedAction,
  }) async {
    if (!hasSession) {
      try {
        await signInAnonymously();
      } catch (error) {
        throw StateError(
          'Unable to establish an anonymous session for PIN authentication.',
        );
      }
    }

    return authenticatedAction();
  }
}
