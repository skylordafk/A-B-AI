import Papa from 'papaparse';
import type { BatchRow, RowError } from '../../types/batch';
import { createEmptyRow } from './spreadsheetUtils';

// Smart header mapping for various naming conventions
const HEADER_MAPPINGS: Record<string, string[]> = {
  prompt: ['prompt', 'question', 'input', 'user_message', 'user_prompt', 'message'],
  system: ['system', 'system_prompt', 'system_message', 'instructions', 'context'],
  model: ['model', 'ai_model', 'llm_model', 'provider_model'],
  temperature: ['temperature', 'temp', 'randomness'],
  jsonSchema: ['json_schema', 'jsonschema', 'schema', 'output_schema', 'format'],
  developer: ['developer', 'dev_prompt', 'developer_prompt', 'dev_message'],
  description: ['description', 'desc', 'note', 'comment', 'label'],
};

// Normalize header names for mapping
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, '_');
}

// Smart header detection with fuzzy matching
export function detectHeaders(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {};
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));

  // First pass: exact matches
  Object.entries(HEADER_MAPPINGS).forEach(([canonical, variants]) => {
    for (const variant of variants) {
      const normalizedVariant = normalizeHeader(variant);
      const index = normalizedHeaders.indexOf(normalizedVariant);
      if (index !== -1) {
        mappings[canonical] = headers[index];
        break;
      }
    }
  });

  // Second pass: partial matches for unmapped headers
  const unmappedHeaders = headers.filter((h) => !Object.values(mappings).includes(h));

  unmappedHeaders.forEach((header) => {
    const normalized = normalizeHeader(header);

    Object.entries(HEADER_MAPPINGS).forEach(([canonical, variants]) => {
      if (mappings[canonical]) return; // Already mapped

      for (const variant of variants) {
        const normalizedVariant = normalizeHeader(variant);
        if (normalized.includes(normalizedVariant) || normalizedVariant.includes(normalized)) {
          mappings[canonical] = header;
          break;
        }
      }
    });
  });

  return mappings;
}

// Enhanced CSV parsing with smart header detection
export async function parseSmartCSV(file: File): Promise<{
  rows: BatchRow[];
  errors: RowError[];
  mappings: Record<string, string>;
  unmappedHeaders: string[];
}> {
  const rows: BatchRow[] = [];
  const errors: RowError[] = [];

  try {
    const text = await file.text();
    const extension = file.name.toLowerCase().split('.').pop();

    if (extension !== 'csv') {
      errors.push({
        row: 0,
        message: 'Only CSV files are supported. Please upload a .csv file.',
      });
      return { rows, errors, mappings: {}, unmappedHeaders: [] };
    }

    // Parse CSV with header detection
    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      dynamicTyping: false, // Keep everything as strings for better control
    });

    const headers = results.meta.fields || [];
    const mappings = detectHeaders(headers);
    const unmappedHeaders = headers.filter((h) => !Object.values(mappings).includes(h));

    // Validate that we have at least a prompt column
    if (!mappings.prompt && !mappings.developer) {
      errors.push({
        row: 0,
        message:
          'CSV must have a column for prompts. Supported headers include: prompt, question, input, user_message, developer',
      });
      return { rows, errors, mappings, unmappedHeaders };
    }

    // Process each row with smart mapping
    results.data.forEach((rawRow: any, index: number) => {
      try {
        const promptValue = rawRow[mappings.prompt] || rawRow[mappings.developer] || '';

        if (!promptValue || promptValue.trim() === '') {
          errors.push({
            row: index + 2, // +2 for 1-indexed + header
            message: 'Row missing prompt content',
            data: rawRow,
          });
          return;
        }

        // Extract mapped values
        const prompt = promptValue.trim();
        const system = rawRow[mappings.system]?.trim() || undefined;
        const model = rawRow[mappings.model]?.trim() || undefined;
        const developer = rawRow[mappings.developer]?.trim() || undefined;

        // Parse temperature with validation
        let temperature: number | undefined;
        if (rawRow[mappings.temperature]) {
          const tempValue = parseFloat(rawRow[mappings.temperature]);
          if (!isNaN(tempValue) && tempValue >= 0 && tempValue <= 2) {
            temperature = tempValue;
          } else {
            errors.push({
              row: index + 2,
              message: 'Temperature must be between 0 and 2',
              data: rawRow,
            });
            return;
          }
        }

        // Extract JSON schema
        const jsonSchema = rawRow[mappings.jsonSchema]?.trim() || undefined;

        // Build data object with unmapped columns and special fields
        const data: Record<string, unknown> = {};

        // Add unmapped columns as dynamic data
        unmappedHeaders.forEach((header) => {
          const value = rawRow[header];
          if (value !== undefined && value !== '') {
            data[header] = value;
          }
        });

        // Add JSON schema if present
        if (jsonSchema) data.jsonSchema = jsonSchema;

        // Add description if mapped
        if (mappings.description && rawRow[mappings.description]) {
          data.description = rawRow[mappings.description].trim();
        }

        const batchRow: BatchRow = {
          id: `row-${index + 1}`,
          prompt,
          model,
          system,
          developer,
          temperature,
          data: Object.keys(data).length > 0 ? data : undefined,
        };

        rows.push(batchRow);
      } catch (err) {
        errors.push({
          row: index + 2,
          message: err instanceof Error ? err.message : 'Failed to parse row',
          data: rawRow,
        });
      }
    });

    // Handle Papa parse errors
    if (results.errors.length > 0) {
      results.errors.forEach((error) => {
        const rowNum = error.row !== undefined ? error.row + 1 : 0;
        const hasExistingError = errors.some((e) => e.row === rowNum);

        if (!hasExistingError) {
          errors.push({
            row: rowNum,
            message: `CSV parsing error: ${error.message}`,
          });
        }
      });
    }

    return { rows, errors, mappings, unmappedHeaders };
  } catch (err) {
    errors.push({
      row: 0,
      message: err instanceof Error ? err.message : 'Failed to parse CSV file',
    });
    return { rows, errors, mappings: {}, unmappedHeaders: [] };
  }
}

