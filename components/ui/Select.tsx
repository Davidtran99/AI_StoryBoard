/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

// A simple select component for styling consistency
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => (
  <select
    className={`flex h-10 w-full rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-200 ring-offset-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-no-repeat bg-right pr-8 bg-[url('data:image/svg+xml;charset=utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2394a3b8%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M10%2012a1%201%200%200%201-.707-.293l-3-3a1%201%200%201%201%201.414-1.414L10%209.586l2.293-2.293a1%201%200%200%201%201.414%201.414l-3%203A1%201%200%200%201%2010%2012z%22%20clip-rule%3D%22evenodd%22%20/%3E%3C/svg%3E')] ${className}`}
    {...props}
  >
    {children}
  </select>
);