import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';

/// Product search bar with debounce and barcode scanner button
class ProductSearchBar extends StatefulWidget {
  final ValueChanged<String> onSearch;
  final VoidCallback? onScanTap;
  final String? hintText;
  final Duration debounceDuration;

  const ProductSearchBar({
    super.key,
    required this.onSearch,
    this.onScanTap,
    this.hintText,
    this.debounceDuration = const Duration(milliseconds: 300),
  });

  @override
  State<ProductSearchBar> createState() => _ProductSearchBarState();
}

class _ProductSearchBarState extends State<ProductSearchBar> {
  final TextEditingController _controller = TextEditingController();
  Timer? _debounceTimer;
  int _requestId = 0;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _controller.removeListener(_onTextChanged);
    _controller.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    _debounceTimer?.cancel();
    _requestId++;
    final currentRequestId = _requestId;
    final query = _controller.text.trim();

    _debounceTimer = Timer(widget.debounceDuration, () {
      // Only trigger if this is still the latest request
      if (currentRequestId == _requestId) {
        widget.onSearch(query);
      }
    });
  }

  void clear() {
    _controller.clear();
    widget.onSearch('');
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 400;

    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.backgroundSubtle,
        borderRadius: AppRadius.borderMd,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: TextField(
        controller: _controller,
        style: AppTextStyles.bodyMd,
        decoration: InputDecoration(
          hintText: widget.hintText ??
              (isSmallScreen ? 'Search...' : 'Search products, SKU...'),
          hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textMuted),
          prefixIcon: const Icon(
            Icons.search_rounded,
            color: AppColors.primaryDefault,
            size: 20,
          ),
          suffixIcon: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_controller.text.isNotEmpty)
                IconButton(
                  icon: const Icon(
                    Icons.close_rounded,
                    color: AppColors.textMuted,
                    size: 18,
                  ),
                  onPressed: clear,
                ),
              if (widget.onScanTap != null)
                IconButton(
                  icon: const Icon(
                    Icons.qr_code_scanner_rounded,
                    color: AppColors.primaryDefault,
                    size: 20,
                  ),
                  onPressed: widget.onScanTap,
                ),
            ],
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }
}
