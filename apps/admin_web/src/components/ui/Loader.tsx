import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface LoaderProps extends React.SVGAttributes<SVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
}

export function Loader({ size = 'md', fullScreen = false, className, ...props }: LoaderProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const loader = (
    <Loader2 
      className={clsx('animate-spin text-primary', sizes[size], className)} 
      {...props} 
    />
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50 backdrop-blur-sm">
        {loader}
      </div>
    );
  }

  return loader;
}