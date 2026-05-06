/// Simple data class for picked file information
class PickedFileData {
  final String name;
  final List<int>? bytes;

  PickedFileData({
    required this.name,
    this.bytes,
  });
}
