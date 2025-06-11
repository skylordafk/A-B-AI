import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({ className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`px-3 py-1.5 bg-slate-600 dark:bg-slate-500 text-white rounded hover:bg-slate-700 dark:hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
