/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const Progress: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <div className={`h-2 w-full bg-slate-800/70 rounded-full overflow-hidden ${className}`}>
    <div
      className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);
