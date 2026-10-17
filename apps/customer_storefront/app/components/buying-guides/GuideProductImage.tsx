'use client';

import { useState } from 'react';
import React from 'react';
import Image from 'next/image';
import styles from './buying-guides.module.css';

export function GuideProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className={styles.productImageFallback} role="img" aria-label={`${alt} unavailable`}>
      Image unavailable
    </div>;
  }

  return <Image className={styles.productImage} src={src} alt={alt} width={640} height={640}
    sizes="(max-width: 720px) 100vw, 33vw" onError={() => setFailed(true)} />;
}
