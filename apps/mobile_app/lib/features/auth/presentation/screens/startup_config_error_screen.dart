import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../config/environment_contract.dart';

class StartupConfigErrorScreen extends StatelessWidget {
  final List<String> missingVariables;

  const StartupConfigErrorScreen({
    super.key,
    required this.missingVariables,
  });

  static const String _setupGuideUrl =
      'https://supabase.com/docs/guides/getting-started';

  static String get _envTemplate {
    return EnvironmentContract.requiredStartupVars
        .map((key) => '--dart-define=$key=')
        .join('\n');
  }

  static String get _envExample => '''
# Public mobile startup configuration
--dart-define=SUPABASE_URL=https://your-project-ref.supabase.co
--dart-define=SUPABASE_ANON_KEY=<your-project-anon-key>
''';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF161B22),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white12),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.error_outline, color: Colors.redAccent),
                        SizedBox(width: 10),
                        Text(
                          'Startup Configuration Error',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'App startup is blocked because required environment variables are missing.',
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Missing variables:',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...missingVariables.map(
                      (key) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(
                          '- $key',
                          style: const TextStyle(
                            color: Colors.orangeAccent,
                            fontFamily: 'monospace',
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Provide the missing --dart-define values, then restart the app.',
                      style: TextStyle(color: Colors.white54, fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () => _copyTemplate(context),
                          icon: const Icon(Icons.copy, size: 16),
                          label: const Text('Copy Build Config Template'),
                        ),
                        TextButton.icon(
                          onPressed: () => _openSetupGuide(context),
                          icon: const Icon(Icons.open_in_new, size: 16),
                          label: const Text('Open Docs/Setup Guide'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Theme(
                      data: Theme.of(context).copyWith(
                        dividerColor: Colors.transparent,
                      ),
                      child: ExpansionTile(
                        tilePadding: EdgeInsets.zero,
                        iconColor: Colors.white70,
                        collapsedIconColor: Colors.white54,
                        title: const Text(
                          'Show build configuration example',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.black26,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.white12),
                            ),
                            child: SelectableText(
                              _envExample,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontFamily: 'monospace',
                                fontSize: 12,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _copyTemplate(BuildContext context) async {
    final missingOnly = missingVariables
        .map((key) => '--dart-define=$key=')
        .join('\n');
    final template = '''# Missing variables only
$missingOnly

# Full required template
$_envTemplate''';
    await Clipboard.setData(ClipboardData(text: template));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Env template copied to clipboard.')),
    );
  }

  Future<void> _openSetupGuide(BuildContext context) async {
    final uri = Uri.parse(_setupGuideUrl);
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (opened || !context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Could not open setup guide: $_setupGuideUrl')),
    );
  }
}
