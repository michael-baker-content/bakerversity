/** Standalone HTML download. The fragment comes from Tiptap's HTML serializer.
 * @param {string} fragment */
export function htmlDownloadDocument(fragment) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lesson</title>
<style>
.slideshow-slide { margin:24px 0; break-inside:avoid; } .slideshow-slide img { max-height:520px; object-fit:contain; }

.text-image,.text-image-editor { container-type:inline-size; min-width:0; margin:1.25rem 0; }
.text-image-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:24px; align-items:start; }
.text-image-grid > * { min-width:0; max-width:100%; }
.text-image-grid > [data-node-view-content-react] { display:contents; }
.text-image-body { overflow-wrap:anywhere; }
.text-image-grid > [data-node-view-content-react] > * { min-width:0; max-width:100%; }
.text-image-grid img { max-width:100%; height:auto; }
.text-image-editor { border:1px solid var(--border); border-radius:8px; padding:12px; }
.text-image-editor[data-selected=true] { outline:2px solid var(--indigo); }
.text-image-controls { display:flex; flex-wrap:wrap; gap:4px; border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:12px; }
.text-image-controls > span { font-size:12px; font-weight:600; padding:8px; cursor:grab; }
.text-image-editor .text-image-body { min-height:100px; border:1px dashed var(--border); padding:8px; }
.text-image-editor[data-stacked=true] .text-image-grid { grid-template-columns:minmax(0,1fr); }
@container (max-width: 540px) { .text-image-grid { grid-template-columns:minmax(0,1fr); } }
@media print { .text-image { break-inside:avoid; } }

body{font:16px/1.7 system-ui,sans-serif;max-width:900px;margin:32px auto;padding:0 20px;color:#1a1814;background:#e9e6de}
img{max-width:100%;height:auto} pre{overflow-x:auto} table{border-collapse:collapse} td,th{border:1px solid #969083;padding:8px}
pre[data-directory-tree]{--tree-bg:#e1e7dd;--tree-header:#d3ddce;--tree-accent:#355141;box-sizing:border-box;width:fit-content;max-width:100%;margin:16px auto;padding:10px 12px;border:1px solid #969083;border-top:3px solid var(--tree-accent);border-radius:10px;background:var(--tree-bg);font:13px/1.45 Consolas,monospace;white-space:pre;overflow-x:auto;tab-size:4}
pre[data-directory-tree]::before{content:attr(data-tree-title);display:block;white-space:normal;font:600 13px/1.5 system-ui,sans-serif;color:var(--tree-accent);padding-bottom:8px}
pre[data-tree-color="indigo"]{--tree-bg:#e7e5ef;--tree-accent:#403577}
pre[data-tree-color="amber"]{--tree-bg:#eee3ca;--tree-accent:#704800}
@media(prefers-color-scheme:dark){body{background:#222218;color:#f5f0e8}pre[data-directory-tree]{--tree-bg:#232b24;--tree-accent:#abc9ac}pre[data-tree-color="indigo"]{--tree-bg:#242337;--tree-accent:#c3bcf5}pre[data-tree-color="amber"]{--tree-bg:#30291c;--tree-accent:#f3cc78}}
@media print{body{color:#000;background:#fff;max-width:none;margin:0}pre[data-directory-tree]{color:#000;background:#fff;white-space:pre-wrap;overflow:visible;overflow-wrap:anywhere}pre[data-directory-tree]::before{color:#000}}

/* Align the text within the image-height row; stacked rows keep their natural height. */
.text-image-body { align-self:stretch; display:flex; flex-direction:column; justify-content:var(--text-image-justify,flex-start); }
.text-image-body > :last-child { margin-bottom:0; }
[data-text-vertical-align="top"] { --text-image-justify:flex-start; }
[data-text-vertical-align="center"] { --text-image-justify:center; }
[data-text-vertical-align="bottom"] { --text-image-justify:flex-end; }


/* Component layout owns image sizing, including older saved image settings. */
.text-image-grid img { display:block; width:100%!important; max-width:100%!important; height:auto; margin-left:auto!important; margin-right:auto!important; }
.text-image-grid figure, .text-image-grid .media-image { width:100%!important; max-width:100%!important; margin-left:auto!important; margin-right:auto!important; }

/* Slides always center their images; ordinary images retain alignment controls. */
.slideshow-slide img, .slideshow-slide figure, .slideshow-slide .media-image { margin-left:auto!important; margin-right:auto!important; }
</style></head><body>${fragment}</body></html>`
}
