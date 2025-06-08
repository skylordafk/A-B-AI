import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';

/**
 * Remark plugin that merges adjacent code blocks with the same language.
 * This prevents the diff viewer from breaking when multiple code blocks
 * are rendered consecutively.
 */
export default function mergeAdjacentCodeFences() {
  return (tree: Root) => {
    const nodesToRemove: number[] = [];

    visit(tree, 'code', (node: Code, index: number | null, parent: any) => {
      if (index === null || !parent || !parent.children) return;

      // Look for the next sibling
      let nextIndex = index + 1;

      // Skip any whitespace-only text nodes
      while (nextIndex < parent.children.length) {
        const nextNode = parent.children[nextIndex];

        if (nextNode.type === 'text' && nextNode.value.trim() === '') {
          nextIndex++;
          continue;
        }

        // If the next non-whitespace node is a code block with the same language
        if (nextNode.type === 'code' && nextNode.lang === node.lang && node.lang !== null) {
          // Merge the content
          node.value = node.value + '\n\n' + nextNode.value;

          // Mark nodes for removal (including whitespace nodes in between)
          for (let i = index + 1; i <= nextIndex; i++) {
            nodesToRemove.push(i);
          }
        }

        break;
      }
    });

    // Remove marked nodes in reverse order to maintain indices
    nodesToRemove.sort((a, b) => b - a);

    visit(tree, (node: any, index: number | null, parent: any) => {
      if (parent && parent.children && nodesToRemove.includes(index!)) {
        parent.children.splice(index!, 1);
      }
    });
  };
}
