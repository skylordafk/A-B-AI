import { type ReactNode } from 'react';

interface TerminalBlockProps {
  children: ReactNode;
  className?: string;
}

export default function TerminalBlock({ children, className = '' }: TerminalBlockProps) {
  return (
    <div
      className={`border rounded overflow-hidden shadow-sm bg-stone-50 text-stone-900 border-stone-300 dark:bg-stone-800 dark:text-stone-50 dark:border-stone-700 ${className}`}
      style={{ userSelect: 'text' }}
    >
      {/* Header with traffic-light buttons */}
      <div className="flex items-center gap-1 px-2 py-0.5 bg-stone-200 dark:bg-stone-700">
        <span className="w-2 h-2 rounded-full bg-red-400"></span>
        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
        <span className="w-2 h-2 rounded-full bg-green-400"></span>
      </div>
      {/* Content area */}
      <div className="p-2 font-mono text-xs whitespace-pre-wrap break-words prose prose-sm max-w-none dark:prose-invert">
        {children}
      </div>
    </div>
  );
}
