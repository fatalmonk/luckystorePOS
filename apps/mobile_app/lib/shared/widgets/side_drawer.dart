import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_shadows.dart';
import '../../core/theme/app_spacing.dart';
import '../../main.dart'; // AppLocaleNotifier
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/pos/presentation/screens/store_mode.dart';
import '../../features/inventory/presentation/screens/inventory_import_screen.dart';
import '../../features/pos/presentation/screens/manager_dashboard_screen.dart';
import '../../features/pos/presentation/screens/label_print_screen.dart';
import '../../features/auth/data/auth_service.dart';

class SideDrawer extends StatefulWidget {
  const SideDrawer({super.key});

  @override
  State<SideDrawer> createState() => _SideDrawerState();
}

class _SideDrawerState extends State<SideDrawer> {
  bool _isAdmin = false;

  @override
  void initState() {
    super.initState();
    _checkAdminStatus();
  }

  Future<void> _checkAdminStatus() async {
    final isAdmin = await AuthService.isUserAdminOrManager();
    if (mounted) {
      setState(() {
        _isAdmin = isAdmin;
      });
    }
  }

  Future<void> _handleStoreModeToggle(bool value) async {
    if (value) {
      if (!_isAdmin) {
        final result = await Navigator.of(context).push<bool>(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
        if (result == true) {
          _checkAdminStatus();
        }
      }
    } else {
      await AuthService.signOut();
      if (mounted) {
        setState(() {
          _isAdmin = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final localeNotifier = Provider.of<AppLocaleNotifier>(context);
    final bool isBengali = localeNotifier.locale?.languageCode == 'bn';

    return Drawer(
      backgroundColor: AppColors.surfaceDefault,
      child: SafeArea(
        child: Column(
          children: [
            // Header: Clean Branded Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(AppSpacing.space6, AppSpacing.space8, AppSpacing.space6, AppSpacing.space6),
              decoration: BoxDecoration(
                color: AppColors.primarySubtle,
                border: const Border(
                  bottom: BorderSide(color: AppColors.borderDefault),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: AppSpacing.space16,
                        height: AppSpacing.space16,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.surfaceDefault,
                          boxShadow: AppShadows.elevation1,
                          border: Border.all(color: AppColors.primaryDefault, width: 2),
                        ),
                        child: const Icon(Icons.person_rounded, color: AppColors.primaryDefault, size: AppSpacing.space8),
                      ),
                      const SizedBox(width: AppSpacing.space4),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isAdmin ? 'Lucky Admin' : 'Ahmed Hossain',
                              style: AppTextStyles.headingMd,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _isAdmin ? 'Store Manager' : '+880 1xxx-xxxxxx',
                              style: AppTextStyles.bodySm,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      const Icon(Icons.location_on_rounded, color: AppColors.primaryDefault, size: 16),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Gulshan 1, Dhaka',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  // Language Toggle
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.backgroundSubtle,
                        borderRadius: AppRadius.borderFull,
                        border: Border.all(color: AppColors.borderDefault),
                      ),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _LanguagePill(
                          label: 'English',
                          isActive: !isBengali,
                          onTap: () => localeNotifier.setLocale(const Locale('en')),
                        ),
                        _LanguagePill(
                          label: 'বাংলা',
                          isActive: isBengali,
                          onTap: () => localeNotifier.setLocale(const Locale('bn')),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Menu Items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 12),
                children: [
                  // Store Mode Toggle (Admin Exclusive Look)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Container(
                      decoration: BoxDecoration(
                        color: _isAdmin ? AppColors.warningSubtle : AppColors.backgroundSubtle,
                        borderRadius: AppRadius.borderLg,
                        border: Border.all(
                          color: _isAdmin ? AppColors.warningDefault.withValues(alpha: 0.3) : AppColors.borderDefault,
                        ),
                      ),
                      child: SwitchListTile(
                        title: Text(
                          'Store Mode', 
                          style: AppTextStyles.labelLg.copyWith(
                            color: _isAdmin ? AppColors.warningDark : AppColors.textPrimary,
                          ),
                        ),
                        subtitle: Text('Admin ops & aisle map', style: AppTextStyles.bodySmall),
                        value: _isAdmin,
                        activeColor: AppColors.warningDefault,
                        onChanged: _handleStoreModeToggle,
                        secondary: Icon(
                          Icons.admin_panel_settings_rounded, 
                          color: _isAdmin ? AppColors.warningDefault : AppColors.textMuted,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  
                  if (_isAdmin) ...[
                    _DrawerMenuItem(
                      icon: Icons.dashboard_customize_rounded, 
                      label: 'Manager Dashboard',
                      iconColor: AppColors.primaryDefault,
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const ManagerDashboardScreen()),
                        );
                      },
                    ),
                    _DrawerMenuItem(
                      icon: Icons.point_of_sale_rounded, 
                      label: 'POS System',
                      iconColor: AppColors.warningDefault,
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).pushNamed('/pos-login');
                      },
                    ),
                    _DrawerMenuItem(
                      icon: Icons.upload_file_rounded, 
                      label: 'Import Inventory',
                      iconColor: AppColors.secondaryDefault,
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const InventoryImportScreen()),
                        );
                      },
                    ),
                    _DrawerMenuItem(
                      icon: Icons.print_rounded, 
                      label: 'Label Printer (M102)',
                      iconColor: AppColors.secondaryDefault,
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const LabelPrintScreen()),
                        );
                      },
                    ),
                    _DrawerMenuItem(
                      icon: Icons.map_rounded, 
                      label: 'Aisle Map View',
                      iconColor: AppColors.primaryDefault,
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const StoreModeScreen()),
                        );
                      },
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                      child: Divider(color: AppColors.borderDefault),
                    ),
                  ],

                  const _DrawerMenuItem(
                    icon: Icons.workspace_premium_rounded,
                    label: 'Lucky Club',
                    subtitle: 'Exclusive rewards for you',
                    iconColor: AppColors.warningDefault,
                    showBadge: true,
                    badgeLabel: 'GOLD',
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                    child: Divider(color: AppColors.borderDefault),
                  ),
                  const _DrawerMenuItem(icon: Icons.storefront_rounded, label: 'All Stores'),
                  const _DrawerMenuItem(icon: Icons.local_offer_rounded, label: 'Offers & Deals', iconColor: AppColors.dangerDefault),
                  const _DrawerMenuItem(icon: Icons.confirmation_number_rounded, label: 'My Coupons'),
                  const _DrawerMenuItem(icon: Icons.favorite_rounded, label: 'Favorites', iconColor: AppColors.dangerDefault),
                  
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                    child: Divider(color: AppColors.borderDefault),
                  ),
                  const _DrawerMenuItem(icon: Icons.receipt_long_rounded, label: 'Order History'),
                  const _DrawerMenuItem(icon: Icons.account_balance_wallet_rounded, label: 'Payment History'),
                  const _DrawerMenuItem(
                    icon: Icons.monetization_on_rounded, 
                    label: 'Lucky Wallet', 
                    subtitle: '50 coins available',
                    iconColor: AppColors.warningDefault,
                  ),
                  
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                    child: Divider(color: AppColors.borderDefault),
                  ),
                  const _DrawerMenuItem(icon: Icons.headset_mic_rounded, label: 'Premium Care'),
                  const _DrawerMenuItem(icon: Icons.help_outline_rounded, label: 'Help & FAQ'),
                ],
              ),
            ),

            // Footer: App version
            Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Lucky Store v1.2.0 • Build 104',
                style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguagePill extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _LanguagePill({required this.label, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? AppColors.surfaceDefault : Colors.transparent,
          borderRadius: AppRadius.borderFull,
          boxShadow: isActive ? AppShadows.elevation1 : null,
        ),
        child: Text(
          label,
          style: AppTextStyles.labelMd.copyWith(
            color: isActive ? AppColors.primaryDefault : AppColors.textSecondary,
            fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _DrawerMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final Color? iconColor;
  final bool showBadge;
  final String? badgeLabel;
  final VoidCallback? onTap;

  const _DrawerMenuItem({
    required this.icon,
    required this.label,
    this.subtitle,
    this.iconColor,
    this.showBadge = false,
    this.badgeLabel,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 2),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: (iconColor ?? AppColors.textSecondary).withValues(alpha: 0.1),
          borderRadius: AppRadius.borderMd,
        ),
        child: Icon(icon, color: iconColor ?? AppColors.textSecondary, size: 22),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(label, style: AppTextStyles.labelLg),
          ),
          if (showBadge && badgeLabel != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.warningDefault, AppColors.warningDark],
                ),
                borderRadius: AppRadius.borderFull,
              ),
              child: Text(
                badgeLabel!, 
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900),
              ),
            ),
        ],
      ),
      subtitle: subtitle != null
          ? Text(subtitle!, style: AppTextStyles.bodySm)
          : null,
      trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.borderStrong, size: 18),
      onTap: onTap ?? () {},
    );
  }
}
