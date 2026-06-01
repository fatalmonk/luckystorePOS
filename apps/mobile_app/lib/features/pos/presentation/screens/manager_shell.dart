import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/providers/auth_provider.dart';
import './pos_main_screen.dart';
import './manager_dashboard_screen.dart';
import '../../../inventory/presentation/screens/inventory_import_screen.dart';
import './label_print_screen.dart';
import '../../../collections/presentation/screens/overdue_customers_screen.dart';
import '../../../purchase/presentation/screens/purchase_receiving_screen.dart';
import '../../../ledger/presentation/screens/customer_ledger_screen.dart';
import '../../../ledger/presentation/screens/supplier_ledger_screen.dart';
import '../../../finance/presentation/screens/daily_expenditures_screen.dart';

/// Top-level shell for manager and admin users.
///
/// Provides a [NavigationRail] on landscape/tablet orientations and a
/// [BottomNavigationBar] on portrait/phone orientations. The four tabs give
/// access to the complete suite of management features:
///
///   0 — POS        : Launch or resume the cashier POS session
///   1 — Dashboard  : ManagerDashboardScreen (sales KPIs, sessions)
///   2 — Inventory  : InventoryImportScreen (CSV/XLSX bulk upload)
///   3 — Labels     : LabelPrintScreen (M102 label printing)
class ManagerShell extends StatefulWidget {
  const ManagerShell({super.key});

  @override
  State<ManagerShell> createState() => _ManagerShellState();
}

class _ManagerShellState extends State<ManagerShell> {
  int _selectedIndex = 0;

  // Tab definitions — order matters; index must match the nav items below.
  static const _tabs = [
    _TabDef(label: 'POS',           icon: Icons.point_of_sale_outlined, activeIcon: Icons.point_of_sale),
    _TabDef(label: 'Dashboard',     icon: Icons.dashboard_outlined,      activeIcon: Icons.dashboard),
    _TabDef(label: 'Inventory',     icon: Icons.upload_file_outlined,    activeIcon: Icons.upload_file),
    _TabDef(label: 'Labels',        icon: Icons.print_outlined,          activeIcon: Icons.print),
    _TabDef(label: 'Dues',          icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet),
    _TabDef(label: 'Purchase',      icon: Icons.shopping_basket_outlined, activeIcon: Icons.shopping_basket),
    _TabDef(label: 'Cust Ledger',   icon: Icons.people_outlined,          activeIcon: Icons.people),
    _TabDef(label: 'Supp Ledger',   icon: Icons.business_outlined,       activeIcon: Icons.business),
    _TabDef(label: 'Expenses',      icon: Icons.receipt_long_outlined,    activeIcon: Icons.receipt_long),
  ];

  // Lazily-built page widgets — keeps page state alive across tab switches.
  late final List<Widget> _pages = [
    const PosMainScreen(),
    const ManagerDashboardScreen(),
    const InventoryImportScreen(),
    const LabelPrintScreen(),
    const OverdueCustomersScreen(),
    const PurchaseReceivingScreen(),
    const CustomerLedgerScreen(),
    const SupplierLedgerScreen(),
    const DailyExpendituresScreen(),
  ];

  void _onTabSelected(int index) {
    if (index == _selectedIndex) return;
    setState(() => _selectedIndex = index);
  }

  Future<void> _handleSignOut(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.primitiveNeutral800,
        title: Text('Sign Out',
            style: AppTextStyles.headingMd.copyWith(color: AppColors.primitiveNeutral0)),
        content: Text(
            'Are you sure you want to sign out of the manager portal?',
            style: AppTextStyles.bodyMd.copyWith(color: AppColors.primitiveNeutral400)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: AppTextStyles.labelMd.copyWith(color: AppColors.primitiveNeutral400)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDefault,
              foregroundColor: AppColors.primaryOn,
              elevation: 0,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Sign Out', style: AppTextStyles.labelMd.copyWith(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await context.read<AuthProvider>().signOut();
      // AuthGate rebuilds to StaffPinLoginScreen automatically.
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: OrientationBuilder(
        builder: (context, orientation) {
          final isLandscape = orientation == Orientation.landscape;
          return isLandscape
              ? _buildLandscapeLayout(context)
              : _buildPortraitLayout(context);
        },
      ),
    );
  }

  // ── Landscape: NavigationRail ─────────────────────────────────────────────

