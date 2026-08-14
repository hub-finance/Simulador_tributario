/**
 * Variante do empacotamento para publicação como Artifact.
 *
 * O host envolve o conteúdo em <!doctype html><head></head><body>, então aqui
 * saem apenas <title>, <style>, a raiz da aplicação e o <script>.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const assets = readdirSync('dist/assets');
const js = readFileSync(join('dist/assets', assets.find((f) => f.endsWith('.js'))), 'utf8');
const css = readFileSync(join('dist/assets', assets.find((f) => f.endsWith('.css'))), 'utf8');

const saida = process.argv[2] ?? 'dist/artifact.html';
writeFileSync(
  saida,
  `<title>Simulador de Transição Tributária</title>\n<style>\n${css}\n</style>\n<div id="root"></div>\n<script type="module">\n${js}\n</script>\n`,
);
console.log(`${saida} — ${(readFileSync(saida, 'utf8').length / 1024).toFixed(0)} KB`);
