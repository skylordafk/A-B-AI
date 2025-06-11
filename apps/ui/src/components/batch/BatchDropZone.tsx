import React, { useState, useRef } from 'react';
import type { DragEvent } from 'react';

interface BatchDropZoneProps {
  onFileSelect: (file: File) => void;
  onTemplateBrowse?: () => void;
  onDownloadSample?: () => void;
}

export default function BatchDropZone({
  onFileSelect,
  onTemplateBrowse,
  onDownloadSample,
}: BatchDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files.find((f) => f.name.endsWith('.csv') || f.name.endsWith('.json'));

    if (file) {
      onFileSelect(file);
    } else {
      alert('Please upload a CSV or JSON file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <div
        className={`
          flex flex-col items-center justify-center h-64 
          border-2 border-dashed rounded-lg cursor-pointer
          transition-all duration-200 ease-in-out
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-[var(--border)] hover:border-blue-400 bg-[var(--bg-secondary)]'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <svg
          className={`w-12 h-12 mb-4 ${isDragging ? 'text-blue-500' : 'text-[var(--text-muted)]'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <p className="text-[var(--text-primary)] font-medium mb-2">
          {isDragging ? 'Drop your file here' : 'Drag & drop your CSV or JSON file'}
        </p>
        <p className="text-[var(--text-secondary)] text-sm">or click to browse</p>
        <p className="text-[var(--text-muted)] text-xs mt-4">Supported formats: CSV, JSON</p>
      </div>

      {onTemplateBrowse && (
        <div className="mt-4 text-center">
          <p className="text-[var(--text-secondary)] text-sm mb-2">Need a starting point?</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDownloadSample) {
                onDownloadSample();
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download Sample Template
          </button>
        </div>
      )}
    </div>
  );
}
