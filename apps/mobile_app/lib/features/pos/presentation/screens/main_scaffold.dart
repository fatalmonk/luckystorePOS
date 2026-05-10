import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../shared/widgets/floating_checkout_bar.dart';
import '../../../../shared/widgets/side_drawer.dart';
import './home_screen.dart';
import './categories_tab.dart';
import './search_tab.dart';

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;

  static const List<Widget> _pages = [
    HomeScreen(),
    CategoriesTab(),
    SearchTab(),
  ];

  static const List<String> _titles = ['Lucky Store', 'Categories', 'Search'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(
        title: Text(
          _titles[_currentIndex],
          style: AppTextStyles.headingLg.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.backgroundDefault,
        elevation: 0,
        centerTitle: true,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: AppColors.textPrimary),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded, color: AppColors.textPrimary), 
            onPressed: () {}
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: AppColors.borderDefault,
            height: 1,
          ),
        ),
      ),
      drawer: const SideDrawer(),
      body: Stack(
        children: [
          _pages[_currentIndex],
          const FloatingCheckoutBar(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceDefault,
          boxShadow: AppShadows.elevation3,
          border: const Border(top: BorderSide(color: AppColors.borderDefault)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: AppColors.surfaceDefault,
          selectedItemColor: AppColors.primaryDefault,
          unselectedItemColor: AppColors.textMuted,
          selectedLabelStyle: AppTextStyles.labelSm.copyWith(fontWeight: FontWeight.bold),
          unselectedLabelStyle: AppTextStyles.labelSm,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_outlined),
              activeIcon: Icon(Icons.grid_view_rounded),
              label: 'Categories',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.search_outlined),
              activeIcon: Icon(Icons.search_rounded),
              label: 'Search',
            ),
          ],
        ),
      ),
    );
  }
}
