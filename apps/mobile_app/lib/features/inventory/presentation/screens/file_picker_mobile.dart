import 'package:file_picker/file_picker.dart';
import 'picked_file_data.dart';

/// Mobile file picker implementation
/// This file is only imported on mobile platforms (dart:io available)
Future<PickedFileData?> pickCsvFile() async {
  // file_picker 11.0+ uses static method pickFiles()
  final result = await FilePicker.pickFiles(
    type: FileType.custom,
    allowedExtensions: ['csv'],
    withData: true,
  );

  if (result == null || result.files.isEmpty) return null;

  final file = result.files.first;
  return PickedFileData(
    name: file.name,
    bytes: file.bytes,
  );
}
