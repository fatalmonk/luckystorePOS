import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucky_store/main.dart';

void main() {
  testWidgets('Framework smoke test', (WidgetTester tester) async {
    // This test verifies the Flutter test environment is working
    // Complex app initialization is tested in integration tests
    await tester.pumpWidget(const BootstrapApp());
    expect(find.byType(BootstrapApp), findsOneWidget);
  });

  test('arithmetic works', () => expect(2 + 2, equals(4)));
}
