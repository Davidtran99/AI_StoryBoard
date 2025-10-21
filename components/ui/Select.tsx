/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// A simple select component for styling consistency
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => {
  // For Higgsfield models with many options, use custom dropdown
  const optionCount = React.Children.count(children);
  const hasManyOptions = optionCount > 10; // Reduced threshold for testing
  
  // Debug log
  console.log('🔍 [SELECT] Option count:', optionCount, 'hasManyOptions:', hasManyOptions);
  
  if (!hasManyOptions) {
    // Use native select for small lists
    return (
      <select
        className={`flex h-10 w-full rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-200 ring-offset-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-no-repeat bg-right pr-8 bg-[url('data:image/svg+xml;charset=utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2394a3b8%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M10%2012a1%201%200%200%201-.707-.293l-3-3a1%201%200%201%201%201.414-1.414L10%209.586l2.293-2.293a1%201%200%200%201%201.414%201.414l-3%203A1%201%200%200%201%2010%2012z%22%20clip-rule%3D%22evenodd%22%20/%3E%3C/svg%3E')] ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }

  // Custom dropdown for large lists
  return <CustomSelect className={className} {...props}>{children}</CustomSelect>;
};

// Custom dropdown component for large option lists
const CustomSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }> = ({ 
  className = '', 
  children, 
  value, 
  onChange, 
  disabled,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Extract options from children
  const options = React.Children.toArray(children).filter(
    (child): child is React.ReactElement => 
      React.isValidElement(child) && child.type === 'option'
  );

  // Find selected option text
  useEffect(() => {
    const selectedOption = options.find(option => option.props.value === value);
    setSelectedText(selectedOption?.props.children?.toString() || '');
  }, [value, options]);

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Handle scroll and resize events to reposition dropdown
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleOptionClick = (optionValue: string) => {
    if (onChange) {
      const event = {
        target: { value: optionValue }
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(event);
    }
    setIsOpen(false);
  };

  const dropdownPanel = isOpen ? (
    <div 
      ref={dropdownRef}
      className="fixed z-[2147483647] bg-slate-900 border border-slate-700 rounded-md shadow-lg max-h-96 overflow-y-auto overflow-x-auto"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxWidth: `calc(100vw - ${position.left + 16}px)`
      }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          type="button"
          onClick={() => handleOptionClick(option.props.value)}
          className={`w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none whitespace-nowrap ${
            option.props.value === value ? 'bg-teal-900/50 text-teal-200' : ''
          }`}
          title={option.props.children?.toString()}
        >
          <span className="block">{option.props.children}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-200 ring-offset-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left justify-between items-center ${className}`}
        title={selectedText}
      >
        <span className="truncate">{selectedText}</span>
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {dropdownPanel && createPortal(dropdownPanel, document.body)}
    </div>
  );
};