class Party {
  final String id;
  final String tenantId;
  final String type; // 'customer' | 'supplier' | 'employee'
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final double currentBalance;

  const Party({
    required this.id,
    required this.tenantId,
    required this.type,
    required this.name,
    this.phone,
    this.email,
    this.address,
    this.currentBalance = 0,
  });

  factory Party.fromJson(Map<String, dynamic> json) {
    // I23: Add null fallbacks for required fields
    return Party(
      id: json['id'] as String? ?? '',
      tenantId: json['tenant_id'] as String? ?? '',
      type: json['type'] as String? ?? 'customer',
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
      currentBalance: (json['current_balance'] as num? ?? 0).toDouble(),
    );
  }
}
