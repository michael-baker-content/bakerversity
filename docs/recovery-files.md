# Recovery files

Use **Download → Recovery copy (.json)** to preserve current unsaved fields and structured editor content. Use **Import from file → Restore recovery copy (.json)** in the matching editor to restore it. Confirm replacement before applying changes; restore does not save or publish. Review the result and save normally.

Lessons and course pages include their editable content and settings. Assessment copies include introduction and assessment settings, not the independently saved question list. Each question form has its own recovery import/download controls, including answers and explanation.

Recovery preserves structured components instead of converting them to Markdown. Images, PDFs, and resource attachments remain references to storage; this is not an offline asset archive or a full course backup.

Restore checks the format version, editor kind, field types, document structure, and course when recorded. Invalid files leave the editor unchanged. Existing version 1 files are supported, including older new-item copies whose editor kind can be identified. Older files without a course identifier cannot be checked against their original course.

Only fields supported by the current form are restored. Destination identity, slug, module assignment, ownership, publication status, and revision state remain unchanged. Restore a saved-item copy in its saved-item editor to recover all available fields; creation forms offer fewer fields. Recovery never bypasses save-conflict protections: after an uncertain save, download a copy, reload the saved version, then restore.

Files are parsed locally, with a 5 MB limit. Keep recovery files private, particularly question files containing correct answers.
