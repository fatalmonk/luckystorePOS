'use client';

import '../lib/install-prompt';
import { InstallPrompt } from './InstallPrompt';
import type { Locale } from '../lib/i18n/config';

/** Registers the install listener during the initial client bundle, then shows the prompt. */
export function InstallPromptBootstrap({ locale }: { locale: Locale }) {
  return <InstallPrompt locale={locale} />;
}
