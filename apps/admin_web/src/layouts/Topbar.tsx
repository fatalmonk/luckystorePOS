import React from 'react';
// Will integrate the existing topheader logic here later, this is a placeholder wrapper
import { TopHeader as OldTopHeader } from '../components/TopHeader';

export function Topbar() {
  // Eventually replace with a fully standard Tailwind/Token-based topbar
  return <OldTopHeader />;
}