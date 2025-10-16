/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

// FIX: Added types for component props to avoid implicit 'any' and improve type safety.
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className = '', ...props }) => <label className={`block text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300 mb-1.5 ${className}`} {...props} />;