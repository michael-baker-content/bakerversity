import { Mark } from '@tiptap/core'

// An inline language override, independent of code-block syntax languages.
export const TextLanguage = Mark.create({
  name: 'textLanguage',
  inclusive: false,
  addAttributes() {
    return {
      language: {
        default: null,
        parseHTML: element => ['en', 'pl'].includes(element.getAttribute('lang') ?? '') ? element.getAttribute('lang') : null,
        renderHTML: attributes => ['en', 'pl'].includes(attributes.language) ? { lang: attributes.language } : {},
      },
    }
  },
  parseHTML() { return [{ tag: 'span[lang="en"]' }, { tag: 'span[lang="pl"]' }] },
  renderHTML({ HTMLAttributes }) { return ['span', HTMLAttributes, 0] },
})
