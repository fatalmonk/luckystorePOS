import 'dart:async';
import 'package:flutter/foundation.dart';

enum PrinterState { disconnected, connecting, connected, busy, failure }

class PrintJob {
  final String id;
  final String payload;
  int attempts = 0;

  PrintJob(this.id, this.payload);
}

class PrinterQueueManager extends ChangeNotifier {
  final List<PrintJob> _queue = [];
  PrinterState _state = PrinterState.disconnected;
  bool _isProcessing = false;

  PrinterState get state => _state;
  int get pendingJobs => _queue.length;

  void updateState(PrinterState s) {
    _state = s;
    notifyListeners();
  }

  Future<void> enqueueReceipt(String id, String text) async {
    // Hard idempotency: Block duplicate receipt spooling
    if (_queue.any((j) => j.id == id)) return;
    
    _queue.add(PrintJob(id, text));
    notifyListeners();
    
    _processNext();
  }

  Future<void> _processNext() async {
    if (_isProcessing || _queue.isEmpty) return;
    _isProcessing = true;

    final job = _queue.first;
    updateState(PrinterState.busy);

    try {
      // Simulated physical peripheral execution hook
      await Future.delayed(const Duration(seconds: 1)); 
      
      // Success condition logic
      _queue.removeAt(0);
      updateState(PrinterState.connected);
    } catch (e) {
      job.attempts++;
      updateState(PrinterState.failure);
      
      if (job.attempts > 3) {
        // Critical stall: Drop bad spool to prevent global block
        _queue.removeAt(0);
      }
    } finally {
      _isProcessing = false;
      notifyListeners();
      
      // Recursive drain cycle with retry pacing delay
      if (_queue.isNotEmpty) {
        Future.delayed(const Duration(seconds: 2), _processNext);
      }
    }
  }
}
