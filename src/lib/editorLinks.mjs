/** Shared policy for authored links; generated page-navigation anchors are separate. */
export const editorLinkAttributes = { target: '_blank', rel: 'noopener noreferrer' }
export const editorLinkOptions = { openOnClick: false, autolink: false, HTMLAttributes: editorLinkAttributes }
/** @param {unknown} value */
export function isEditorLink(value) {
 if (typeof value !== 'string') return false
 const href=value.trim()
 return /^(https?:\/\/|mailto:|\/(?!\/)|#)\S+/i.test(href) && !/[\s\u0000-\u001f\u007f]/.test(href)
}
/** @param {string} href */
export function editorLink(href) { return { href: href.trim(), ...editorLinkAttributes } }
