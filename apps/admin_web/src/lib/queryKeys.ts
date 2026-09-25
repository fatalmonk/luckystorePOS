export const settingsQueryKeys = {
  paymentMethods: (storeId: string | undefined) => ['settings-payment-methods', storeId] as const,
};