  Widget _buildLandscapeLayout(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: AppColors.primitiveNeutral900,
      body: Row(
        children: [
          // Rail
          LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: IntrinsicHeight(
                    child: NavigationRail(
                      backgroundColor: AppColors.primitiveNeutral800,
                      selectedIndex: _selectedIndex,
                      onDestinationSelected: _onTabSelected,
                      labelType: NavigationRailLabelType.all,
                      selectedIconTheme: IconThemeData(color: AppColors.primaryDefault),
                      selectedLabelTextStyle: AppTextStyles.labelSm.copyWith(
                          color: AppColors.primaryDefault, fontWeight: FontWeight.w700),
                      unselectedIconTheme:
                          IconThemeData(color: AppColors.primitiveNeutral400),
                      unselectedLabelTextStyle: AppTextStyles.labelSm.copyWith(
                          color: AppColors.primitiveNeutral400),
                      leading: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Column(
                          children: [
                            // Store pill
                            Container(
                              width: 44, height: 44,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                    colors: [AppColors.primaryDefault, AppColors.primaryHover]),
                                borderRadius: AppRadius.borderSm,
                              ),
                              child: Icon(Icons.store_rounded,
                                  color: AppColors.primaryOn, size: 22),
                            ),
                            const SizedBox(height: 8),
                            // Manager name chip
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primitiveNeutral0.withValues(alpha: 0.07),
                                borderRadius: AppRadius.borderXs,
                              ),
                              child: Text(
                                auth.appUser?.name.split(' ').first ?? 'Manager',
                                style: AppTextStyles.labelXs.copyWith(
                                    color: AppColors.primitiveNeutral400, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                      ),
                      trailing: Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: IconButton(
                          tooltip: 'Sign Out',
                          icon: Icon(Icons.logout_rounded,
                              color: AppColors.primitiveNeutral400),
                          onPressed: () => _handleSignOut(context),
                        ),
                      ),
                      destinations: _tabs
                          .map((t) => NavigationRailDestination(
                                icon: Icon(t.icon),
                                selectedIcon: Icon(t.activeIcon),
                                label: Text(t.label),
                              ))
                          .toList(),
                    ),
                  ),
                ),
              );
            },
          ),
          // Vertical divider
          Container(width: 1, color: AppColors.primitiveNeutral600.withValues(alpha: 0.2)),
          // Page content
          Expanded(child: _pages[_selectedIndex]),
        ],
      ),
    );
  }

  // ── Portrait: AppBar + BottomNav ──────────────────────────────────────────

  Widget _buildPortraitLayout(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: AppColors.primitiveNeutral900,
      appBar: AppBar(
        backgroundColor: AppColors.primitiveNeutral800,
        elevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                    colors: [AppColors.primaryDefault, AppColors.primaryHover]),
                borderRadius: AppRadius.borderXs,
              ),
              child: Icon(Icons.store_rounded,
                  color: AppColors.primaryOn, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Lucky Store',
                      style: AppTextStyles.labelLg.copyWith(
                          color: AppColors.primitiveNeutral0, fontWeight: FontWeight.w700)),
                  Text(
                    '${auth.appUser?.name ?? 'Manager'} · ${auth.appUser?.role.toUpperCase() ?? ''}',
                    style: AppTextStyles.labelXs.copyWith(
                        color: AppColors.primitiveNeutral400),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Sign Out',
            icon: Icon(Icons.logout_rounded,
                color: AppColors.primitiveNeutral400, size: 22),
            onPressed: () => _handleSignOut(context),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.primitiveNeutral800,
          border: Border(
              top: BorderSide(color: AppColors.primitiveNeutral600.withValues(alpha: 0.2))),
          boxShadow: [
            BoxShadow(
              color: AppColors.primitiveNeutral900.withValues(alpha: 0.4),
              blurRadius: 12,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: _onTabSelected,
          backgroundColor: Colors.transparent,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.primaryDefault,
          unselectedItemColor: AppColors.primitiveNeutral400,
          selectedLabelStyle: AppTextStyles.labelXs.copyWith(fontWeight: FontWeight.w700),
          unselectedLabelStyle: AppTextStyles.labelXs,
          items: _tabs
              .map((t) => BottomNavigationBarItem(
                    icon: Icon(t.icon),
                    activeIcon: Icon(t.activeIcon),
                    label: t.label,
                  ))
              .toList(),
        ),
      ),
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Helper data class
// ─────────────────────────────────────────────────────────────────────────────

class _TabDef {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  const _TabDef({required this.label, required this.icon, required this.activeIcon});
}
