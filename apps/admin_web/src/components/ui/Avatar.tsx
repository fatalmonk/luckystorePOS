import React from 'react';
import clsx from 'clsx';

export interface AvatarProps {
  name?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, image, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  }[size];

  const initials = name
    ? name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
    : '';

  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-full bg-gray-200 text-gray-800 overflow-hidden',
        sizeClasses,
        className
      )}
    >
      {image ? (
        <img src={image} alt={name} className="object-cover w-full h-full" />
      ) : (
        <span className="font-medium">{initials}</span>
      )}
    </div>
  );
};
