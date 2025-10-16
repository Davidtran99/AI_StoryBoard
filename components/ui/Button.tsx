/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

// FIX: Converted to a typed functional component using React.FC to make `children` optional, resolving type errors.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'default', size = 'default', className = '', children, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-base font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 leading-none';
  
  const variantClasses = {
    default: 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-500/30 transform hover:-translate-y-0.5 hover:from-teal-400 hover:to-cyan-400',
    destructive: 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg shadow-red-600/20 hover:shadow-xl hover:shadow-red-500/30 transform hover:-translate-y-0.5',
    outline: 'border border-teal-500/50 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 hover:text-teal-200 hover:shadow-[0_0_20px_rgba(20,184,166,0.35)] hover:border-teal-500/70',
    secondary: 'bg-slate-800/50 text-slate-300 shadow-sm hover:bg-slate-700/80 border border-slate-700/50 hover:border-slate-600',
    ghost: 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200',
  };

  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    icon: 'h-10 w-10',
  };

  const finalClassName = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return <button className={finalClassName} {...props}>{children}</button>;
};