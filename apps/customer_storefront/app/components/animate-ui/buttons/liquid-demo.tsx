'use client';

import React from 'react';
import { LiquidButton } from './liquid';

export interface LiquidButtonDemoProps {
  delay?: number;
  fillHeight?: number;
  tapScale?: number;
  children?: React.ReactNode;
}

export default function LiquidButtonDemo({
  delay = 0.3,
  fillHeight = 3,
  tapScale = 0.97,
  children = 'Liquid Button',
}: LiquidButtonDemoProps) {
  return (
    <LiquidButton
      delay={`${delay}s`}
      fillHeight={`${fillHeight}px`}
      tapScale={tapScale}
    >
      {children}
    </LiquidButton>
  );
}
