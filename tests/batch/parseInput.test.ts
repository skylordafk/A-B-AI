import { describe, it, expect } from 'vitest';
import { parseInput } from '../../apps/ui/src/lib/batch/parseInput';

// Mock File for Node.js environment
class MockFile {
  name: string;
  content: string;

  constructor(content: string[], name: string) {
    this.name = name;
    this.content = content.join('');
  }

  async text() {
    return this.content;
  }
}

describe('parseInput', () => {
  it('should parse valid CSV with all columns', async () => {
    const csvContent = `prompt,model,system,temperature
"What is AI?",openai/gpt-4.1-mini,"You are helpful",0.7
"Explain ML",anthropic/claude-3-haiku,,0.5`;

    const file = new MockFile([csvContent], 'test.csv') as any;
    const result = await parseInput(file);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      id: 'row-1',
      prompt: 'What is AI?',
      model: 'openai/gpt-4.1-mini',
      system: 'You are helpful',
      temperature: 0.7,
    });
  });

  it('should quarantine rows with missing prompt', async () => {
    const csvContent = `prompt,model,system,temperature
"What is AI?",openai/gpt-4.1-mini,"You are helpful",0.7
,anthropic/claude-3-haiku,,0.5
"Valid prompt",,,,`;

    const file = new MockFile([csvContent], 'test.csv') as any;
    const result = await parseInput(file);

    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      row: 3,
      message: 'Row missing prompt',
    });
  });

  it('should reject CSV without prompt column', async () => {
    const csvContent = `model,system,temperature
openai/gpt-4.1-mini,"You are helpful",0.7`;

    const file = new MockFile([csvContent], 'test.csv') as any;
    const result = await parseInput(file);

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('must have a "prompt" column');
  });

  it('should parse valid JSON array', async () => {
    const jsonContent = JSON.stringify([
      {
        prompt: 'What is AI?',
        model: 'openai/gpt-4.1-mini',
        system: 'You are helpful',
        temperature: 0.7,
      },
    ]);

    const file = new MockFile([jsonContent], 'test.json') as any;
    const result = await parseInput(file);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
  });

  it('should validate temperature range', async () => {
    const csvContent = `prompt,model,system,temperature
"Valid temp",,,1.5
"Invalid temp",,,3.0
"Another invalid",,,-0.5`;

    const file = new MockFile([csvContent], 'test.csv') as any;
    const result = await parseInput(file);

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].message).toContain('Temperature must be between 0 and 2');
  });
});
