import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'neutral' | 'pro' | 'con' | 'blue';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export function Badge({ 
  variant = 'neutral', 
  size = 'md', 
  children,
  className 
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const variantStyles = {
    neutral: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    pro: 'bg-green-100 text-green-700',
    con: 'bg-red-100 text-red-700'
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </span>
  );
}
