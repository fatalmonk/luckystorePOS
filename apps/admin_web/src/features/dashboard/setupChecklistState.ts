export function hasActivePaymentMethod(methods: Array<{ is_active?: boolean }> | undefined): boolean {
  return methods?.some((method) => method.is_active === true) ?? false;
}
