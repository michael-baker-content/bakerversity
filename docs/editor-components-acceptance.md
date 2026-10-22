# Editor components: acceptance checklist

Status: broad release checklist. The first implementation is narrowed to [Text and image](text-image-component.md); that document records local automated evidence. Browser acceptance below remains pending. General-column scenarios are deferred.

Scope and decisions: [implementation plan](editor-components-plan.md).

## Taxonomy and compatibility

- [ ] Formatting, content blocks and components have clear, consistent group labels.
- [ ] Mobile categories expand/collapse with keyboard and touch; focus remains visible.
- [ ] Existing toolbar actions and course tool settings still work.
- [ ] Previously saved content survives load/save with its attributes intact, even when insertion tools are hidden.
- [ ] Unknown or disallowed nodes cannot be silently discarded by loading, paste/import, save or rendering.

## Component editing

- [ ] Inserting two columns creates exactly two editable regions and focuses the first.
- [ ] Both regions accept supported blocks and remain part of the same document history.
- [ ] Authors can select/move/delete the whole component and navigate into and out of each region with the keyboard.
- [ ] Unwrapping retains first-column then second-column content; undo restores the component.
- [ ] Nested components are blocked, including attempts through callouts/lists, paste and malformed JSON.
- [ ] Stacked preview preserves unsaved edits and does not create duplicate editable fields.

## Student presentation

- [ ] Equal columns use available content width and stack when their container becomes narrow.
- [ ] DOM order, visual order and assistive-technology reading order agree.
- [ ] Long filenames, multilingual text and long unbroken strings do not widen the entire page.
- [ ] Images retain alt text, captions, credit and placement settings, and fit their columns.
- [ ] Code, terminal and directory trees retain whitespace and appropriate internal scrolling.
- [ ] Tables scroll inside their column; formulas do not obscure adjacent content.
- [ ] Graphs resize correctly and remain interactive before being enabled in columns.
- [ ] Practice quizzes remain interactive and independent when repeated or nested in a component.
- [ ] Callouts preserve styling and nested children without allowing indirectly nested components.
- [ ] Light/dark themes, zoom, keyboard focus and mobile touch targets are checked.

## Persistence

- [ ] Saving and reloading a draft preserves both columns, all child attributes and source text.
- [ ] Saved-draft preview renders the new layout while the published page retains its prior revision.
- [ ] Publishing updates the student page; historical revisions and recovery copies preserve layout data.
- [ ] Validation failures, lost responses and stale saves retain local work and use existing recovery behavior.
- [ ] Opening an older document does not trigger a content rewrite merely to add layout defaults.

## Downloads

- [ ] HTML displays columns offline, stacks on narrow screens and prints without clipped content.
- [ ] Markdown and text contain all children in first-column-then-second-column order.
- [ ] Directory trees retain titles, indentation, annotations, Unicode filenames and full branch contents.
- [ ] Nested callouts, lists and tables do not swallow content or break Markdown fences.
- [ ] Unsupported interactive export features use documented fallbacks, with no silent omissions.

## Evidence before release

- [ ] Relevant automated checks pass; record commands and results.
- [ ] Browser tests run in CI or against the user-started server; record which environment was used.
- [ ] Review the saved-draft and published student views at desktop and narrow widths.
- [ ] Document any remaining limitations before enabling insertion in live authoring.
