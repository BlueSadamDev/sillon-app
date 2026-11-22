// Actions de la barre d'outils Markdown (calcul pur) : chaque action reçoit le texte et la sélection,
// et renvoie le nouveau texte et la nouvelle sélection.

export type Selection = { start: number; end: number };
export type Edit = { text: string; selection: Selection };
export type Action = 'heading' | 'bold' | 'italic' | 'list' | 'task' | 'link';

/** Début et fin des lignes touchées par la sélection. */
function lineRange(text: string, sel: Selection): { from: number; to: number } {
  const from = text.lastIndexOf('\n', sel.start - 1) + 1;
  const nl = text.indexOf('\n', sel.end);
  return { from, to: nl === -1 ? text.length : nl };
}

/** Applique une transformation à chaque ligne sélectionnée, en suivant le décalage du curseur. */
function mapLines(text: string, sel: Selection, change: (line: string, all: string[]) => string): Edit {
  const { from, to } = lineRange(text, sel);
  const lines = text.slice(from, to).split('\n');
  const changed = lines.map((l) => change(l, lines));
  const block = changed.join('\n');
  const firstDelta = changed[0].length - lines[0].length;
  const totalDelta = block.length - (to - from);
  return {
    text: text.slice(0, from) + block + text.slice(to),
    selection: {
      start: Math.max(from, sel.start + firstDelta),
      end: Math.max(from, sel.end + totalDelta),
    },
  };
}

const HEADING = /^(#{1,6})\s+/;
const TASK = /^(\s*)[-*+]\s+\[[ xX]\]\s+/;
const BULLET = /^(\s*)[-*+]\s+/;

/** Titre : aucun → « # » → « ## » → aucun. */
function heading(line: string): string {
  const m = line.match(HEADING);
  if (!m) return `# ${line}`;
  const rest = line.slice(m[0].length);
  return m[1].length === 1 ? `## ${rest}` : rest;
}

/** Entoure la sélection (ou insère la paire et place le curseur au milieu) ; retire si déjà entourée. */
function wrap(text: string, sel: Selection, mark: string): Edit {
  const before = text.slice(sel.start - mark.length, sel.start);
  const after = text.slice(sel.end, sel.end + mark.length);
  if (before === mark && after === mark) {
    return {
      text: text.slice(0, sel.start - mark.length) + text.slice(sel.start, sel.end) + text.slice(sel.end + mark.length),
      selection: { start: sel.start - mark.length, end: sel.end - mark.length },
    };
  }
  return {
    text: text.slice(0, sel.start) + mark + text.slice(sel.start, sel.end) + mark + text.slice(sel.end),
    selection: { start: sel.start + mark.length, end: sel.end + mark.length },
  };
}

function link(text: string, sel: Selection): Edit {
  return {
    text: text.slice(0, sel.start) + '[[' + text.slice(sel.start, sel.end) + ']]' + text.slice(sel.end),
    selection: { start: sel.start + 2, end: sel.end + 2 },
  };
}

export function applyAction(action: Action, text: string, selection: Selection): Edit {
  const sel = { start: Math.min(selection.start, selection.end), end: Math.max(selection.start, selection.end) };
  switch (action) {
    case 'heading':
      return mapLines(text, sel, heading);
    case 'bold':
      return wrap(text, sel, '**');
    case 'italic':
      return wrap(text, sel, '*');
    case 'link':
      return link(text, sel);
    case 'list': {
      // Si toutes les lignes sont déjà des puces, on les retire ; sinon on en ajoute.
      return mapLines(text, sel, (line, all) => {
        const allBullets = all.every((l) => BULLET.test(l) && !TASK.test(l));
        if (allBullets) return line.replace(BULLET, '$1');
        if (TASK.test(line)) return line.replace(TASK, '$1- ');
        return BULLET.test(line) ? line : `- ${line}`;
      });
    }
    case 'task': {
      return mapLines(text, sel, (line, all) => {
        if (all.every((l) => TASK.test(l))) return line.replace(TASK, '$1');
        if (TASK.test(line)) return line;
        if (BULLET.test(line)) return line.replace(BULLET, '$1- [ ] ');
        return `- [ ] ${line}`;
      });
    }
  }
}

/**
 * Retour à la ligne dans une liste : continue la puce ou la case (« - », « - [ ] », « 1. »).
 * Sur une puce vide, la retire (fin de liste). Renvoie null si rien de spécial n'est à faire.
 */
export function continueList(previous: string, next: string): Edit | null {
  if (next.length !== previous.length + 1) return null;
  let at = -1;
  for (let i = 0; i < next.length; i++) {
    if (next[i] !== previous[i]) {
      at = i;
      break;
    }
  }
  if (at === -1 || next[at] !== '\n') return null;
  const lineStart = previous.lastIndexOf('\n', at - 1) + 1;
  const line = previous.slice(lineStart, at);
  const m = line.match(/^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|(\d+)([.)])\s+)/);
  if (!m) return null;
  if (line.length === m[0].length) {
    // Puce vide : on sort de la liste.
    return { text: previous.slice(0, lineStart) + previous.slice(at), selection: { start: lineStart, end: lineStart } };
  }
  let marker = m[2];
  if (m[3]) marker = `${Number(m[3]) + 1}${m[4]} `;
  else if (/\[[xX]\]/.test(marker)) marker = marker.replace(/\[[xX]\]/, '[ ]');
  const insert = '\n' + m[1] + marker;
  const cursor = at + insert.length;
  return { text: previous.slice(0, at) + insert + previous.slice(at), selection: { start: cursor, end: cursor } };
}
