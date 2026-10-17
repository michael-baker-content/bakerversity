# PDF lesson uploads

PDF bytes now travel from the browser directly to Supabase Storage using a signed upload URL. The authenticated Vercel endpoint `/api/admin/upload-slides` handles only small JSON authorization and completion requests. This avoids Vercel's 4.5 MB request-body limit and the former 30-second lesson-save timeout applied to PDF transfers.

The reported failure also occurred with a 91 KB PDF after roughly 30 seconds: that size does not explain it. The old request helper hid any fetch rejection or timeout behind a lost-save message. A read-only check confirmed the live slides bucket permits application/pdf up to 50 MB and storage was healthy. A temporary diagnostic direct upload succeeded and was removed. We cannot identify which part of the old authenticated production request stalled without its server logs.

- Instructor/admin access is required to prepare and complete an upload.
- A server-signed receipt binds the random storage path, filename, size, owner and two-hour expiry. The service key remains server-side.
- Completion checks actual stored MIME type and byte count before registering an asset. Repeated completion cannot duplicate an asset or overwrite its edited metadata.
- Transfers allow five minutes and show progress; authorization and completion requests allow 30 seconds and use upload-specific errors.
- Empty files, non-PDF filenames and files over 50 MB are rejected. The existing storage bucket also enforces MIME/size restrictions.
- Uploading does not save the lesson. The author must save to attach the returned URL. On failure the existing attachment and lesson edits remain intact.
- No migration or bucket changes are needed. Deploy the client and endpoint together. Old browser tabs should save their edits and reload after deployment.

If a browser closes after transfer but before registration, an unregistered storage object may remain. No automated cleanup is introduced in this change. A retry starts a new upload; already completed lesson content is never removed. Resumable transfers are a possible later improvement for large files or unstable connections.

Verification: `node tests/slides-upload.mjs` covers authorization tampering/expiry/ownership, validation, stored metadata mismatch, duplicate completion, direct transfer progress and failure reporting. It uses isolated fixtures and does not modify live course content. Typecheck and production build should also pass. Confirm a real authenticated PDF upload, save, reload and student-view PDF opening on the deployment before merging further changes.
