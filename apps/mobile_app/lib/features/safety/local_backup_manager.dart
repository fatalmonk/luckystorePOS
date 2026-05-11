import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class LocalBackupManager {
  static const String dbName = 'db.sqlite';
  static const int maxRetention = 5; // Keep max 5 rotational backups

  Future<void> triggerEmergencySnapshot() async {
    try {
      final appDir = await getApplicationDocumentsDirectory();
      final dbPath = p.join(appDir.path, dbName);
      
      final source = File(dbPath);
      if (!await source.exists()) return;

      final backupDir = Directory(p.join(appDir.path, 'backups'));
      if (!await backupDir.exists()) await backupDir.create();

      // Generate atomic timestamped copy
      final ts = DateTime.now().toIso8601String().replaceAll(':', '-');
      final destPath = p.join(backupDir.path, 'backup_$ts.sqlite');
      
      await source.copy(destPath);
      
      // Standard rotation to conserve disk usage on cheap devices
      await _rotateOldBackups(backupDir);
    } catch (e) {
      // Silently fail or report to telemetry if critical
      print('Failed local backup generation: $e');
    }
  }

  Future<void> _rotateOldBackups(Directory dir) async {
    final files = dir.listSync().whereType<File>().toList()
      ..sort((a, b) => b.lastModifiedSync().compareTo(a.lastModifiedSync()));

    if (files.length > maxRetention) {
      for (int i = maxRetention; i < files.length; i++) {
        try {
          await files[i].delete();
        } catch (_) {}
      }
    }
  }
}
