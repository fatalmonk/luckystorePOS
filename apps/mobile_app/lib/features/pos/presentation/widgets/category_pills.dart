import 'package:flutter/material.dart';
import '../../../../models/pos_models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';

/// An immersive, beautifully-styled category selection widget
/// for high-density cashier POS layouts.
/// 
/// Features smooth micro-animations, clean visual hierarchy, and 
/// intuitive horizontal scroll fades.
class CategoryPills extends StatefulWidget {
  final List<PosCategory> categories;
  final String? selectedCategoryId;
  final ValueChanged<String?> onCategorySelected;

  const CategoryPills({
    super.key,
    required this.categories,
    required this.selectedCategoryId,
    required this.onCategorySelected,
  });

  @override
  State<CategoryPills> createState() => _CategoryPillsState();
}

class _CategoryPillsState extends State<CategoryPills> {
  final ScrollController _scrollController = ScrollController();
  bool _showLeftShadow = false;
  bool _showRightShadow = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_scrollListener);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_scrollListener);
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollListener() {
    if (!_scrollController.hasClients) return;
    
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    
    setState(() {
      _showLeftShadow = currentScroll > 5;
      _showRightShadow = currentScroll < maxScroll - 5;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 60,
      decoration: const BoxDecoration(
        color: AppColors.surfaceDefault,
        border: Border(bottom: BorderSide(color: AppColors.borderDefault, width: 1)),
      ),
      child: Stack(
        children: [
          // The Pill list itself
          ListView.builder(
            controller: _scrollController,
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            itemCount: widget.categories.length + 1,
            itemBuilder: (context, index) {
              if (index == 0) {
                // "All Products" Pill
                final isSelected = widget.selectedCategoryId == null;
                return _buildPill(
                  label: 'All Products',
                  isSelected: isSelected,
                  onTap: () => widget.onCategorySelected(null),
                );
              }
              
              final category = widget.categories[index - 1];
              final isSelected = widget.selectedCategoryId == category.id;
              
              return _buildPill(
                label: category.name,
                isSelected: isSelected,
                count: category.itemCount,
                onTap: () => widget.onCategorySelected(category.id),
              );
            },
          ),
          
          // Left horizontal scroll edge fade shadow
          if (_showLeftShadow)
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 24,
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [
                        AppColors.surfaceDefault,
                        AppColors.surfaceDefault.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            
          // Right horizontal scroll edge fade shadow
          if (_showRightShadow && widget.categories.isNotEmpty)
            Positioned(
              right: 0,
              top: 0,
              bottom: 0,
              width: 24,
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerRight,
                      end: Alignment.centerLeft,
                      colors: [
                        AppColors.surfaceDefault,
                        AppColors.surfaceDefault.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPill({
    required String label,
    required bool isSelected,
    int? count,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.borderFull,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppColors.primaryDefault
                  : AppColors.backgroundSubtle,
              borderRadius: AppRadius.borderFull,
              border: Border.all(
                color: isSelected ? AppColors.primaryDefault : AppColors.borderDefault,
                width: 1,
              ),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: AppColors.primaryDefault.withValues(alpha: 0.25),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      )
                    ]
                  : null,
            ),
            alignment: Alignment.center,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: AppTextStyles.labelSm.copyWith(
                    color: isSelected ? AppColors.primaryOn : AppColors.textSecondary,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  ),
                ),
                if (count != null && count > 0) ...[
                  const SizedBox(width: 6),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isSelected 
                          ? Colors.white.withValues(alpha: 0.25)
                          : AppColors.borderDefault,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$count',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? AppColors.primaryOn : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
