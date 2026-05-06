import 'picked_file_data.dart';

/// Stub file picker for web platform
/// Throws error since file picking is not supported on web
Future<PickedFileData> pickCsvFile() async {
  throw UnsupportedError(
    'CSV file picking is not supported on web. Please use the mobile app.',
  );
}
