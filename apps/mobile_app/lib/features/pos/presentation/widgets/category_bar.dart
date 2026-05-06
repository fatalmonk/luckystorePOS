import 'package:flutter/material.dart';
import '../../../../models/pos_models.dart';

/// Horizontal category chip bar used in the POS left panel.
class CategoryBar extends StatelessWidget {
  final List<PosCategory> categories;
  final String? selectedCategoryId;
  final ValueChanged<String?> onCategorySelected;

  const CategoryBar({
    super.key,
    required this.categories,
    required this.selectedCategoryId,
    required this.onCategorySelected,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        children: [
          _chip(
            'All',
            selected: selectedCategoryId == null,
            onTap: () => onCategorySelected(null),
          ),
          ...categories.map((c) => _chip(
                c.name,
                selected: selectedCategoryId == c.id,
                count: c.itemCount,
                onTap: () => onCategorySelected(c.id),
              )),
        ],
      ),
    );
  }

  Widget _chip(String label, {
    required bool selected,
    int? count,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFFE8B84B)
              : Colors.white.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: selected
                  ? const Color(0xFFE8B84B)
                  : Colors.white.withValues(alpha: 0.12)),
        ),
        child: Text(
          count != null ? '$label ($count)' : label,
          style: TextStyle(
              color: selected ? Colors.black : Colors.white.withValues(alpha: 0.75),
              fontSize: 12,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w400),
        ),
      ),
    );
  }
}