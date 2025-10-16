/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

// FIX: Added types for component props to avoid implicit 'any' and improve type safety.
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => <textarea className={`flex min-h-[80px] w-full rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-200 ring-offset-slate-950 placeholder:text-slate-500 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:bg-slate-900 focus-visible:shadow-[0_0_15px_rgba(20,184,166,0.2)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />;