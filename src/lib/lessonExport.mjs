/** Standalone HTML download. The fragment comes from Tiptap's HTML serializer.
 * @param {string} fragment */
export function htmlDownloadDocument(fragment) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lesson</title>
<style>
body{font:16px/1.7 system-ui,sans-serif;max-width:900px;margin:32px auto;padding:0 20px;color:#1a1814;background:#e9e6de}
img{max-width:100%;height:auto} pre{overflow-x:auto} table{border-collapse:collapse} td,th{border:1px solid #969083;padding:8px}
pre[data-directory-tree]{--tree-bg:#e1e7dd;--tree-header:#d3ddce;--tree-accent:#355141;box-sizing:border-box;width:fit-content;max-width:100%;margin:16px auto;padding:10px 12px;border:1px solid #969083;border-top:3px solid var(--tree-accent);border-radius:10px;background:var(--tree-bg);font:13px/1.45 Consolas,monospace;white-space:pre;overflow-x:auto;tab-size:4}
pre[data-directory-tree]::before{content:attr(data-tree-title);display:block;white-space:normal;font:600 13px/1.5 system-ui,sans-serif;color:var(--tree-accent);padding-bottom:8px}
pre[data-tree-color="indigo"]{--tree-bg:#e7e5ef;--tree-accent:#403577}
pre[data-tree-color="amber"]{--tree-bg:#eee3ca;--tree-accent:#704800}
@media(prefers-color-scheme:dark){body{background:#222218;color:#f5f0e8}pre[data-directory-tree]{--tree-bg:#232b24;--tree-accent:#abc9ac}pre[data-tree-color="indigo"]{--tree-bg:#242337;--tree-accent:#c3bcf5}pre[data-tree-color="amber"]{--tree-bg:#30291c;--tree-accent:#f3cc78}}
@media print{body{color:#000;background:#fff;max-width:none;margin:0}pre[data-directory-tree]{color:#000;background:#fff;white-space:pre-wrap;overflow:visible;overflow-wrap:anywhere}pre[data-directory-tree]::before{color:#000}}
</style></head><body>${fragment}</body></html>`
}
