import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'staff_pin_login_screen.dart';
import 'manager/manager_shell.dart';
import 'pos/pos_main_screen.dart';

/// Root routing widget that reacts to [AuthProvider.status] and sends
/// the user to the correct screen with zero manual navigation calls.
///
/// Placement: set as `home:` in MaterialApp so it is always the base.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        switch (auth.status) {
          // ── Loading: PIN validation in progress ───────────────────────────
          case AuthStatus.loading:
            return const _SplashScreen();

          // ── No session: show PIN keypad ───────────────────────────────────
          case AuthStatus.unauthenticated:
            return const StaffPinLoginScreen();

          // ── Cashier: go straight to POS ───────────────────────────────────
          case AuthStatus.cashier:
            return const PosMainScreen();

          // ── Manager / Admin: full management shell ────────────────────────
          case AuthStatus.manager:
            return const ManagerShell();
        }
      },
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
    return const Scaffold(
      backgroundColor: Color(0xFF0D1117),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Gold store icon
            _StoreLogo(),
            SizedBox(height: 32),
            CircularProgressIndicator(
              color: Color(0xFFE8B84B),
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
        gradient: const LinearGradient(
          colors: [Color(0xFFE8B84B), Color(0xFFD4941A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFE8B84B).withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: const Icon(Icons.store_rounded, color: Colors.white, size: 42),
    );
  }
}
