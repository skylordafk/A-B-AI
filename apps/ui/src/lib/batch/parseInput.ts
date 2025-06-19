import Papa from 'papaparse';
import type { BatchRow, RowError } from '../../types/batch';

type _ParsedCsvRow = Record<string, string | undefined>;

export async function parseInput(file: File): Promise<{ rows: BatchRow[]; errors: RowError[] }> {
  const rows: BatchRow[] = [];
  const errors: RowError[] = [];

  const text = await file.text();
  const extension = file.name.toLowerCase().split('.').pop();

  if (extension === 'csv') {
    // Parse CSV
    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    // Validate required columns
    const headers = results.meta.fields || [];
    if (!headers.includes('prompt')) {
      errors.push({
        row: 0,
        message: 'CSV must have a "prompt" column',
      });
      return { rows, errors };
    }

    // Process each row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results.data.forEach((row: any, index: number) => {
      try {
        if (!row.prompt || row.prompt.trim() === '') {
          errors.push({
            row: index + 2, // +2 because CSV is 1-indexed and has header
            message: 'Row missing prompt',
            data: row,
          });
          return;
        }

        const devPrompt = row.developer?.trim();
        const batchRow: BatchRow = {
          id: `row-${index + 1}`,
          prompt: row.prompt.trim(),
          model: row.model?.trim(),
          system: row.system?.trim() || undefined,
          developer: devPrompt,
          temperature: row.temperature ? parseFloat(row.temperature) : undefined,
          data: row,
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
  } else if (extension === 'json') {
    // Parse JSON
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items.forEach((item: any, index) => {
        try {
          if (!item.prompt || typeof item.prompt !== 'string') {
            errors.push({
              row: index + 1,
              message: 'Item missing prompt string',
              data: item,
            });
            return;
          }

          const batchRow: BatchRow = {
            id: `row-${index + 1}`,
            prompt: item.prompt.trim(),
            model: item.model?.trim(),
            system: item.system?.trim() || undefined,
            developer: (item.developer as string | undefined)?.trim(),
            temperature: typeof item.temperature === 'number' ? item.temperature : undefined,
            data: item,
          };

          // Validate temperature if provided
          if (
            batchRow.temperature !== undefined &&
            (batchRow.temperature < 0 || batchRow.temperature > 2)
          ) {
            errors.push({
              row: index + 1,
              message: 'Temperature must be between 0 and 2',
              data: item,
            });
            return;
          }

          // Fallback: if system prompt is missing but developer is provided, treat developer as system for non-o models later
          if (!batchRow.system && batchRow.developer) {
            batchRow.system = batchRow.developer;
          }

          rows.push(batchRow);
        } catch (err) {
          errors.push({
            row: index + 1,
            message: err instanceof Error ? err.message : 'Failed to parse item',
            data: item,
          });
        }
      });
    } catch (err) {
      errors.push({
        row: 0,
        message: err instanceof Error ? err.message : 'Invalid JSON format',
      });
    }
  } else {
    errors.push({
      row: 0,
      message: 'Unsupported file format. Please use CSV or JSON.',
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
