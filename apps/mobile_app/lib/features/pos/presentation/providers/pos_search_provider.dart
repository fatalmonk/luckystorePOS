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

  PosSearchProvider(this._posProvider);

  PosSearchState get state => _state;
  List<PosItem> get items => _state.items;
  List<PosCategory> get categories => _state.categories;
  String? get selectedCategoryId => _state.selectedCategoryId;
  String get searchQuery => _state.searchQuery;
  PosLoadState get loadState => _state.loadState;
  String? get loadError => _state.loadError;
  bool get allowProductAdd => _state.allowProductAdd;

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
        items: catalog.items,
        categories: catalog.categories,
        loadState: catalog.hasError 
            ? PosLoadState.error 
            : (catalog.items.isEmpty ? PosLoadState.empty : PosLoadState.ready),
        loadError: catalog.error,
        allowProductAdd: !catalog.hasError,
      );
    } catch (e) {
      _state = _state.copyWith(
        loadState: PosLoadState.error,
        loadError: _cleanError(e),
        allowProductAdd: false,
      );
    }
    notifyListeners();
  }

  /// Search items with query and optional category filter
  Future<void> search(String query, {String? categoryId}) async {
    if (query == _state.searchQuery && categoryId == _state.selectedCategoryId) return;
    
    _state = _state.copyWith(
      loadState: PosLoadState.loading,
      searchQuery: query,
      selectedCategoryId: categoryId,
      clearLoadError: true,
    );
    notifyListeners();

    try {
      final items = await _posProvider.searchItems(query, categoryId: categoryId);
      final error = _posProvider.posDebugSnapshot['last_load_error'] as String?;
      
      _state = _state.copyWith(
        items: items,
        loadState: error != null 
            ? PosLoadState.error 
            : (items.isEmpty ? PosLoadState.empty : PosLoadState.ready),
        loadError: error,
        allowProductAdd: error == null,
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
    await search(_state.searchQuery, categoryId: categoryId);
  }

  /// Clear search query
  Future<void> clearSearch() async {
    if (_state.searchQuery.isEmpty) return;
    await search('', categoryId: _state.selectedCategoryId);
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
