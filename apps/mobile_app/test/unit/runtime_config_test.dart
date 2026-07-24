import 'package:flutter_test/flutter_test.dart';
import 'package:lucky_store/config/environment_contract.dart';
import 'package:lucky_store/config/runtime_config.dart';

void main() {
  test('mobile startup contract contains only public Supabase values', () {
    expect(
      EnvironmentContract.requiredStartupVars,
      ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    );
  });

  group('RuntimeConfig.missingStartupVariables', () {
    test('reports both public values when empty', () {
      expect(
        RuntimeConfig.missingStartupVariables(url: '', anonKey: '  '),
        ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
      );
    });

    test('accepts non-empty public values', () {
      expect(
        RuntimeConfig.missingStartupVariables(
          url: 'https://project.example',
          anonKey: 'public-anon-key',
        ),
        isEmpty,
      );
    });
  });

  test('derives the create-sale Edge Function URL from public config', () {
    expect(
      RuntimeConfig.edgeFunctionUrl(
        'create-sale',
        url: 'https://project.example/',
      ),
      'https://project.example/functions/v1/create-sale',
    );
  });
}
