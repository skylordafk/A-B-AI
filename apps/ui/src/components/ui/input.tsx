import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full px-2 py-1 border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm ${className}`}
      {...props}
    />
  );
}
