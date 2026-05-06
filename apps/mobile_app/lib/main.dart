import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/generated/app_localizations.dart';

import 'theme/app_theme.dart';
import 'features/auth/presentation/screens/auth_gate.dart';
import 'features/auth/presentation/screens/startup_config_error_screen.dart';
import 'shared/providers/auth_provider.dart';
import 'shared/providers/pos_provider.dart';
import 'shared/controllers/app_access_controller.dart';
import 'features/checkout/presentation/screens/checkout_screen.dart';
import 'features/checkout/presentation/screens/bkash_checkout.dart';
import 'features/checkout/presentation/screens/gamified_reward_screen.dart';
import 'shared/services/startup_guard_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BootstrapApp());
}

class BootstrapApp extends StatefulWidget {
  const BootstrapApp({super.key});

  @override
  State<BootstrapApp> createState() => _BootstrapAppState();
}

class _BootstrapAppState extends State<BootstrapApp> {
  StartupResult? _startupResult;
  bool _reloading = false;

  @override
  void initState() {
    super.initState();
    _reloadConfig();
  }

  Future<void> _reloadConfig() async {
    if (_reloading) return;
    setState(() => _reloading = true);
    final result = await StartupGuardService.validateAndBootstrap();
    if (!mounted) return;
    setState(() {
      _startupResult = result;
      _reloading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final startupResult = _startupResult;
    if (startupResult == null) {
      return const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          backgroundColor: Color(0xFF0D1117),
          body: Center(
            child: CircularProgressIndicator(color: Color(0xFFE8B84B)),
          ),
        ),
      );
    }

    return ChangeNotifierProvider(
      create: (_) => AppLocaleNotifier(),
      child: LuckyStoreApp(
        startupResult: startupResult,
        onReloadConfig: _reloadConfig,
      ),
    );
  }
}

class AppLocaleNotifier extends ChangeNotifier {
  Locale? _locale;
  Locale? get locale => _locale;

  void setLocale(Locale locale) {
    if (!L10n.all.contains(locale)) return;
    _locale = locale;
    notifyListeners();
  }
}

class L10n {
  static final all = [
    const Locale('en'),
    const Locale('bn'),
  ];
}

class LuckyStoreApp extends StatelessWidget {
  final StartupResult startupResult;
  final Future<void> Function() onReloadConfig;

  const LuckyStoreApp({
    super.key,
    required this.startupResult,
    required this.onReloadConfig,
  });

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppLocaleNotifier>(context);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Lucky Store',
      theme: AppTheme.darkTheme,

      // Localization setup
      locale: provider.locale,
      supportedLocales: L10n.all,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      // Dynamic OS language detection
      localeResolutionCallback: (locale, supportedLocales) {
        if (locale == null) return supportedLocales.first;
        for (var supportedLocale in supportedLocales) {
          if (supportedLocale.languageCode == locale.languageCode) {
            return supportedLocale;
          }
        }
        return supportedLocales.first;
      },

      // Strict mode blocks startup. Flexible modes show diagnostics.
      home: _buildStartupHome(),

      // Named routes used within POS / checkout flows only.
      routes: {
        '/checkout':       (_) => const CheckoutScreen(),
        '/bkash-checkout': (_) => BkashCheckoutScreen(
          bkashUrl: 'https://checkout.sandbox.bKash.com/placeholder',
          paymentId: 'PENDING_PAYMENT_ID',
          amount: 0,
        ),
        '/order-confirmed': (_) => const GamifiedRewardScreen(),
      },
    );
  }

  Widget _buildStartupHome() {
    switch (startupResult.state) {
      case StartupState.blocked:
        return StartupConfigErrorScreen(
          missingVariables: startupResult.missingVariables,
          onReloadConfig: onReloadConfig,
        );
      case StartupState.degraded:
      case StartupState.warning:
      case StartupState.ready:
        return MultiProvider(
          providers: [
            ChangeNotifierProvider(create: (_) => AuthProvider()),
            ChangeNotifierProvider(create: (_) => PosProvider()),
            ChangeNotifierProxyProvider<AuthProvider, AppAccessController>(
              create: (_) => AppAccessController(startupResult: startupResult),
              update: (_, auth, access) {
                final controller =
                    access ?? AppAccessController(startupResult: startupResult);
                controller.updateFromAuth(auth);
                return controller;
              },
            ),
          ],
          child: AuthGate(startupResult: startupResult),
        );
    }
  }
}
