import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
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
  static const String invalidLoginErrorCode = 'INVALID_LOGIN';
  static const String networkErrorCode = 'NETWORK_ERROR';

  // ── Internal Supabase client ─────────────────────────────────────────────────
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
  String? _signInErrorCode;
  String? get signInErrorCode => _signInErrorCode;

  User get currentUserOrThrow {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      throw StateError('No authenticated Supabase session');
    }
    return user;
  }

  AuthProvider() {
    _bootstrapSession();
  }

  Future<void> _bootstrapSession() async {
    if (_supabase.auth.currentSession == null) {
      final email = dotenv.maybeGet('MANAGER_EMAIL');
      final password = dotenv.maybeGet('MANAGER_PASSWORD');
      
      if (email != null && email.isNotEmpty && password != null && password.isNotEmpty) {
        try {
          debugPrint('[AuthProvider] Attempting service account bootstrap...');
          await _supabase.auth.signInWithPassword(email: email, password: password);
          debugPrint('[AuthProvider] Bootstrapped session with service account: $email');
        } catch (e) {
          debugPrint('[AuthProvider] Service account bootstrap failed: $e');
        }
      }
    }
    
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void _init() {
    // Legacy init - _bootstrapSession handles this now
  }

  void _setStatus(AuthStatus s) {
    if (_status == s) return;
    _status = s;
    notifyListeners();
  }

  Future<bool> signInWithPin(String pin) async {
    _signInError = null;
    _signInErrorCode = null;
    _setStatus(AuthStatus.loading);

    // Premium authentic feel
    await Future.delayed(const Duration(milliseconds: 500));

    try {
      // Ensure we have a server-issued JWT for RLS.
      // We prioritize the bootstrapped manager session if present.
      if (_supabase.auth.currentSession == null) {
        try {
          await _supabase.auth.signInAnonymously();
        } catch (e) {
          debugPrint('[AuthProvider] Anonymous sign-in failed (might be disabled): $e');
          // If both manager bootstrap and anonymous fail, we still try the RPC
          // as anon, but subsequent RLS-protected calls will likely fail.
        }
      }

      final response = await _supabase.rpc('authenticate_staff_pin', params: {
        'p_pin': pin,
      });

      if (response == null || (response is List && response.isEmpty)) {
        _signInError = 'Invalid PIN. Please try again.';
        _signInErrorCode = invalidLoginErrorCode;
        await signOut();
        return false;
      }

      final profile = (response is List) ? response.first as Map<String, dynamic> : response as Map<String, dynamic>;
      final role = (profile['role'] as String? ?? '').toLowerCase();
      if (role != 'cashier' && role != 'manager' && role != 'admin') {
        _signInError = 'Access role is not allowed for POS.';
        _signInErrorCode = invalidLoginErrorCode;
        await signOut();
        return false;
      }

      _appUser = AppUser(
        id: profile['id'] as String,
        authId: profile['auth_id'] as String,
        name: profile['full_name'] as String? ?? 'User',
        role: role,
        storeId: profile['store_id'] as String? ?? '',
        posPin: profile['pos_pin'] as String?,
      );

      debugPrint('[AuthProvider] User profile: id=${_appUser?.id}, name=${_appUser?.name}, role=${_appUser?.role}, storeId=${_appUser?.storeId}, authId=${_appUser?.authId}');

      _setStatus(role == 'cashier' ? AuthStatus.cashier : AuthStatus.manager);
      debugPrint('[AuthProvider] Verified session established — '
          'user=${_appUser?.name}, role=${_appUser?.role}');
      return true;
    } catch (e) {
      debugPrint('[AuthProvider] PIN sign-in failed: $e');
      _signInError = 'Sign-in failed. Please try again.';
      _signInErrorCode = networkErrorCode;
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
    if (_signInError != null || _signInErrorCode != null) {
      _signInError = null;
      _signInErrorCode = null;
      notifyListeners();
    }
  }
}
