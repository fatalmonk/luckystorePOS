import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  static User? get currentUser => _supabase.auth.currentUser;

  static Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  static Future<bool> signIn(String email, String password) async {
    try {
      await _supabase.auth.signInWithPassword(email: email, password: password);
      return true;
    } catch (e) {
      // Keep noisy auth failures out of production stdout.
      return false;
    }
  }

  static Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  static Future<bool> isUserAdminOrManager() async {
    final user = currentUser;
    if (user == null) return false;

    try {
      final response = await _supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (response != null) {
        final role = response['role'] as String?;
        return role == 'admin' || role == 'manager';
      }
      return false;
    } catch (e) {
      // Any lookup failure should fail closed.
      return false;
    }
  }
}
