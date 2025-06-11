import { type ReactNode } from 'react';

interface TerminalBlockProps {
  children: ReactNode;
  className?: string;
}

export default function TerminalBlock({ children, className = '' }: TerminalBlockProps) {
  return (
    <div
      className={`border rounded-lg overflow-hidden shadow-sm bg-stone-50 text-stone-900 border-stone-300 dark:bg-stone-800 dark:text-stone-50 dark:border-stone-700 ${className}`}
      style={{ userSelect: 'text' }}
    >
      {/* Header with traffic-light buttons */}
      <div className="flex items-center gap-2 px-3 py-1 bg-stone-200 dark:bg-stone-700">
        <span className="w-3 h-3 rounded-full bg-red-400"></span>
        <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
        <span className="w-3 h-3 rounded-full bg-green-400"></span>
      </div>
      {/* Content area */}
      <div className="p-4 font-mono text-sm whitespace-pre-wrap break-words prose max-w-none dark:prose-invert">
        {children}
      </div>
    </div>
  );
}
