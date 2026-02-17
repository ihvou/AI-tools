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
  const baseStyles = 'inline-flex items-center font-medium rounded';

  const variantStyles = {
    neutral: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-50 text-blue-600 border border-blue-200',
    pro: 'bg-green-50 text-green-700 border border-green-200',
    con: 'bg-red-50 text-red-700 border border-red-200'
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </span>
  );
}
