interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  filePath: string;
  rowCount: number;
}

class TemplateService {
  async getTemplates(): Promise<Template[]> {
    // Return only the local batch template with a relative path
    return [
      {
        id: 'batch-template',
        name: 'Batch Template',
        description:
          'Comprehensive template showcasing all available models with diverse prompts and temperatures',
        category: 'general',
        filePath: './templates/batch/basic-template.csv',
        rowCount: 15,
      },
    ];
  }

  async getTemplate(id: string): Promise<Template | null> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.id === id) || null;
  }

  async downloadTemplate(template: Template): Promise<string> {
    try {
      const response = await fetch(template.filePath);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Failed to load template:', error);
      throw new Error('Failed to load template. Please try again.');
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
      const filename = `${template.id}.csv`;

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
      throw new Error('Failed to download template. Please try again.');
    }
  }
}

export const templateService = new TemplateService();
export type { Template };
