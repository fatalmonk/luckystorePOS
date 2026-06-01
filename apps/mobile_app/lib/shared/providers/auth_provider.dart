import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/app_user.dart';

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

  // Store last verified PIN for manager operations
  String? _lastVerifiedPin;
  String? get lastVerifiedPin => _lastVerifiedPin;

  User get currentUserOrThrow {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      throw StateError('No authenticated Supabase session');
    }
    return user;
  }

  AuthProvider() {
    _status = AuthStatus.unauthenticated;
    notifyListeners();

    // Listen to auth state changes
    _supabase.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      if (session != null) {
        // Keep existing status (could be cashier or manager if already verified)
        if (_status == AuthStatus.unauthenticated) {
          _status = AuthStatus.cashier; // Default to cashier on fresh session
        }
      } else {
        _status = AuthStatus.unauthenticated;
        _lastVerifiedPin = null;
      }
      notifyListeners();
    });
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
          final managerEmail = dotenv.env['MANAGER_EMAIL']?.trim();
          final managerPassword = dotenv.env['MANAGER_PASSWORD']?.trim();
          if (managerEmail != null && managerEmail.isNotEmpty &&
              managerPassword != null && managerPassword.isNotEmpty) {
            debugPrint('[AuthProvider] Attempting manager bootstrap login...');
            await _supabase.auth.signInWithPassword(
              email: managerEmail,
              password: managerPassword,
            );
            debugPrint('[AuthProvider] Bootstrapped manager session successfully.');
          }
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

      final userRecord = await _supabase.from('users').select('tenant_id').eq('id', profile['id']).maybeSingle();
      final tenantId = userRecord?['tenant_id'] as String?;

      _appUser = AppUser(
        id: profile['id'] as String,
        authId: profile['auth_id'] as String,
        name: profile['full_name'] as String? ?? 'User',
        role: role,
        storeId: profile['store_id'] as String? ?? '',
        posPin: profile['pos_pin'] as String?,
        tenantId: tenantId ?? profile['tenant_id'] as String?,
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

  /// Verifies a manager's PIN without changing global auth state.
  /// Used for manager overrides (voids, refunds, etc).
  Future<bool> verifyManagerPin(String pin) async {
    // I25: Check for active session before calling RPC
    if (_supabase.auth.currentSession == null) {
      debugPrint('[AuthProvider] No active session for PIN verification');
      _lastVerifiedPin = null;
      return false;
    }

    try {
      final response = await _supabase.rpc('authenticate_staff_pin', params: {
        'p_pin': pin,
      });

      if (response == null || (response is List && response.isEmpty)) {
        _lastVerifiedPin = null;
        return false;
      }

      final profile = (response is List) ? response.first as Map<String, dynamic> : response as Map<String, dynamic>;
      final role = (profile['role'] as String? ?? '').toLowerCase();
      final isManager = role == 'manager' || role == 'admin';

      if (isManager) {
        _lastVerifiedPin = pin;
      } else {
        _lastVerifiedPin = null;
      }

      return isManager;
    } catch (e) {
      debugPrint('[AuthProvider] PIN verification failed: $e');
      _lastVerifiedPin = null;
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
