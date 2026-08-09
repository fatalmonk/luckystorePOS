'use client';

import React from 'react';

interface CartAnnouncerProps {
  message: string;
}

export function CartAnnouncer({ message }: CartAnnouncerProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
