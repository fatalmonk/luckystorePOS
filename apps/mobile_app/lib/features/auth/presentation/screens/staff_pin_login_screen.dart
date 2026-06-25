import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../shared/providers/pos_provider.dart';
import '../../../../shared/widgets/lucky_store_logo.dart';

/// Unified PIN-based login screen for all staff (Cashiers, Managers, Admins).
///
/// This screen replaces the old email/password login and the POS-specific PIN login.
/// It authenticates users locally based on hardcoded PINs and initializes
/// the [PosProvider] session automatically for roles that have POS access.
class StaffPinLoginScreen extends StatefulWidget {
  const StaffPinLoginScreen({super.key});

  @override
  State<StaffPinLoginScreen> createState() => _StaffPinLoginScreenState();
}

class _StaffPinLoginScreenState extends State<StaffPinLoginScreen>
    with SingleTickerProviderStateMixin {
  final List<int> _pin = [];
  bool _loading = false;
  late AnimationController _shakeCtrl;
  late Animation<double> _shakeAnim;

  static const int _pinLength = 4;

  @override
  void initState() {
    super.initState();
    _shakeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _shakeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _shakeCtrl, curve: Curves.elasticIn),
    );
  }

  @override
  void dispose() {
    _shakeCtrl.dispose();
    super.dispose();
  }

  void _addDigit(int digit) {
    if (_pin.length >= _pinLength || _loading) return;
    setState(() {
      _pin.add(digit);
      context.read<AuthProvider>().clearSignInError();
    });
    if (_pin.length == _pinLength) {
      Future.delayed(const Duration(milliseconds: 150), _verifyPin);
    }
  }

  void _deleteDigit() {
    if (_pin.isEmpty || _loading) return;
    setState(() => _pin.removeLast());
  }

  Future<void> _verifyPin() async {
    final enteredPin = _pin.join();
    setState(() => _loading = true);

    final auth = context.read<AuthProvider>();
    final success = await auth.signInWithPin(enteredPin);

    if (!success) {
      // Wrong PIN or auth error — shake and clear.
      if (mounted) {
        _shakeCtrl.forward(from: 0);
        setState(() {
          _pin.clear();
          _loading = false;
        });
      }
      return;
    }

    // Auth succeeded — hydrate POS if needed then let AuthGate route.
    if (mounted) {
      try {
        final pos = context.read<PosProvider>();
        final appUser = auth.appUser!;
        await pos.loadFromAppUser(appUser);

        // Only open a POS session for cashiers — managers go to ManagerShell
        // and don't need an active POS session at login time.
        if (appUser.isCashier) {
          await pos.openSession();
        }
      } catch (e) {
        // Non-fatal: POS session failure should not block login.
        // The user will still be routed by AuthGate based on their role.
        debugPrint('[StaffPinLoginScreen] POS init error (non-fatal): $e');
      }
      // AuthGate Consumer will rebuild automatically based on AuthProvider.status.
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.primitiveNeutral900,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: EdgeInsets.zero,
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 400),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                    const LuckyStoreLogo(isDark: true, fontSize: 32),
                    const SizedBox(height: 16),
                    Text(
                      'Enter your access PIN to continue',
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.primitiveNeutral400,
                      ),
                    ),
                    const SizedBox(height: 48),

                    _PinDots(
                      length: _pinLength,
                      currentLength: _pin.length,
                      shakeAnim: _shakeAnim,
                    ),

                    if (auth.signInError != null) ...[
                      const SizedBox(height: 20),
                      Text(
                        auth.signInError!,
                        style: AppTextStyles.bodySm.copyWith(
                          color: AppColors.dangerDefault,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],

                    const SizedBox(height: 48),

                    _NumericPad(
                      onDigit: _addDigit,
                      onDelete: _deleteDigit,
                      disabled: _loading,
                    ),

                    const SizedBox(height: 32),

                            if (_loading)
                              CircularProgressIndicator(
                                color: AppColors.primaryDefault,
                                strokeWidth: 3,
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}



class _PinDots extends StatelessWidget {
  final int length;
  final int currentLength;
  final Animation<double> shakeAnim;

  const _PinDots({
    required this.length,
    required this.currentLength,
    required this.shakeAnim,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: shakeAnim,
      builder: (ctx, child) {
        final shakeOffset = shakeAnim.value * 12 * (0.5 - (shakeAnim.value % 1).abs()).sign;
        return Transform.translate(
          offset: Offset(shakeOffset * 8, 0),
          child: child,
        );
      },
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(length, (i) {
          final filled = i < currentLength;
          return AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.symmetric(horizontal: 10),
            width: filled ? 20 : 16,
            height: filled ? 20 : 16,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: filled ? AppColors.primaryDefault : AppColors.primitiveNeutral0.withValues(alpha: 0.15),
              boxShadow: filled
                  ? [BoxShadow(color: AppColors.primaryDefault.withValues(alpha: 0.4), blurRadius: 10)]
                  : null,
              border: filled ? null : Border.all(color: AppColors.primitiveNeutral0.withValues(alpha: 0.05), width: 1.5),
            ),
          );
        }),
      ),
    );
  }
}

class _NumericPad extends StatelessWidget {
  final Function(int) onDigit;
  final VoidCallback onDelete;
  final bool disabled;

  const _NumericPad({
    required this.onDigit,
    required this.onDelete,
    this.disabled = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _row([1, 2, 3]),
        const SizedBox(height: 16),
        _row([4, 5, 6]),
        const SizedBox(height: 16),
        _row([7, 8, 9]),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(width: 80),
            const SizedBox(width: 16),
            _button(0),
            const SizedBox(width: 16),
            _deleteButton(),
          ],
        ),
      ],
    );
  }

  Widget _row(List<int> digits) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: digits
          .map((d) => [
                _button(d),
                if (d != digits.last) const SizedBox(width: 16),
              ])
          .expand((x) => x)
          .toList(),
    );
  }

  Widget _button(int digit) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: disabled ? null : () => onDigit(digit),
        borderRadius: BorderRadius.circular(50),
        child: Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.primitiveNeutral0.withValues(alpha: 0.05),
            border: Border.all(color: AppColors.primitiveNeutral0.withValues(alpha: 0.1)),
          ),
          alignment: Alignment.center,
          child: Text(
            '$digit',
            style: AppTextStyles.display.copyWith(
              color: AppColors.primitiveNeutral0,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }

  Widget _deleteButton() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: disabled ? null : onDelete,
        borderRadius: BorderRadius.circular(50),
        child: SizedBox(
          width: 80,
          height: 80,
          child: Icon(
            Icons.backspace_outlined,
            color: AppColors.primitiveNeutral400,
            size: 28,
          ),
        ),
      ),
    );
  }
}
