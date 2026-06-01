import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../../../models/pos_models.dart';
import '../../../../shared/providers/pos_provider.dart';

/// Search state for POS screen
@immutable
class PosSearchState {
  final List<PosItem> items;
  final List<PosCategory> categories;
  final String? selectedCategoryId;
  final String searchQuery;
  final PosLoadState loadState;
  final String? loadError;
  final bool allowProductAdd;

  const PosSearchState({
    this.items = const [],
    this.categories = const [],
    this.selectedCategoryId,
    this.searchQuery = '',
    this.loadState = PosLoadState.loading,
    this.loadError,
    this.allowProductAdd = true,
  });

  PosSearchState copyWith({
    List<PosItem>? items,
    List<PosCategory>? categories,
    String? selectedCategoryId,
    String? searchQuery,
    PosLoadState? loadState,
    String? loadError,
    bool? allowProductAdd,
    bool clearSelectedCategory = false,
    bool clearLoadError = false,
  }) {
    return PosSearchState(
      items: items ?? this.items,
      categories: categories ?? this.categories,
      selectedCategoryId: clearSelectedCategory ? null : (selectedCategoryId ?? this.selectedCategoryId),
      searchQuery: searchQuery ?? this.searchQuery,
      loadState: loadState ?? this.loadState,
      loadError: clearLoadError ? null : (loadError ?? this.loadError),
      allowProductAdd: allowProductAdd ?? this.allowProductAdd,
    );
  }
}

/// ChangeNotifier for POS search state
/// 
/// Usage:
/// ```dart
/// ChangeNotifierProvider(
///   create: (_) => PosSearchProvider(posProvider),
///   child: ...
/// )
/// ```
class PosSearchProvider extends ChangeNotifier {
  final PosProvider _posProvider;
  PosSearchState _state = const PosSearchState();
  Timer? _debounceTimer;

  PosSearchProvider(this._posProvider);

  PosProvider get posProvider => _posProvider;

  PosSearchState get state => _state;
  List<PosItem> get items => _state.items;
  List<PosCategory> get categories => _state.categories;
  String? get selectedCategoryId => _state.selectedCategoryId;
  String get searchQuery => _state.searchQuery;
  PosLoadState get loadState => _state.loadState;
  String? get loadError => _state.loadError;
  bool get allowProductAdd => _state.allowProductAdd;

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }

  /// Initialize search with catalog data
  Future<void> initialize() async {
    _state = _state.copyWith(loadState: PosLoadState.loading, clearLoadError: true);
    notifyListeners();
    
    try {
      final catalog = await _posProvider.loadProductCatalog(
        query: _state.searchQuery,
        categoryId: _state.selectedCategoryId,
      );
      
      _state = _state.copyWith(
        items: catalog.hasError ? const [] : catalog.items,
        categories: catalog.hasError ? const [] : catalog.categories,
        loadState: catalog.hasError 
            ? PosLoadState.error 
            : (catalog.items.isEmpty ? PosLoadState.empty : PosLoadState.ready),
        loadError: catalog.error,
        allowProductAdd: !catalog.hasError,
      );
    } catch (e) {
      _state = _state.copyWith(
        items: const [],
        categories: const [],
        loadState: PosLoadState.error,
        loadError: _cleanError(e),
        allowProductAdd: false,
      );
    }
    notifyListeners();
  }

  /// Search items with query and optional category filter (debounced)
  Future<void> search(String query, {String? categoryId, bool immediate = false}) async {
    if (query == _state.searchQuery && categoryId == _state.selectedCategoryId) return;
    
    _debounceTimer?.cancel();

    _state = _state.copyWith(
      searchQuery: query,
      selectedCategoryId: categoryId,
    );

    if (immediate) {
      await _executeSearch(query, categoryId);
    } else {
      _debounceTimer = Timer(const Duration(milliseconds: 250), () {
        _executeSearch(query, categoryId);
      });
    }
  }

  Future<void> _executeSearch(String query, String? categoryId) async {
    _state = _state.copyWith(
      loadState: PosLoadState.loading,
      clearLoadError: true,
    );
    notifyListeners();

    try {
      final items = await _posProvider.searchItems(query, categoryId: categoryId);
      
      _state = _state.copyWith(
        items: items,
        loadState: items.isEmpty ? PosLoadState.empty : PosLoadState.ready,
        loadError: null,
        allowProductAdd: true,
      );
    } catch (e) {
      _state = _state.copyWith(
        items: const [],
        loadState: PosLoadState.error,
        loadError: _cleanError(e),
        allowProductAdd: false,
      );
    }
    notifyListeners();
  }

  /// Set selected category and refresh search
  Future<void> setCategory(String? categoryId) async {
    if (categoryId == _state.selectedCategoryId) return;
    await search(_state.searchQuery, categoryId: categoryId, immediate: true);
  }

  /// Clear search query
  Future<void> clearSearch() async {
    if (_state.searchQuery.isEmpty) return;
    await search('', categoryId: _state.selectedCategoryId, immediate: true);
  }

  /// Retry loading after error
  Future<void> retry() async {
    await initialize();
  }

  String _cleanError(Object e) {
    final msg = e.toString();
    if (msg.contains('socket') || msg.contains('timed out') || msg.contains('connection')) {
      return 'Network error. Check your connection.';
    }
    if (msg.contains('permission') || msg.contains('denied') || msg.contains('403')) {
      return 'Access denied. Contact admin.';
    }
    return msg.replaceFirst('Exception: ', '');
  }
}
