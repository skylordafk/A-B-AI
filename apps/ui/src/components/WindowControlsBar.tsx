import React from 'react';
import ThemeToggle from './ThemeToggle';
import { Button } from './ui/button';

export default function WindowControlsBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-1 border-b border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] select-none">
      <div className="flex items-center gap-2">
        <Button
          onClick={onOpenSettings}
          className="px-3 py-1 text-sm !bg-[var(--bg-primary)] !text-[var(--text-primary)] hover:!bg-[var(--bg-primary)] focus:ring-0"
        >
          Settings
        </Button>
      </div>
      <div className="flex items-center gap-1">
        {/* Theme toggle uses tokens internally */}
        <ThemeToggle className="!bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-primary)]" />
      </div>
    </div>
  );
}
