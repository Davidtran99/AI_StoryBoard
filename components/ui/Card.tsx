/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

// FIX: Converted components to use React.FC to make `children` optional and fix type errors.
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
    <div 
        className={`group relative rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-2xl text-slate-50 shadow-2xl shadow-black/30 overflow-hidden transition-all duration-300 hover:border-slate-600 hover:shadow-xl hover:shadow-teal-950/30 ${className}`} 
        {...props}
    >
        {children}
    </div>
);
export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>{children}</div>;
export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', children, ...props }) => <h3 className={`text-2xl font-semibold leading-none tracking-tight text-slate-100 ${className}`} {...props}>{children}</h3>;
export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className = '', children, ...props }) => <p className={`text-base text-slate-400 mt-1 leading-relaxed ${className}`} {...props}>{children}</p>;
export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => <div className={`p-6 pt-0 ${className}`} {...props}>{children}</div>;
export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>{children}</div>;