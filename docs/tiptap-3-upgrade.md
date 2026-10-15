# Tiptap 3 upgrade

All direct Tiptap dependencies are pinned to 3.32.0. Table nodes now use the consolidated table package. React editor initialization explicitly disables immediate rendering for Next.js, and transaction rerendering remains enabled so toolbar selection state updates. Custom lint storage access accommodates the new storage types.

The newly bundled Link, Underline and TrailingNode extensions are disabled to preserve the existing document feature set and trailing-paragraph behavior. New multilingual tools can be introduced separately with corresponding learner-renderer support. Existing custom nodes and saved JSON names remain unchanged. No SQL migration is required.

## Validation

- Production build, including type checking: passed.
- Authoring state/resource validation tests: passed.
- Installed Tiptap core/React/ProseMirror/starter dependency tree: consistent 3.32.0, no Tiptap 2 peers remaining.
- Existing browser authoring scenario reached the expected final recovered lesson state: repeated saves, pending edits, conflict and uncertain-save recovery, image editing, callout and terminal controls.
- `tests/browser/tiptap3-authoring.js`: passed against the isolated harness; Polish text and Objectives survive save/reopen, existing text remains, table insertion saves.

Browser checks use simulated API data, not hosted courses. Before production use, verify a representative lesson in the Vercel preview, including any math, graph, code and quiz blocks used by the course. Full custom-node coverage and signed-in hosted integration are not claimed by these checks.

The major upgrade initially required replacing npm's old Tiptap peer dependency tree with `npm install --force`; subsequent installed Tiptap dependency inspection passed. npm also reports an existing React 19 peer-range mismatch in Mafs' use-resize-observer dependency and repository audit findings; these are outside this editor migration.

Reference: https://tiptap.dev/docs/guides/upgrade-tiptap-v2
