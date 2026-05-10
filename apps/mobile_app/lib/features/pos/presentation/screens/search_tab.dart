import 'package:flutter/material.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../../models/pos_models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';

class SearchTab extends StatefulWidget {
  const SearchTab({super.key});

  @override
  State<SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends State<SearchTab> {
  final TextEditingController _controller = TextEditingController();
  String _query = '';

  // Simulated flat product catalog for fuzzy/local search
  static const _catalog = [
    {'sku': 'SK-001', 'name': 'Miniket Rice', 'price': 340.0, 'original': 380.0, 'weight': '5 kg'},
    {'sku': 'SK-002', 'name': 'Soyabean Oil - Fresh', 'price': 185.0, 'original': 200.0, 'weight': '2 L'},
    {'sku': 'SK-003', 'name': 'Red Onion Premium', 'price': 55.0, 'original': 70.0, 'weight': '1 kg'},
    {'sku': 'SK-004', 'name': 'Lentil Dal Masoor', 'price': 120.0, 'original': 130.0, 'weight': '500 g'},
    {'sku': 'SK-005', 'name': 'Broiler Chicken Fresh', 'price': 210.0, 'original': 230.0, 'weight': '1 kg'},
    {'sku': 'SK-006', 'name': 'Radhuni Turmeric', 'price': 40.0, 'original': 50.0, 'weight': '200 g'},
    {'sku': 'SK-007', 'name': 'Full Cream Milk', 'price': 75.0, 'original': 80.0, 'weight': '1 L'},
    {'sku': 'SK-008', 'name': 'Plain Yogurt', 'price': 60.0, 'original': 65.0, 'weight': '400 g'},
  ];

  // Basic fuzzy match: checks if all characters in query appear in order in name
  bool _fuzzyMatch(String name, String query) {
    if (query.isEmpty) return false;
    final n = name.toLowerCase();
    final q = query.toLowerCase();
    int qi = 0;
    for (int i = 0; i < n.length && qi < q.length; i++) {
      if (n[i] == q[qi]) qi++;
    }
    return qi == q.length;
  }

  List<Map<String, Object>> get _results {
    if (_query.isEmpty) return [];
    return _catalog
        .where((p) => _fuzzyMatch(p['name'] as String, _query))
        .toList();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Dominant search bar
            Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceDefault,
                borderRadius: AppRadius.borderMd,
                boxShadow: AppShadows.elevation1,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: TextField(
                controller: _controller,
                autofocus: true,
                style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
                onChanged: (v) => setState(() => _query = v),
                decoration: InputDecoration(
                  hintText: 'Search... (fuzzy matching)',
                  hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                  prefixIcon: const Icon(Icons.search, color: AppColors.primaryDefault),
                  suffixIcon: _query.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: AppColors.textSecondary),
                          onPressed: () {
                            _controller.clear();
                            setState(() => _query = '');
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: AppSpacing.insetMd,
                ),
              ),
            ),
            const SizedBox(height: 20),

            if (_query.isEmpty)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.search, color: AppColors.textSecondary, size: 64),
                      const SizedBox(height: AppSpacing.space3),
                      Text(
                        'Start typing to find products',
                        style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              )
            else if (_results.isEmpty)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.search_off, color: AppColors.textSecondary, size: 64),
                      const SizedBox(height: AppSpacing.space3),
                      Text(
                        'No products found. Try a different spelling.',
                        style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              )
            else
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.65,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: _results.length,
                  itemBuilder: (context, i) {
                    final p = _results[i];
                    return ProductCard(
                      item: PosItem(
                        id: p['sku'] as String,
                        sku: p['sku'] as String,
                        name: p['name'] as String,
                        price: p['price'] as double,
                      ),
                      originalPrice: p['original'] as double,
                      weight: p['weight'] as String,
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
