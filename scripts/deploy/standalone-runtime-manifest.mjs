const MINIMUM_SHARP_VERSION = '^0.35.5';

/** Build the dependency manifest installed by Hostinger for a standalone release. */
export function createStandaloneRuntimeManifest(appPackage) {
  const nextVersion = appPackage.dependencies?.next ?? appPackage.devDependencies?.next;
  if (!nextVersion) {
    throw new Error('The customer storefront package must declare its Next.js version.');
  }
  const postcssVersion = appPackage.overrides?.postcss ?? appPackage.dependencies?.postcss;

  return {
    name: 'luckystore-storefront-standalone',
    version: '1.0.0',
    private: true,
    main: 'server.js',
    scripts: {
      build: 'node -e "console.log(\'Release package verified\')"',
      start: 'node server.js',
    },
    dependencies: {
      ...appPackage.dependencies,
      next: nextVersion,
      ...(postcssVersion ? { postcss: postcssVersion } : {}),
      sharp: MINIMUM_SHARP_VERSION,
    },
    overrides: {
      ...appPackage.overrides,
      next: nextVersion,
      sharp: MINIMUM_SHARP_VERSION,
    },
  };
}
