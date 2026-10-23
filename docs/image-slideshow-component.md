# Slideshow component

Insert **Components → Slideshow**. Choose or upload the first image using the course library and provide alt text. The component is full width, with an optional title. Each slide has an image, optional image caption, and an editable description.

Authors see previews of all slides while editing. Click Edit slide to open a single modal for its image, alt text, optional caption, size and description. The description editor starts with bold, italic, lists and links; advanced tools are deferred. Add image opens the course asset picker; clicking an image opens this modal directly, without an inline asset-details form. Upload image prepares a new file locally and adds it to the course library on submission. Updating course-library defaults is optional. Choose another image after adding returns to the picker for the next slide. Cancel discards unsubmitted slide edits. Move earlier/later moves the entire slide, including its description. Removing the final slide is disabled; Remove slideshow deletes the component. Undo remains available.

Students use Previous/Next, or focus the slideshow and use left/right arrows. Navigation stops at the ends. There is no autoplay. Images remain uncropped in a bounded area; the next image is prepared in the background. All slides appear when printing. HTML and Markdown downloads contain a sequential gallery; plain text includes the title, descriptions, formulas, captions and image URLs. Images are linked, not bundled into downloads.

## Content contract

The JSON structure is slideshow → slideshowSlide+ → image + slideshowDescription. Descriptions allow paragraphs, headings, lists, inline formatting/links, inlineMath and blockMath. Nested components and other insertable blocks are excluded. Slideshows are root-level components. Saved math remains readable if course tools are later disabled. Slide images retain the existing image attributes and asset URL references; no database migration is required.

The shared save/import validator checks structure and required alt text. Slideshow IDs identify targets while the shared picker is open; copied IDs are replaced automatically. Slide reordering moves actual document children rather than separate parallel arrays.

## Verification

Pure schema, validation, undo, export and renderer tests are in tests/slideshow.mjs. Browser smoke coverage includes insertion, adding/reordering slides, modal cancellation, formatting toggles, links, keyboard focus order, editing an empty title after reload, student navigation, math and print visibility. Browser smoke is intended for CI; it is not run locally because the project owner manages local servers.

Slideshow images are always centered; the slide modal does not offer alignment choices. The title is optional. Tab moves from Caption to the description text, then its formatting controls. Links are styled and can be edited by double-clicking linked text.
