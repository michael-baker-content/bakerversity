# Opt-in LaTeX activation

Classes with the math editor pack enabled have an **Activate LaTeX** toolbar button beside Formula. It opens a review panel with individual Activate controls and Activate all. Nothing is converted merely by opening the panel or pasting text. Existing Space/Enter math shortcuts are unchanged.

Recognizes `$…$`, `$$…$$`, `\(…\)` and `\[…\]`. Dollar and parenthesis delimiters create inline formulas; double dollars and square brackets create display formulas. Display expressions can span adjacent paragraphs, including delimiter-only lines. Formatting boundaries within text do not prevent detection.

Code blocks, inline code, existing math nodes, invalid KaTeX expressions and common currency patterns are excluded. Bare formulas without delimiters are not guessed. Detection is deliberately conservative: single-dollar numeric-only expressions are skipped to avoid treating prices as math; use the Formula tool for these. The scanner does not cross container boundaries or non-text objects.

Conversions use the existing inlineMath/blockMath nodes and therefore the existing saving, editing and student rendering. A single action is a single Undo step, separate from earlier editing. The open panel rescans after document edits and Undo; conversion rescans again before applying positions. Course settings still control tool visibility.

Validation: `node tests/latex-activation.mjs` checks all delimiters, formatting, multiline display math, exclusions, surrounding text preservation, one/all conversion and Undo. An isolated browser check verified raw text before activation, the review controls, rendered formulas, Undo and hiding the control without the math pack. TypeScript and production build passed. No schema changes or new dependencies.
