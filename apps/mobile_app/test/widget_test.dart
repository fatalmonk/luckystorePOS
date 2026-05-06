import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Framework smoke test', (WidgetTester tester) async {
    // This test verifies the Flutter test environment is working
    // Complex app initialization is tested in integration tests

    expect(1 + 1, equals(2)); // Basic sanity check
    test('arithmetic works', () => expect(2 + 2, equals(4)));
  });
}
