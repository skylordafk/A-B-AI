import type { FC } from 'react';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

const LoadingOverlay: FC<LoadingOverlayProps> = ({ show, message = 'Loading...' }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-2">
        {/* Spinner */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full border-2 border-gray-200"></div>
          <div className="absolute top-0 left-0 w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        </div>

        {/* Message */}
        <p className="text-white text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
