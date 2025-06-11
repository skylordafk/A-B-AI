import React, { useState, useRef, useEffect } from 'react';

interface SplitButtonProps {
  primaryAction: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  dropdownActions: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;
  loading?: boolean;
  className?: string;
}

export default function SplitButton({
  primaryAction,
  dropdownActions,
  loading = false,
  className = '',
}: SplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseButtonClass =
    'px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className={`relative inline-flex ${className}`} ref={dropdownRef}>
      <button
        onClick={primaryAction.onClick}
        disabled={primaryAction.disabled || loading}
        className={`${baseButtonClass} rounded-l border-r border-slate-700`}
      >
        {loading ? 'Sending...' : primaryAction.label}
      </button>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${baseButtonClass} rounded-r px-1.5`}
        disabled={loading}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-1 w-40 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg z-10">
          {dropdownActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className="w-full px-2 py-1 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors first:rounded-t last:rounded-b flex items-center gap-1"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
