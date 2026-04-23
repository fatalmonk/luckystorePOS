import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../main.dart'; // AppLocaleNotifier
import '../screens/login_screen.dart';
import '../screens/store_mode.dart';
import '../screens/inventory_import_screen.dart';
import '../screens/pos/manager_dashboard_screen.dart';
import '../screens/pos/label_print_screen.dart';
import '../services/auth_service.dart';

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
      // Trying to turn ON Store Mode
      if (!_isAdmin) {
        // Show login
        final result = await Navigator.of(context).push<bool>(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
        if (result == true) {
          _checkAdminStatus();
        }
      }
    } else {
      // Turning OFF Store Mode
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
      backgroundColor: AppTheme.backgroundElevated,
      child: SafeArea(
        child: Column(
          children: [
            // Header: Avatar + Address + Language Toggle
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primaryAccent, Color(0xFF6A1B9A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // User Avatar
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.2),
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(Icons.person, color: Colors.white, size: 30),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isAdmin ? 'Admin User' : 'Ahmed Hossain',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _isAdmin ? 'Store Manager' : '+880 1xxx-xxxxxx',
                              style: const TextStyle(color: Colors.white70, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Delivery address indicator
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, color: Colors.white70, size: 16),
                      const SizedBox(width: 6),
                      const Expanded(
                        child: Text(
                          'Gulshan 1, Dhaka',
                          style: TextStyle(color: Colors.white, fontSize: 13),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Language toggle pill: EN / বাং
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      padding: const EdgeInsets.all(3),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _LanguagePill(
                            label: 'EN',
                            isActive: !isBengali,
                            onTap: () => localeNotifier.setLocale(const Locale('en')),
                          ),
                          _LanguagePill(
                            label: 'বাং',
                            isActive: isBengali,
                            onTap: () => localeNotifier.setLocale(const Locale('bn')),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Menu Items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  // Store Mode Toggle
                  SwitchListTile(
                    title: const Text('Store Mode', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Admin ops & aisle map', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                    value: _isAdmin,
                    activeColor: Colors.amber,
                    onChanged: _handleStoreModeToggle,
                    secondary: const Icon(Icons.admin_panel_settings, color: Colors.amber),
                  ),
                  const Divider(color: AppTheme.shadowLight, indent: 16, endIndent: 16),
                  
                  if (_isAdmin) ...[
                    _DrawerMenuItem(
                      icon: Icons.dashboard_customize_rounded, 
                      label: 'Manager Dashboard',
                      iconColor: Colors.blueAccent,
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
                      iconColor: Colors.amber,
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).pushNamed('/pos-login');
                      },
                    ),
                    _DrawerMenuItem(
                      icon: Icons.upload_file, 
                      label: 'Import Inventory',
                      iconColor: AppTheme.primaryAccent,
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
                      iconColor: AppTheme.primaryAccent,
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const LabelPrintScreen()),
                        );
                      },
                    ),
                    _DrawerMenuItem(
                      icon: Icons.map, 
                      label: 'Aisle Map View',
                      iconColor: AppTheme.primaryAccent,
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const StoreModeScreen()),
                        );
                      },
                    ),
                    const Divider(color: AppTheme.shadowLight, indent: 16, endIndent: 16),
                  ],

                  // Loyalty Program — top item with crown (Egg Club analogue)
                  const _DrawerMenuItem(
                    icon: Icons.workspace_premium,
                    label: 'Lucky Club',
                    subtitle: 'Your loyalty rewards',
                    iconColor: Colors.amber,
                    showBadge: true,
                    badgeLabel: 'GOLD',
                  ),
                  const Divider(color: AppTheme.shadowLight, indent: 16, endIndent: 16),
                  const _DrawerMenuItem(icon: Icons.store_outlined, label: 'All Stores'),
                  const _DrawerMenuItem(icon: Icons.local_offer_outlined, label: 'Offers & Deals'),
                  const _DrawerMenuItem(icon: Icons.confirmation_number_outlined, label: 'Coupons'),
                  const _DrawerMenuItem(icon: Icons.favorite_outline, label: 'Favorites'),
                  const Divider(color: AppTheme.shadowLight, indent: 16, endIndent: 16),
                  const _DrawerMenuItem(icon: Icons.receipt_long_outlined, label: 'Order History'),
                  const _DrawerMenuItem(icon: Icons.account_balance_wallet_outlined, label: 'Payment History'),
                  const _DrawerMenuItem(icon: Icons.monetization_on_outlined, label: 'Lucky Coins Wallet', subtitle: '50 coins available'),
                  const Divider(color: AppTheme.shadowLight, indent: 16, endIndent: 16),
                  const _DrawerMenuItem(icon: Icons.headset_mic_outlined, label: 'Premium Care'),
                  const _DrawerMenuItem(icon: Icons.report_outlined, label: 'File a Complaint'),
                  const _DrawerMenuItem(icon: Icons.help_outline, label: 'Help & FAQ'),
                ],
              ),
            ),

            // Footer: App version
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Lucky Store v1.0.0',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
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
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? AppTheme.primaryAccent : Colors.white70,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            fontSize: 13,
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
      leading: Icon(icon, color: iconColor ?? AppTheme.textSecondary, size: 24),
      title: Row(
        children: [
          Expanded(
            child: Text(label, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 15)),
          ),
          if (showBadge && badgeLabel != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Colors.amber, Colors.orange]),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(badgeLabel!, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
      subtitle: subtitle != null
          ? Text(subtitle!, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12))
          : null,
      trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary, size: 20),
      onTap: onTap ?? () {},
    );
  }
}
