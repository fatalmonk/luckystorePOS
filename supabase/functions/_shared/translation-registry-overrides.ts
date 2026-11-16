/**
 * Live manufacturer evidence and corrections verified against current official
 * product pages. Keep this small and review each addition with its source.
 */
export const registryOverrides: Record<string, {
  netQuantity?: string;
  manufacturerUrl: string;
  manufacturerTitle: string;
}> = {
  '39fb96e9': {
    netQuantity: '58 ml',
    manufacturerUrl: 'https://igloobd.com/product-details/shell-core-25-pcs',
    manufacturerTitle: 'Igloo Shell & Core product page',
  },
  '1cbf6c50': {
    netQuantity: '500 ml',
    manufacturerUrl: 'https://www.igloobd.com/product-details/strawberry-2',
    manufacturerTitle: 'Igloo Strawberry 1/2 Liter product page',
  },
  '08dc7fe1': {
    netQuantity: '500 ml',
    manufacturerUrl: 'https://www.igloobd.com/product-details/chocolate-2',
    manufacturerTitle: 'Igloo Chocolate 1/2 Liter product page',
  },
  '0e06fb82': {
    netQuantity: '58 ml',
    manufacturerUrl: 'https://igloobd.com/product-details/lolly-orange-25-pcs',
    manufacturerTitle: 'Igloo Lolly Orange product page',
  },
  '94c748e3': {
    manufacturerUrl: 'https://polarbd.com/en/product/tub-vanilla/',
    manufacturerTitle: 'Polar Vanilla product page',
  },
  '236b5858': {
    netQuantity: '100 ml',
    manufacturerUrl: 'https://polarbd.com/en/product/cup-mango/',
    manufacturerTitle: 'Polar Mango Cup product page',
  },
  '22a4cd31': {
    netQuantity: '15 g',
    manufacturerUrl: 'https://meridiangroupbd.com/our-business/meridian-foods-ltd/products/export/',
    manufacturerTitle: 'Meridian Foods export product catalogue',
  },
  '22cb1b54': {
    manufacturerUrl: 'https://www.unilever.com/files/4134f9a2-2b4b-4e0f-bd42-88dde5587951/annual-report-and-financial-statements-2016.pdf',
    manufacturerTitle: 'Unilever LUX product range',
  },
  '223bcafc': {
    manufacturerUrl: 'https://www.unilever.com/files/4134f9a2-2b4b-4e0f-bd42-88dde5587951/annual-report-and-financial-statements-2016.pdf',
    manufacturerTitle: 'Unilever LUX product range',
  },
};
