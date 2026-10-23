import { Mark } from '@tiptap/core'
import { normalizeTextLanguage } from '../../lib/textLanguages.mjs'

// An inline language override, independent of code-block syntax languages.
export const TextLanguage = Mark.create({
  name: 'textLanguage',
  inclusive: false,
  addAttributes() {
    return {
      language: {
        default: null,
        parseHTML: element => normalizeTextLanguage(element.getAttribute('lang')),
        renderHTML: attributes => normalizeTextLanguage(attributes.language) ? { lang: normalizeTextLanguage(attributes.language) } : {},
      },
    }
  },
  parseHTML() { return [{ tag: 'span[lang]', getAttrs: element => normalizeTextLanguage(element.getAttribute('lang')) ? null : false }] },
  renderHTML({ HTMLAttributes }) { return ['span', HTMLAttributes, 0] },
})
