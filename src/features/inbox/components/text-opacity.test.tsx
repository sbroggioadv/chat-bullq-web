import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('não atenua texto ativo nas mensagens e ajudas de Conversas', () => {
  const files = ['chat-panel.tsx', 'media-bubbles.tsx', 'audio-message-player.tsx',
    'conversation-ai-toggle.tsx', 'bulk-ai-popover.tsx', 'share-contact-dialog.tsx', 'chat-input.tsx'];
  const violations: string[] = [];
  for (const name of files) {
    const source = readFileSync(new URL(name, import.meta.url), 'utf8');
    const tree = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isJsxOpeningElement(node) && /^(p|span|li)$/.test(node.tagName.getText(tree))) {
        const opening = node.getText(tree);
        if (/(?<![\w:-])opacity-(?:0|[1-9]\d?)(?!\d)/.test(opening) && !opening.includes('animate-ping')) {
          violations.push(`${name}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  const rename = readFileSync(new URL('rename-conversation-dialog.tsx', import.meta.url), 'utf8');
  expect(rename).not.toMatch(/hover:opacity-(?:[1-9]\d?|0)(?!\d)/);
  expect(violations).toEqual([]);
});
