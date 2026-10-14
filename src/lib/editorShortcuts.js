export const shortcutKey = (event) => event.code?.startsWith('Key') ? event.code.slice(3).toLowerCase() : event.key.toLowerCase();
const isAltGraphShortcut = (event) => event.ctrlKey && (event.altKey || event.getModifierState?.('AltGraph'));
export const shouldIgnoreEditorShortcut = (event) => event.defaultPrevented || isTyping(event.target) || isAltGraphShortcut(event);

const consume = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

export function handleClipboardShortcut(event, board, clipboard) {
  const mod = event.metaKey || (event.ctrlKey && !isAltGraphShortcut(event));
  if (!mod || isTyping(event.target)) return false;

  switch (shortcutKey(event)) {
    case 'c': {
      const copied = board.copySelection();
      if (!copied.nodes.length && !copied.edges.length) return false;
      consume(event);
      clipboard.value = copied;
      return true;
    }
    case 'v':
      if (!clipboard.value?.nodes?.length && !clipboard.value?.edges?.length) return false;
      consume(event);
      board.pasteSelection(clipboard.value);
      return true;
    case 'x': {
      const copied = board.copySelection();
      if (!copied.nodes.length && !copied.edges.length) return false;
      consume(event);
      clipboard.value = copied;
      board.deleteNodes(board.selectedNodes, board.selectedEdges);
      return true;
    }
    case 'z':
      consume(event);
      if (event.shiftKey) board.redo();
      else board.undo();
      return true;
    default:
      return false;
  }
}

const isTyping = (target) => {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
};
