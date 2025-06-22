import Papa from 'papaparse';
import type { BatchRow, RowError } from '../../types/batch';

type _ParsedCsvRow = Record<string, string | undefined>;

export async function parseInput(file: File): Promise<{ rows: BatchRow[]; errors: RowError[] }> {
  const rows: BatchRow[] = [];
  const errors: RowError[] = [];

  const text = await file.text();
  const extension = file.name.toLowerCase().split('.').pop();

  if (extension !== 'csv') {
    errors.push({
      row: 0,
      message: 'Only CSV files are supported. Please upload a .csv file.',
    });
    return { rows, errors };
  }

  // Parse CSV
  const results = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  // Validate required columns – either prompt or developer must exist
  const headers = results.meta.fields || [];
  if (!headers.includes('prompt') && !headers.includes('developer')) {
    errors.push({
      row: 0,
      message: 'CSV must have either a "prompt" or "developer" column',
    });
    return { rows, errors };
  }

  // Process each row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results.data.forEach((row: any, index: number) => {
    try {
      if (
        (!row.prompt || row.prompt.trim() === '') &&
        (!row.developer || row.developer.trim() === '')
      ) {
        errors.push({
          row: index + 2, // +2 because CSV is 1-indexed and has header
          message: 'Row missing prompt',
          data: row,
        });
        return;
      }

      if (!row.prompt && row.developer) {
        row.prompt = row.developer;
      }

      const devPrompt = row.developer?.trim();

      // Create a clean data object without the fixed columns
      const cleanData = { ...row };
      delete cleanData.prompt;
      delete cleanData.system;
      delete cleanData.model;
      delete cleanData.temperature;
      delete cleanData.developer;

      // Handle JSON mode and schema columns with various naming conventions
      let jsonMode: boolean | undefined;
      let jsonSchema: string | undefined;

      // Check for json_mode column (standard CSV format)
      if ('json_mode' in cleanData) {
        jsonMode =
          cleanData.json_mode === 'true' ||
          cleanData.json_mode === '1' ||
          cleanData.json_mode === 'yes';
        delete cleanData.json_mode;
      }
      // Check for jsonMode column (camelCase format)
      else if ('jsonmode' in cleanData) {
        jsonMode =
          cleanData.jsonmode === 'true' ||
          cleanData.jsonmode === '1' ||
          cleanData.jsonmode === 'yes';
        delete cleanData.jsonmode;
      }

      // Check for json_schema column (standard CSV format)
      if ('json_schema' in cleanData) {
        jsonSchema = cleanData.json_schema?.trim() || undefined;
        delete cleanData.json_schema;
      }
      // Check for jsonSchema column (camelCase format)
      else if ('jsonschema' in cleanData) {
        jsonSchema = cleanData.jsonschema?.trim() || undefined;
        delete cleanData.jsonschema;
      }

      // Add JSON mode and schema to data object if they exist
      if (jsonMode !== undefined || jsonSchema !== undefined) {
        cleanData.jsonMode = jsonMode;
        cleanData.jsonSchema = jsonSchema;
      }

      const batchRow: BatchRow = {
        id: `row-${index + 1}`,
        prompt: row.prompt.trim(),
        model: row.model?.trim(),
        system: row.system?.trim() || undefined,
        developer: devPrompt,
        temperature: row.temperature ? parseFloat(row.temperature) : undefined,
        data: cleanData,
      };

      // Fallback: if system prompt is missing but developer is provided, treat developer as system for non-o models later
      if (!batchRow.system && batchRow.developer) {
        batchRow.system = batchRow.developer;
      }

      // Validate temperature if provided
      if (
        batchRow.temperature !== undefined &&
        (isNaN(batchRow.temperature) || batchRow.temperature < 0 || batchRow.temperature > 2)
      ) {
        errors.push({
          row: index + 2,
          message: 'Temperature must be between 0 and 2',
          data: row,
        });
        return;
      }

      rows.push(batchRow);
    } catch (err) {
      errors.push({
        row: index + 2,
        message: err instanceof Error ? err.message : 'Failed to parse row',
        data: row,
      });
    }
  });

  // Handle Papa parse errors - but skip errors for rows we already validated
  if (results.errors.length > 0) {
    results.errors.forEach((error) => {
      // Only add parse errors if we don't already have an error for that row
      const rowNum = error.row !== undefined ? error.row + 1 : 0;
      const hasExistingError = errors.some((e) => e.row === rowNum);

      if (!hasExistingError) {
        errors.push({
          row: rowNum,
          message: error.message,
        });
      }
    });
  }

  return { rows, errors };
}

export function substituteTemplateVars(
  prompt: string,
  row: Record<string, unknown>
): { output: string; missing: string[] } {
  const missing: string[] = [];

  const output = prompt.replace(/\{\{(.*?)\}\}/g, (_, raw) => {
    const key = raw.trim();
    if (key in row && row[key] !== undefined && row[key] !== '') {
      return String(row[key]);
    }
    missing.push(key);
    return `{{${key}}}`; // keep placeholder for easier diffing
  });

  return { output, missing };
}
