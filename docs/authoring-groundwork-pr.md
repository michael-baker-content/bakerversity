# Draft PR title

Document the course authoring foundation and acceptance plan

# Draft PR body

Course authoring currently applies different save, publication and ordering rules across lessons, pages, assessments and resources. This documentation-only change defines the intended behavior and a phased plan to make the existing tools consistent before adding functionality.

## Included

- Proposed boundaries for the authoring interface, editing workflow, content rules and persistence.
- Explicit contracts for saving, conflicts, publication, item revisions, ordering and document compatibility.
- A phased implementation plan with a focused first reliability increment.
- Thirteen acceptance scenarios and a verification evidence template.

Start with `docs/authoring-foundation.md` for the design and delivery plan, then review `docs/authoring-acceptance.md` for the acceptance scenarios. The copy-ready description is in `docs/authoring-groundwork-pr.md`.

## Scope

This PR contains only these new authoring documents. It does not change application behavior, database schema, dependencies or deployment configuration. The earlier database/application foundation changes are a separate delivery and should not be accidentally included in this documentation PR. Some source anchors describe that local foundation and will resolve on GitHub only after it is published.

The complete authoring effort is not implemented. This PR can remain a draft during design review and become ready when the documentation is agreed; implementation should follow in separate PRs with scenario-specific evidence.

## Validation

- Checked the two companion-document links and scenario IDs.
- Reviewed scope and baseline statements against the local implementation.
- No application tests were run for this documentation-only change.
- All acceptance scenarios are planned, not claimed as passing.

## Review decisions

- Confirm the proposed responsibility boundaries and delivery order.
- Confirm that the draft-resource visibility gap blocks reliance on draft isolation until fixed.
- Review the explicitly open decisions before their implementation increments.

## Follow-up

The first implementation increment fixes unintended form submission, image editing's math dependency, missing errors and archive wording, then establishes shared editing state through the lesson editor. It should demonstrate A01–A05 and A12 before that pattern is applied to the other editors.
