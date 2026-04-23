import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../pos/pos_main_screen.dart';
import '../pos/manager_dashboard_screen.dart';
import '../inventory_import_screen.dart';
import '../pos/label_print_screen.dart';

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
    _TabDef(label: 'POS',       icon: Icons.point_of_sale_outlined, activeIcon: Icons.point_of_sale),
    _TabDef(label: 'Dashboard', icon: Icons.dashboard_outlined,      activeIcon: Icons.dashboard),
    _TabDef(label: 'Inventory', icon: Icons.upload_file_outlined,    activeIcon: Icons.upload_file),
    _TabDef(label: 'Labels',    icon: Icons.print_outlined,          activeIcon: Icons.print),
  ];

  // Lazily-built page widgets — keeps page state alive across tab switches.
  late final List<Widget> _pages = [
    const PosMainScreen(),
    const ManagerDashboardScreen(),
    const InventoryImportScreen(),
    const LabelPrintScreen(),
  ];

  void _onTabSelected(int index) {
    if (index == _selectedIndex) return;
    setState(() => _selectedIndex = index);
  }

  Future<void> _handleSignOut(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('Sign Out',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: const Text(
            'Are you sure you want to sign out of the manager portal?',
            style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE8B84B),
              foregroundColor: Colors.black,
              elevation: 0,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
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
      backgroundColor: const Color(0xFF0D1117),
      body: Row(
        children: [
          // Rail
          NavigationRail(
            backgroundColor: const Color(0xFF161B22),
            selectedIndex: _selectedIndex,
            onDestinationSelected: _onTabSelected,
            labelType: NavigationRailLabelType.all,
            selectedIconTheme: const IconThemeData(color: Color(0xFFE8B84B)),
            selectedLabelTextStyle: const TextStyle(
                color: Color(0xFFE8B84B), fontWeight: FontWeight.w700, fontSize: 12),
            unselectedIconTheme:
                IconThemeData(color: Colors.white.withValues(alpha: 0.45)),
            unselectedLabelTextStyle: TextStyle(
                color: Colors.white.withValues(alpha: 0.45), fontSize: 12),
            leading: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Column(
                children: [
                  // Store pill
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [Color(0xFFE8B84B), Color(0xFFD4941A)]),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.store_rounded,
                        color: Colors.white, size: 22),
                  ),
                  const SizedBox(height: 8),
                  // Manager name chip
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      auth.appUser?.name.split(' ').first ?? 'Manager',
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w500),
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
                    color: Colors.white.withValues(alpha: 0.5)),
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
          // Vertical divider
          Container(width: 1, color: Colors.white.withValues(alpha: 0.06)),
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
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161B22),
        elevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [Color(0xFFE8B84B), Color(0xFFD4941A)]),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.store_rounded,
                  color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Lucky Store',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700)),
                  Text(
                    '${auth.appUser?.name ?? 'Manager'} · ${auth.appUser?.role.toUpperCase() ?? ''}',
                    style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5), fontSize: 11),
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
                color: Colors.white.withValues(alpha: 0.55), size: 22),
            onPressed: () => _handleSignOut(context),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF161B22),
          border: Border(
              top: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
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
          selectedItemColor: const Color(0xFFE8B84B),
          unselectedItemColor: Colors.white.withValues(alpha: 0.4),
          selectedLabelStyle: const TextStyle(
              fontSize: 11, fontWeight: FontWeight.w700),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
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
