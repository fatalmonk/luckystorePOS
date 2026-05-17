enum UserRole {
  cashier,
  manager,
  admin,
  auditor,
  operator
}

enum ActionCapability {
  recordSale,
  initiateReconciliation,
  approveVariance,
  manageDlq,
  viewSystemTelemetry,
  viewAuditLogs
}

class PermissionGuard {
  static bool canPerform(UserRole role, ActionCapability action) {
    switch (role) {
      case UserRole.admin:
        return true; // Universal access
      
      case UserRole.manager:
        return [
          ActionCapability.recordSale,
          ActionCapability.initiateReconciliation,
          ActionCapability.approveVariance,
          ActionCapability.viewAuditLogs
        ].contains(action);
      
      case UserRole.cashier:
        return [
          ActionCapability.recordSale,
          ActionCapability.initiateReconciliation // Can count, but not approve
        ].contains(action);
      
      case UserRole.auditor:
        return [
          ActionCapability.viewAuditLogs,
          ActionCapability.viewSystemTelemetry
        ].contains(action);

      case UserRole.operator:
        return [
          ActionCapability.manageDlq,
          ActionCapability.viewSystemTelemetry
        ].contains(action);
    }
  }

  static void assertHasPermission(UserRole role, ActionCapability action) {
    if (!canPerform(role, action)) {
      throw Exception('FORBIDDEN: Role ${role.name} attempted unauthorized capability ${action.name}');
    }
  }
}
