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
    'px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className={`relative inline-flex ${className}`} ref={dropdownRef}>
      <button
        onClick={primaryAction.onClick}
        disabled={primaryAction.disabled || loading}
        className={`${baseButtonClass} rounded-l-md border-r border-slate-700`}
      >
        {loading ? 'Sending...' : primaryAction.label}
      </button>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${baseButtonClass} rounded-r-md px-2`}
        disabled={loading}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md shadow-lg z-10">
          {dropdownActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors first:rounded-t-md last:rounded-b-md flex items-center gap-2"
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
