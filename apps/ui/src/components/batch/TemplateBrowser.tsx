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

  useEffect(() => {
    loadTemplates();
  }, []);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Browse Templates</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              Choose from curated batch processing templates
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
                  className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
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

                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{template.rowCount} prompts</span>
                    <span>Updated {new Date(template.lastUpdated).toLocaleDateString()}</span>
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
  );
}
