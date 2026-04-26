import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/app_user.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Auth status enum
// ─────────────────────────────────────────────────────────────────────────────

enum AuthStatus {
  loading,
  unauthenticated,
  cashier,
  manager,
}

/// Central authentication state for the Lucky Store POS application.
///
/// Security hardening goals:
/// - Never trust client-side hardcoded PIN/roles.
/// - Resolve staff role from backend-authenticated RPC only.
/// - Require a server-issued Supabase session token before granting access.
class AuthProvider extends ChangeNotifier {
  static final SupabaseClient _supabase = Supabase.instance.client;

  AuthStatus _status = AuthStatus.unauthenticated;
  AuthStatus get status => _status;

  AppUser? _appUser;
  AppUser? get appUser => _appUser;

  bool get isManager => _appUser?.isManager == true;
  bool get isCashier => _appUser?.isCashier == true;

  String? get supabaseAccessToken => _supabase.auth.currentSession?.accessToken;

  String? _signInError;
  String? get signInError => _signInError;

  AuthProvider() {
    _init();
  }

  void _init() {
    _status = _supabase.auth.currentSession == null
        ? AuthStatus.unauthenticated
        : AuthStatus.loading;

    if (_status == AuthStatus.loading) {
      // Existing session may be stale for POS role context; fail closed.
      signOut();
    }
  }

  void _setStatus(AuthStatus s) {
    if (_status == s) return;
    _status = s;
    notifyListeners();
  }

  Future<bool> signInWithPin(String pin) async {
    _signInError = null;
    _setStatus(AuthStatus.loading);

    try {
      // Ensure we have a server-issued JWT; anonymous auth still yields
      // an authenticated session token suitable for server-authorized RPC calls.
      if (_supabase.auth.currentSession == null) {
        await _supabase.auth.signInAnonymously();
      }

      final response = await _supabase.rpc('authenticate_staff_pin', params: {
        'p_pin': pin,
      });

      if (response == null) {
        _signInError = 'Invalid PIN. Please try again.';
        await signOut();
        return false;
      }

      final profile = response as Map<String, dynamic>;
      final role = (profile['role'] as String? ?? '').toLowerCase();
      if (role != 'cashier' && role != 'manager' && role != 'admin') {
        _signInError = 'Access role is not allowed for POS.';
        await signOut();
        return false;
      }

      _appUser = AppUser(
        id: profile['id'] as String,
        authId: profile['auth_id'] as String,
        name: profile['full_name'] as String? ?? 'User',
        role: role,
        storeId: profile['store_id'] as String? ?? '',
      );

      _setStatus(role == 'cashier' ? AuthStatus.cashier : AuthStatus.manager);
      return true;
    } catch (e) {
      debugPrint('[AuthProvider] PIN sign-in failed: $e');
      _signInError = 'Sign-in failed. Check network and try again.';
      await signOut();
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      if (_supabase.auth.currentSession != null) {
        await _supabase.auth.signOut();
      }
    } catch (e) {
      debugPrint('[AuthProvider] signOut error: $e');
    }
    _appUser = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void clearSignInError() {
    if (_signInError != null) {
      _signInError = null;
      notifyListeners();
    }
  }
}
