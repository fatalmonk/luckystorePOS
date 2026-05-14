import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/controllers/app_access_controller.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../shared/providers/pos_provider.dart';
import '../../../../shared/services/startup_guard_service.dart';
import './staff_pin_login_screen.dart';
import '../../../pos/presentation/screens/manager_shell.dart';
import '../../../pos/presentation/screens/pos_main_screen.dart';

/// Root routing widget that reacts to [AuthProvider.status] and sends
/// the user to the correct screen with zero manual navigation calls.
///
/// Placement: set as `home:` in MaterialApp so it is always the base.
class AuthGate extends StatelessWidget {
  final StartupResult startupResult;

  const AuthGate({
    super.key,
    required this.startupResult,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer2<AuthProvider, AppAccessController>(
      builder: (context, auth, access, _) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (context.mounted) {
            context.read<PosProvider>().setOfflineSafeMode(access.isOfflineSafeMode);
          }
        });
        final child = switch (auth.status) {
          // ── Loading: PIN validation in progress ───────────────────────────
          AuthStatus.loading => const _SplashScreen(),

          // ── No session: show PIN keypad ───────────────────────────────────
          AuthStatus.unauthenticated => access.canLogin()
              ? const StaffPinLoginScreen()
              : const _CapabilityBlockedScreen(
                  title: 'Login Disabled',
                  message: 'Runtime health policy is currently blocking login.',
                ),

          // ── Cashier: go straight to POS ───────────────────────────────────
          AuthStatus.cashier => access.canAccessPOS()
              ? const PosMainScreen()
              : const _CapabilityBlockedScreen(
                  title: 'POS Restricted',
                  message: 'POS is currently unavailable due to runtime health.',
                ),

          // ── Manager / Admin: full management shell ────────────────────────
          AuthStatus.manager => access.canAccessDashboard()
              ? const ManagerShell()
              : const _CapabilityBlockedScreen(
                  title: 'Dashboard Restricted',
                  message:
                      'Dashboard is currently unavailable due to runtime health.',
                ),
        };

        if (!access.shouldShowWarningBanner) return child;
        // Don't show warning banner on login screen
        if (auth.status == AuthStatus.unauthenticated) return child;
        return _WarningFrame(child: child);
      },
    );
  }
}

class _WarningFrame extends StatelessWidget {
  final Widget child;
  const _WarningFrame({required this.child});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: AppColors.warningDark,
          child: Text(
            'DEGRADED HEALTH: Cached mode active while connectivity recovers.',
            style: AppTextStyles.labelSm.copyWith(
              color: AppColors.warningOn,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _CapabilityBlockedScreen extends StatelessWidget {
  final String title;
  final String message;

  const _CapabilityBlockedScreen({
    required this.title,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primitiveNeutral900,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.primitiveNeutral800,
                borderRadius: AppRadius.borderLg,
                border: Border.all(color: AppColors.primitiveNeutral600.withValues(alpha: 0.3)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.policy_outlined, color: AppColors.warningDefault),
                  const SizedBox(height: 10),
                  Text(
                    title,
                    style: AppTextStyles.headingMd.copyWith(color: AppColors.primitiveNeutral0),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: AppTextStyles.bodySm.copyWith(color: AppColors.primitiveNeutral400),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Splash / loading screen
// ─────────────────────────────────────────────────────────────────────────────

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primitiveNeutral900,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _StoreLogo(),
            const SizedBox(height: 32),
            CircularProgressIndicator(
              color: AppColors.primaryDefault,
              strokeWidth: 2.5,
            ),
          ],
        ),
      ),
    );
  }
}

class _StoreLogo extends StatelessWidget {
  const _StoreLogo();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primaryDefault, AppColors.primaryHover],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: AppRadius.borderLg,
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDefault.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Icon(Icons.store_rounded, color: AppColors.primaryOn, size: 42),
    );
  }
}
