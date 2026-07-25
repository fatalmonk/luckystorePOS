import 'package:flutter_test/flutter_test.dart';
import 'package:lucky_store/shared/services/anonymous_session_guard.dart';

void main() {
  test('anonymous sign-in success proceeds to the authenticated action', () async {
    var signInCalls = 0;
    var actionCalls = 0;

    final result = await AnonymousSessionGuard.run(
      hasSession: false,
      signInAnonymously: () async => signInCalls++,
      authenticatedAction: () async {
        actionCalls++;
        return 'authenticated';
      },
    );

    expect(result, 'authenticated');
    expect(signInCalls, 1);
    expect(actionCalls, 1);
  });

  test('anonymous sign-in failure does not call the authenticated action', () async {
    var actionCalls = 0;

    await expectLater(
      AnonymousSessionGuard.run<void>(
        hasSession: false,
        signInAnonymously: () async => throw Exception('synthetic failure'),
        authenticatedAction: () async => actionCalls++,
      ),
      throwsA(isA<StateError>()),
    );

    expect(actionCalls, 0);
  });

  test('an existing session skips anonymous sign-in', () async {
    var signInCalls = 0;

    await AnonymousSessionGuard.run<void>(
      hasSession: true,
      signInAnonymously: () async => signInCalls++,
      authenticatedAction: () async {},
    );

    expect(signInCalls, 0);
  });
}
