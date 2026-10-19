import { all, createLowlight } from 'lowlight'

// Shared by the editor and student renderer so saved language identifiers agree.
export function createCodeHighlighter() {
  const highlighter = createLowlight(all)
  highlighter.registerAlias({ xml: ['xliff', 'xlf', 'tmx', 'tbx'] })
  return highlighter
}
