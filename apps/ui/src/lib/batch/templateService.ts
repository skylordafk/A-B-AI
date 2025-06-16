interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  downloadUrl: string;
  rowCount: number;
  lastUpdated: string;
}

interface TemplateManifest {
  version: string;
  templates: Template[];
}

const MANIFEST_URL =
  'https://raw.githubusercontent.com/skylordafk/A-B-AI/master/templates/manifest.json';

class TemplateService {
  private manifestCache: TemplateManifest | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  async getTemplates(): Promise<Template[]> {
    try {
      const manifest = await this.getManifest();
      return manifest.templates;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return this.getFallbackTemplates();
    }
  }

  async getTemplate(id: string): Promise<Template | null> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.id === id) || null;
  }

  async downloadTemplate(template: Template): Promise<string> {
    try {
      const response = await fetch(template.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download template: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      // If it's a local URL and failed, try with the public folder
      if (template.downloadUrl.startsWith('templates/')) {
        try {
          const publicUrl = template.downloadUrl;
          const publicResponse = await fetch(publicUrl);
          if (publicResponse.ok) {
            return await publicResponse.text();
          }
        } catch (publicError) {
          // Ignore and fall through to original error
        }
      }

      console.error('Failed to download template:', error);
      throw new Error('Failed to download template. Please try again later.');
    }
  }

  async downloadTemplateAsFile(template: Template): Promise<globalThis.File> {
    const content = await this.downloadTemplate(template);
    const blob = new Blob([content], { type: 'text/csv' });
    return new File([blob], `${template.id}.csv`, { type: 'text/csv' });
  }

  async downloadTemplateToDevice(template: Template): Promise<void> {
    try {
      const content = await this.downloadTemplate(template);

      // Create a more user-friendly filename
      const sanitizedName = template.name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
      const filename = `${sanitizedName}-template.csv`;

      // Create and trigger download
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template to device:', error);
      throw new Error('Failed to download template. Please try again later.');
    }
  }

  async downloadAllTemplatesAsZip(): Promise<void> {
    try {
      const templates = await this.getTemplates();

      // For simplicity, we'll download each template individually
      // In a real implementation, you might want to use a zip library like JSZip
      for (const template of templates) {
        await this.downloadTemplateToDevice(template);
        // Add a small delay to prevent overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Failed to download all templates:', error);
      throw new Error('Failed to download all templates. Please try again later.');
    }
  }

  getTemplatesByCategory(category: string): Promise<Template[]> {
    return this.getTemplates().then((templates) =>
      templates.filter((t) => t.category === category)
    );
  }

  getCategories(): Promise<string[]> {
    return this.getTemplates().then((templates) => [...new Set(templates.map((t) => t.category))]);
  }

  private async getManifest(): Promise<TemplateManifest> {
    const now = Date.now();

    // Return cached manifest if still valid
    if (this.manifestCache && now < this.cacheExpiry) {
      return this.manifestCache;
    }

    try {
      // Try to fetch fresh manifest from GitHub
      const response = await fetch(MANIFEST_URL, {
        cache: 'no-cache',
        headers: { Accept: 'application/json' },
      } as RequestInit);

      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }

      const manifest: TemplateManifest = await response.json();

      // Cache the manifest
      this.manifestCache = manifest;
      this.cacheExpiry = now + this.CACHE_DURATION;

      return manifest;
    } catch (error) {
      // Try to load local manifest as fallback
      console.warn('Remote manifest fetch failed, trying local fallback...');

      try {
        const localResponse = await fetch('templates/manifest.json');
        if (localResponse.ok) {
          const localManifest: TemplateManifest = await localResponse.json();

          // Update download URLs to use local paths
          localManifest.templates = localManifest.templates.map((template) => ({
            ...template,
            downloadUrl: `templates/batch/${template.id}.csv`,
          }));

          this.manifestCache = localManifest;
          this.cacheExpiry = now + this.CACHE_DURATION;
          return localManifest;
        }
      } catch (localError) {
        console.error('Failed to load local manifest:', localError);
      }

      throw error;
    }
  }

  private getFallbackTemplates(): Template[] {
    // Fallback templates in case online fetch fails
    return [
      {
        id: 'basic-template',
        name: 'Basic Template',
        description: 'Simple starter template with various models and prompts',
        category: 'general',
        downloadUrl: 'batch-template.csv', // Fallback to local file
        rowCount: 8,
        lastUpdated: new Date().toISOString(),
      },
    ];
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.manifestCache = null;
    this.cacheExpiry = 0;
  }
}

export const templateService = new TemplateService();
export type { Template, TemplateManifest };
