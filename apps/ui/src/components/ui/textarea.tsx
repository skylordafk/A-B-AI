import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full px-2 py-1.5 border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-transparent bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-stone-500 text-sm ${className}`}
      {...props}
    />
  );
}
