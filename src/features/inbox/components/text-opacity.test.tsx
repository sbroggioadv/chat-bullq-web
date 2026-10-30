import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

function violationsIn(source: string, name: string): string[] {
  const tree = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement.getText(tree);
      // Apenas classe incondicional; variantes disabled e data-[closed] não são estado ativo.
      const opacity = /(?<![\w:\]-])opacity-(?:0|[1-9]\d?)(?!\d)/.test(opening);
      const disabledBranch = opening.includes("'cursor-not-allowed opacity-40'");
      function hasText(child: ts.Node): boolean {
        if (ts.isJsxText(child) && child.getText(tree).trim()) return true;
        return ts.forEachChild(child, hasText) === true;
      }
      if (opacity && !disabledBranch && node.children.some(hasText)) {
        violations.push(`${name}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return violations;
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? tsxFiles(path) : entry.isFile() && path.endsWith('.tsx') ? [path] : [];
  });
}

it('detecta opacidade em ancestral de texto e preserva exceções explícitas', () => {
  expect(violationsIn('<div className="opacity-70"><span>Texto ativo</span></div>', 'controle.tsx')).toHaveLength(1);
  expect(violationsIn('<button className="disabled:opacity-50">Desabilitado</button>', 'controle.tsx')).toEqual([]);
  expect(violationsIn("<label className={disabled ? 'cursor-not-allowed opacity-40' : ''}>Desabilitado</label>", 'controle.tsx')).toEqual([]);
  expect(violationsIn('<div className="data-[closed]:opacity-0">Transição</div>', 'controle.tsx')).toEqual([]);
  expect(violationsIn('<motion.div initial={{opacity: 0}} exit={{opacity: 0}}>Transição</motion.div>', 'controle.tsx')).toEqual([]);
  expect(violationsIn('<div className="opacity-100">Texto</div>', 'controle.tsx')).toEqual([]);
});

it('não atenua texto ativo nas mensagens e ajudas de Conversas', () => {
  const files = tsxFiles(join(process.cwd(), 'src/features/inbox'));
  const violations = files.flatMap((name) => violationsIn(readFileSync(name, 'utf8'), name));
  const renameName = 'rename-conversation-dialog.tsx';
  const rename = readFileSync(new URL(renameName, import.meta.url), 'utf8');
  expect(rename).not.toMatch(/hover:opacity-(?:[1-9]\d?|0)(?!\d)/);
  const bulkName = 'bulk-ai-popover.tsx';
  const bulk = readFileSync(new URL(bulkName, import.meta.url), 'utf8');
  expect(bulk).not.toMatch(/<p[^>]*text-zinc-500/);
  expect(violations).toEqual([]);
});
