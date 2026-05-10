import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_button_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../data/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await AuthService.signIn(
      _emailController.text.trim(),
      _passwordController.text,
    );

    setState(() {
      _isLoading = false;
    });

    if (success) {
      if (!mounted) return;
      // After login, close the screen and return true to indicate success
      Navigator.of(context).pop(true);
    } else {
      setState(() {
        _errorMessage = 'Invalid email or password.';
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Determine if tablet to constrain width
    final isTablet = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(
        title: const Text('Admin Login'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: AppSpacing.insetLg,
          child: Container(
            constraints: isTablet ? const BoxConstraints(maxWidth: 400) : null,
            padding: AppSpacing.insetLg,
            decoration: BoxDecoration(
              color: AppColors.surfaceDefault,
              borderRadius: AppRadius.borderMd,
              boxShadow: AppShadows.elevation1,
              border: Border.all(color: AppColors.borderDefault),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.admin_panel_settings,
                  size: 64,
                  color: AppColors.primaryDefault,
                ),
                const SizedBox(height: AppSpacing.space6),
                Text(
                  'Store Mode Access',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.headingXl.copyWith(color: AppColors.textPrimary),
                ),
                const SizedBox(height: AppSpacing.space2),
                Text(
                  'Sign in with your admin or manager account to access store operations.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: AppSpacing.space8),
                if (_errorMessage != null) ...[
                  Container(
                    padding: AppSpacing.insetSm,
                    decoration: BoxDecoration(
                      color: AppColors.dangerSubtle,
                      border: Border.all(color: AppColors.dangerDefault.withValues(alpha: 0.5)),
                      borderRadius: AppRadius.borderSm,
                    ),
                    child: Text(
                      _errorMessage!,
                      style: AppTextStyles.bodySm.copyWith(color: AppColors.dangerDefault),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space4),
                ],
                TextField(
                  controller: _emailController,
                  style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    labelText: 'Email',
                    labelStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                    filled: true,
                    fillColor: AppColors.surfaceRaised,
                    border: OutlineInputBorder(
                      borderRadius: AppRadius.borderMd,
                      borderSide: BorderSide.none,
                    ),
                    prefixIcon: const Icon(Icons.email, color: AppColors.textSecondary),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: AppSpacing.space4),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    labelStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                    filled: true,
                    fillColor: AppColors.surfaceRaised,
                    border: OutlineInputBorder(
                      borderRadius: AppRadius.borderMd,
                      borderSide: BorderSide.none,
                    ),
                    prefixIcon: const Icon(Icons.lock, color: AppColors.textSecondary),
                  ),
                ),
                const SizedBox(height: AppSpacing.space6),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleLogin,
                  style: AppButtonStyles.primary,
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text('Sign In', style: AppTextStyles.labelLg.copyWith(color: AppColors.primaryOn)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
