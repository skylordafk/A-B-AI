import { useState, useEffect } from 'react';
import { templateService, type Template } from '../../lib/batch/templateService';

interface TemplateBrowserProps {
  onTemplateSelect: (template: Template) => void;
  onClose: () => void;
}

export default function TemplateBrowser({ onTemplateSelect, onClose }: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingTemplates, setDownloadingTemplates] = useState<Set<string>>(new Set());
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [allTemplates, allCategories] = await Promise.all([
        templateService.getTemplates(),
        templateService.getCategories(),
      ]);

      setTemplates(allTemplates);
      setCategories(['all', ...allCategories]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = async (template: Template) => {
    try {
      await onTemplateSelect(template);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    }
  };

  const handleDownloadTemplate = async (template: Template, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the template click

    try {
      setDownloadingTemplates((prev) => new Set(prev).add(template.id));
      await templateService.downloadTemplateToDevice(template);
      setSuccessMessage(`Template "${template.name}" downloaded successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download template');
    } finally {
      setDownloadingTemplates((prev) => {
        const next = new Set(prev);
        next.delete(template.id);
        return next;
      });
    }
  };

  const handleDownloadAll = async () => {
    try {
      setIsDownloadingAll(true);
      setError(null);
      await templateService.downloadAllTemplatesAsZip();
      setSuccessMessage(`All ${filteredTemplates.length} templates downloaded successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download all templates');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      creative: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      analysis: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      development: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      research: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };
    return (
      colors[category as keyof typeof colors] ||
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
          {/* Success Toast */}
          {successMessage && (
            <div
              className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-10 transition-all duration-300 ease-in-out"
              style={{ animation: 'fadeIn 0.3s ease-in-out' }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {successMessage}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Browse Templates</h2>
              <p className="text-[var(--text-secondary)] text-sm mt-1">
                Choose from curated batch processing templates - Load into batch processor or
                download to your device
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Category Filter */}
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  }`}
                >
                  {category === 'all'
                    ? 'All Templates'
                    : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-[var(--text-secondary)]">Loading templates...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-32 space-y-3">
                <p className="text-red-500">Error: {error}</p>
                <button
                  onClick={loadTemplates}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer group"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                        {template.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}
                      >
                        {template.category}
                      </span>
                    </div>

                    <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-3">
                      <span>{template.rowCount} prompts</span>
                      <span>Updated {new Date(template.lastUpdated).toLocaleDateString()}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleTemplateClick(template)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Load Template
                      </button>

                      <button
                        onClick={(e) => handleDownloadTemplate(template, e)}
                        disabled={downloadingTemplates.has(template.id)}
                        className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-md hover:bg-[var(--border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {downloadingTemplates.has(template.id) ? (
                          <>
                            <svg
                              className="w-3 h-3 animate-spin"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between">
              <p className="text-[var(--text-muted)] text-sm">
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}{' '}
                available
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadAll}
                  disabled={isDownloadingAll || filteredTemplates.length === 0}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isDownloadingAll ? (
                    <>
                      <svg
                        className="w-3 h-3 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3M9 20H7a2 2 0 01-2-2V6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2h-2"
                        />
                      </svg>
                      Download All
                    </>
                  )}
                </button>
                <button
                  onClick={() => templateService.clearCache()}
                  className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
