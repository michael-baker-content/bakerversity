import {slideshowError} from './slideshow.mjs'
import {footnoteError} from './footnotes.mjs'
import {textImageError} from './textImage.mjs'
/** Shared validation boundary for saved, pasted, and edited documents.
 * Keep error precedence stable for existing recovery and authoring flows. */
export function documentError(document){
 return slideshowError(document)||footnoteError(document)||textImageError(document)
}
