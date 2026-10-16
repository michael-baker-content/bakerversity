# Public footer and information

The footer appears on home, About, course pages and the new /help, /materials, /privacy and /contact pages. It stays out of admin, profile and authentication screens. New public routes are explicitly allowed by Clerk middleware. No course access rules, payment controls, accounts or database data were changed.

Public copy reflects the owner’s current offering: all current courses are free to read without login. Existing account features remain available, but certificates and a complete enrolled-student experience are not promoted as the current public offering. Homepage and About copy were aligned with that distinction.

The footer links to the catalogue, About, FAQ, accessibility help, material/credit guidance, privacy information and a Formspree contact page. The privacy page describes observed application data and service use; it makes no unverified promises about analytics, retention periods, certification or legal compliance. Review the information when the actual service configuration or public offering changes. The materials page does not assign a new content license.

## Contact delivery

The approved public endpoint is https://formspree.io/f/mrpervdg, centralized in src/lib/publicSite.ts. No public owner email is exposed. FORMSPREE_CONTACT_ENDPOINT is an optional server environment override; no environment setup is required for the approved default. Only HTTPS formspree.io/f/ endpoints are accepted by the Contact page. Invalid configuration shows an unavailable state rather than a fake submission button.

The form collects a reply email, topic and message; name/page URL are optional. It includes a honeypot, prevents concurrent submissions, preserves fields on failure, clears them after a successful response, and reports uncertain delivery on timeout/network failure without automatically retrying. Submissions go directly to Formspree, not Supabase. Delivery and any CAPTCHA/domain restrictions are managed in Formspree.

## Validation

Production build, type checking, and the existing database, course-sequence, authoring, and writing-tools regression suites passed. Database tests use local fixtures, not the live Supabase database.

The owner confirmed real Formspree delivery works. Additional isolated browser checks simulated failures and success without sending messages: failed submissions retained their text, successful submissions reset, and there were no duplicate requests.

The finishing pass checked all seven public pages (home, About, catalogue, Help, Contact, Privacy, Materials) for a single primary heading, canonical and social metadata, keyboard skip links, and layout at 320px, 390px and 1280px. Mobile navigation exposes expanded/current states and supports Escape with focus restored to its toggle. The footer accessibility anchor was checked. The preview used real public page and navigation components, simulated signed-out accounts and course data, and fallback fonts; it did not test live Clerk authentication.

Public metadata is defined through src/lib/publicMetadata.ts. Update its production URL if the domain changes. Shared-link previews currently provide text metadata, without a custom social image. Public copy identifies Practical Localization Engineering as the first and currently only course; revise that wording when the catalogue grows.

The minimum page width was reduced to 320px, nested homepage button/link controls were replaced with single links, and consistent keyboard focus styles were added. Contact status and error regions stay mounted so assistive technology can announce updates.

No SQL migration is required. No Git commands or deployments were performed by the agent. After deployment, spot-check the public pages in the live signed-out experience.

Sources consulted: https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax/ and provider privacy notices linked on the privacy page.
