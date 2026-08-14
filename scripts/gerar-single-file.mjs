/**
 * Empacota o build em um único arquivo HTML autocontido.
 *
 * Usado para publicar o simulador como página estática única (Artifact, anexo de
 * e-mail, pasta compartilhada) sem precisar de servidor. O build normal em `dist/`
 * continua sendo o alvo para hospedagem convencional.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dist = 'dist';
const assets = readdirSync(join(dist, 'assets'));
const js = assets.find((f) => f.endsWith('.js'));
const css = assets.find((f) => f.endsWith('.css'));

const codigoJs = readFileSync(join(dist, 'assets', js), 'utf8');
const codigoCss = readFileSync(join(dist, 'assets', css), 'utf8');

const html = readFileSync(join(dist, 'index.html'), 'utf8')
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, '')
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/, '')
  .replace(/<link[^>]*rel="icon"[^>]*>/, '')
  // Substituição por função: em replacement string, $&, $` e $' seriam interpretados
  // como padrões e corromperiam o bundle minificado.
  .replace('</head>', () => `<style>\n${codigoCss}\n</style>\n</head>`)
  .replace('</body>', () => `<script type="module">\n${codigoJs}\n</script>\n</body>`);

const saida = process.argv[2] ?? 'dist/simulador-completo.html';
writeFileSync(saida, html);
console.log(`${saida} — ${(html.length / 1024).toFixed(0)} KB`);
