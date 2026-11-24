// Page HTML du PDF partagé (F10, lot 2.1), calcul pur. Mise en forme du mode lecture (DESIGN.md) :
// police Satoshi intégrée au fichier, encre sur papier, cases à cocher dessinées, citations avec un trait.
// Pas d'élément d'interface (ni bouton, ni date, ni tag ajouté).
// Sûreté : le HTML écrit dans une note s'affiche comme du texte et les images sont remplacées par leur
// légende ; la page ne charge donc jamais rien depuis Internet.
import { Marked, type Tokens } from 'marked';

import { colors } from '@/theme';

import type { SharedNote } from './content';

export type PdfFonts = { regular: string; bold: string };

/** Taille de page A4, en points (1/72 de pouce), pour expo-print. */
export const A4 = { width: 595, height: 842 };

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const marked = new Marked({
  gfm: true,
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(text);
    },
    image({ text }: Tokens.Image) {
      return escapeHtml(text);
    },
    checkbox({ checked }: Tokens.Checkbox) {
      return `<span class="box${checked ? ' on' : ''}"></span>`;
    },
    listitem(item: Tokens.ListItem) {
      const cls = item.task ? ` class="task${item.checked ? ' done' : ''}"` : '';
      return `<li${cls}>${this.parser.parse(item.tokens)}</li>\n`;
    },
  },
});

/** Corps d'une note en HTML. */
export function bodyHtml(markdown: string): string {
  return marked.parse(markdown, { async: false });
}

function css(fonts: PdfFonts): string {
  return `
@font-face { font-family: 'Satoshi'; font-weight: 400; src: url(data:font/ttf;base64,${fonts.regular}) format('truetype'); }
@font-face { font-family: 'Satoshi'; font-weight: 700; src: url(data:font/ttf;base64,${fonts.bold}) format('truetype'); }
@page { size: A4; margin: 20mm 20mm 22mm 20mm; }
html, body { margin: 0; padding: 0; background: #FFFFFF; }
body { font-family: 'Satoshi', sans-serif; font-weight: 400; font-size: 11.5pt; line-height: 1.6; color: ${colors.ink}; }
h1.note, h2.note { font-weight: 700; line-height: 1.15; margin: 0 0 14pt 0; }
h1.note { font-size: 22pt; }
h2.note { font-size: 17pt; margin-top: 22pt; padding-top: 16pt; border-top: 1px solid ${colors.line}; }
.body h1, .body h2, .body h3, .body h4, .body h5, .body h6 { font-weight: 700; line-height: 1.25; margin: 14pt 0 6pt 0; }
.body h1 { font-size: 16pt; } .body h2 { font-size: 14pt; } .body h3 { font-size: 12.5pt; }
.body h4, .body h5, .body h6 { font-size: 11.5pt; }
p { margin: 0 0 8pt 0; }
strong { font-weight: 700; }
em { font-style: italic; }
a { color: ${colors.accentText}; text-decoration: underline; }
ul, ol { margin: 0 0 8pt 0; padding-left: 18pt; }
li { margin: 2pt 0; }
li > p { margin: 0; }
li.task { list-style: none; margin-left: -18pt; }
li.task.done { color: ${colors.inkMuted}; text-decoration: line-through; }
.box { display: inline-block; box-sizing: border-box; width: 10pt; height: 10pt; margin: 0 6pt -1pt 0;
  border: 1.4pt solid ${colors.accent}; border-radius: 2pt; }
.box.on { background: ${colors.accent}; }
blockquote { margin: 0 0 8pt 0; padding: 0 0 0 10pt; border-left: 2px solid ${colors.quoteBar}; color: ${colors.inkSoft}; font-style: italic; }
code { font-family: monospace; font-size: 10pt; background: ${colors.surfaceAlt}; padding: 0 2pt; border-radius: 2pt; }
pre { background: ${colors.surface}; border: 1px solid ${colors.line}; border-radius: 4pt; padding: 8pt; white-space: pre-wrap; }
pre code { background: none; padding: 0; }
hr { border: none; border-top: 1px solid ${colors.line}; margin: 12pt 0; }
table { border-collapse: collapse; margin: 0 0 8pt 0; }
th, td { border: 1px solid ${colors.line}; padding: 3pt 6pt; text-align: left; }
`;
}

/** Page HTML complète : la note, puis ses sous-notes à la suite, chacune sous son titre. */
export function sharedHtml(list: SharedNote[], untitled: string, fonts: PdfFonts): string {
  const sections = list
    .map((n, i) => {
      const tag = i === 0 ? 'h1' : 'h2';
      const title = escapeHtml(n.title.trim() === '' ? untitled : n.title.trim());
      return `<section><${tag} class="note">${title}</${tag}>\n<div class="body">${bodyHtml(n.body)}</div></section>`;
    })
    .join('\n');
  const docTitle = escapeHtml(list[0]?.title.trim() || untitled);
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${docTitle}</title><style>${css(fonts)}</style></head>
<body>
${sections}
</body></html>
`;
}