// Generate improved initial rows for new batches
export function generateInitialRows(count: number = 8): BatchRow[] {
  const templates = [
    { prompt: 'Explain quantum computing in simple terms', model: 'openai/gpt-4o' },
    {
      prompt: 'Write a haiku about artificial intelligence',
      model: 'anthropic/claude-3-5-sonnet-20241022',
    },
    { prompt: 'List the benefits of renewable energy', model: 'gemini/gemini-1.5-pro' },
    { prompt: 'Describe the process of photosynthesis', model: 'openai/gpt-4o-mini' },
    {
      prompt: 'What are the key principles of good UI design?',
      model: 'anthropic/claude-3-5-haiku',
    },
    { prompt: 'Explain machine learning to a 10-year old', model: 'grok/grok-3-mini' },
    { prompt: 'Summarize the history of the internet', model: 'openai/gpt-4o' },
    { prompt: 'Write a brief introduction to blockchain', model: 'gemini/gemini-1.5-flash' },
  ];

  return Array.from({ length: count }, (_, index) => {
    const template = templates[index % templates.length];
    return createEmptyRow(`row-${index + 1}`, {
      prompt: template.prompt,
      model: template.model,
      temperature: 0.7,
    });
  });
}

// Validate and suggest column mappings
export function validateMappings(
  mappings: Record<string, string>,
  headers: string[]
): {
  suggestions: Array<{ canonical: string; suggested: string; confidence: number }>;
  warnings: string[];
} {
  const suggestions: Array<{ canonical: string; suggested: string; confidence: number }> = [];
  const warnings: string[] = [];

  // Find potential mappings for unmapped canonical fields
  Object.keys(HEADER_MAPPINGS).forEach((canonical) => {
    if (mappings[canonical]) return;

    headers.forEach((header) => {
      if (Object.values(mappings).includes(header)) return;

      const normalized = normalizeHeader(header);
      const variants = HEADER_MAPPINGS[canonical];

      for (const variant of variants) {
        const normalizedVariant = normalizeHeader(variant);
        let confidence = 0;

        if (normalized === normalizedVariant) confidence = 1.0;
        else if (normalized.includes(normalizedVariant)) confidence = 0.8;
        else if (normalizedVariant.includes(normalized)) confidence = 0.6;
        else if (normalized.startsWith(normalizedVariant) || normalized.endsWith(normalizedVariant))
          confidence = 0.4;

        if (confidence > 0.3) {
          suggestions.push({ canonical, suggested: header, confidence });
          break;
        }
      }
    });
  });

  // Add warnings for important missing mappings
  if (!mappings.prompt && !mappings.developer) {
    warnings.push('No prompt column detected. Please ensure your CSV has a column for prompts.');
  }

  if (!mappings.model) {
    warnings.push('No model column detected. Default model will be used for all rows.');
  }

  return {
    suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
    warnings,
  };
}
