import 'dart:async';

/// Generic event bus that replaces repeated StreamController.broadcast() boilerplate.
///
/// Usage:
///   final bus = EventBus<MyEventType>();
///   bus.stream.listen((event) => ...);
///   bus.emit(MyEventType.someEvent);
class EventBus<T> {
  final StreamController<T> _controller = StreamController<T>.broadcast();

  /// Listen to events. Returns a StreamSubscription for cleanup.
  StreamSubscription<T> listen(void Function(T event) onEvent) {
    return _controller.stream.listen(onEvent);
  }

  /// Emit an event to all listeners.
  void emit(T event) {
    if (!_controller.isClosed) {
      _controller.add(event);
    }
  }

  /// Whether the bus has active listeners.
  bool get hasListeners => _controller.hasListener;

  /// The raw stream, for use with StreamBuilder or advanced patterns.
  Stream<T> get stream => _controller.stream;

  /// Dispose the underlying controller. Call in provider dispose().
  void dispose() {
    _controller.close();
  }
}