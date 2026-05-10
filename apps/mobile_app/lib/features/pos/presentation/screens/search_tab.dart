import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../shared/providers/pos_provider.dart';
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
  List<PosItem> _results = [];
  bool _searching = false;
  String? _error;

  Future<void> _doSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _results = [];
        _searching = false;
        _error = null;
      });
      return;
    }
    setState(() { _searching = true; _error = null; });
    final pos = context.read<PosProvider>();
    try {
      final items = await pos.searchItems(query.trim());
      if (!mounted) return;
      setState(() {
        _results = items;
        _searching = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Search failed. Please try again.';
        _searching = false;
      });
    }
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
                onChanged: (v) {
                  setState(() => _query = v);
                  if (v.trim().isEmpty) {
                    setState(() => _results = []);
                  }
                },
                onSubmitted: (v) => _doSearch(v),
                decoration: InputDecoration(
                  hintText: 'Search products, brands, SKUs...',
                  hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                  prefixIcon: const Icon(Icons.search, color: AppColors.primaryDefault),
                  suffixIcon: _query.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: AppColors.textSecondary),
                          onPressed: () {
                            _controller.clear();
                            setState(() {
                              _query = '';
                              _results = [];
                            });
                          },
                        )
                      : IconButton(
                          icon: const Icon(Icons.arrow_forward, color: AppColors.primaryDefault),
                          onPressed: () => _doSearch(_query),
                        ),
                  border: InputBorder.none,
                  contentPadding: AppSpacing.insetMd,
                ),
              ),
            ),
            const SizedBox(height: 20),

            if (_searching)
              const Expanded(
                child: Center(child: CircularProgressIndicator(color: AppColors.primaryDefault)),
              )
            else if (_error != null)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.error_outline, color: AppColors.dangerDefault, size: 64),
                      const SizedBox(height: AppSpacing.space3),
                      Text(
                        _error!,
                        style: AppTextStyles.bodyMd.copyWith(color: AppColors.dangerDefault),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              )
            else if (_query.isEmpty)
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
                        'No products found. Try a different search.',
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
                    final item = _results[i];
                    return ProductCard(
                      item: item,
                      originalPrice: item.price * 1.15,
                      weight: '${item.qtyOnHand} in stock',
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
