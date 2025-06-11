import React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => onOpenChange(false)} />
      <div className="relative z-50">{children}</div>
    </div>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
}

export function DialogContent({ children }: DialogContentProps) {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
      {children}
    </div>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="mb-4">{children}</div>;
}

interface DialogTitleProps {
  children: React.ReactNode;
}

export function DialogTitle({ children }: DialogTitleProps) {
  return <h2 className="text-xl font-semibold text-[var(--text-primary)]">{children}</h2>;
}
