import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import mergeAdjacentCodeFences from './markdown';

describe('mergeAdjacentCodeFences', () => {
  it('should keep three code blocks with different languages separate', async () => {
    const input = `
\`\`\`javascript
const a = 1;
\`\`\`

\`\`\`python
b = 2
\`\`\`

\`\`\`typescript
const c: number = 3;
\`\`\`
`;

    const processor = unified().use(remarkParse).use(mergeAdjacentCodeFences).use(remarkStringify);

    const result = await processor.process(input);
    const output = String(result);

    // Count the number of code blocks in the output
    const codeBlockCount = (output.match(/```/g) || []).length / 2;
    expect(codeBlockCount).toBe(3);

    // Verify each language is preserved
    expect(output).toContain('```javascript');
    expect(output).toContain('```python');
    expect(output).toContain('```typescript');
  });

  it('should merge adjacent code blocks with the same language', async () => {
    const input = `
\`\`\`javascript
const a = 1;
\`\`\`

\`\`\`javascript
const b = 2;
\`\`\`
`;

    const processor = unified().use(remarkParse).use(mergeAdjacentCodeFences).use(remarkStringify);

    const result = await processor.process(input);
    const output = String(result);

    // Should have only one code block
    const codeBlockCount = (output.match(/```/g) || []).length / 2;
    expect(codeBlockCount).toBe(1);

    // Should contain both code snippets
    expect(output).toContain('const a = 1;');
    expect(output).toContain('const b = 2;');
  });

  it('should not merge code blocks with no language specified', async () => {
    const input = `
\`\`\`
plain text 1
\`\`\`

\`\`\`
plain text 2
\`\`\`
`;

    const processor = unified().use(remarkParse).use(mergeAdjacentCodeFences).use(remarkStringify);

    const result = await processor.process(input);
    const output = String(result);

    // Should keep both blocks separate (no language means no merge)
    const codeBlockCount = (output.match(/```/g) || []).length / 2;
    expect(codeBlockCount).toBe(2);
  });
});
