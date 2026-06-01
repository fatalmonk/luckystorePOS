/// Typed representation of a row from the `public.users` table,
/// joined to the currently authenticated Supabase Auth user.
class AppUser {
  final String id;
  final String authId;
  final String name;
  final String role;
  final String storeId;
  final String? posPin;
  final String? tenantId;

  const AppUser({
    required this.id,
    required this.authId,
    required this.name,
    required this.role,
    required this.storeId,
    this.posPin,
    this.tenantId,
  });

  /// Construct from a Supabase `public.users` row map.
  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id:      json['id']       as String,
      authId:  json['auth_id']  as String,
      name:    json['full_name']     as String? ?? 'User',
      role:    json['role']     as String? ?? 'cashier',
      storeId: json['store_id'] as String? ?? '',
      posPin:  json['pos_pin']  as String?,
      tenantId: json['tenant_id'] as String?,
    );
  }

  /// Returns true if this user has manager-level or admin-level privileges.
  bool get isManager => role == 'manager' || role == 'admin';

  /// Returns true if this user is a cashier.
  bool get isCashier => role == 'cashier';

  @override
  String toString() => 'AppUser(id: $id, name: $name, role: $role)';
}
