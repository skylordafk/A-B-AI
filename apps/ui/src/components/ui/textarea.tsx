import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full px-3 py-2 border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-stone-500 ${className}`}
      {...props}
    />
  );
}
