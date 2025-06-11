import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { mode, toggleMode } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`p-2 rounded-md text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors ${className}`}
      title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
    >
      {mode === 'light' ? (
        // Moon icon
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      ) : (
        // Sun icon
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M10 2a.75.75 0 01.75.75V4a.75.75 0 11-1.5 0V2.75A.75.75 0 0110 2zM10 16a.75.75 0 01.75.75v1.25a.75.75 0 11-1.5 0V16.75a.75.75 0 01.75-.75zM4.22 4.22a.75.75 0 011.06 0l.884.884a.75.75 0 11-1.06 1.06l-.884-.884a.75.75 0 010-1.06zM15.834 15.834a.75.75 0 011.06 0l.884.884a.75.75 0 11-1.06 1.06l-.884-.884a.75.75 0 010-1.06zM2.75 10a.75.75 0 01.75-.75H4.75a.75.75 0 010 1.5H3.5a.75.75 0 01-.75-.75zM16 9.25a.75.75 0 01.75.75v.75a.75.75 0 11-1.5 0V10a.75.75 0 01.75-.75zM4.22 15.834a.75.75 0 011.06 1.06l-.884.884a.75.75 0 11-1.06-1.06l.884-.884zM15.834 4.22a.75.75 0 010 1.06l-.884.884a.75.75 0 01-1.06-1.06l.884-.884a.75.75 0 011.06 0z" />
          <path d="M10 5.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
        </svg>
      )}
    </button>
  );
}
