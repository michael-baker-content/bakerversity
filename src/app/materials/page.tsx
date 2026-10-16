import { publicMetadata } from '@/lib/publicMetadata'
import Link from 'next/link'
import PublicInformationPage from '@/components/PublicInformationPage'
export const metadata = publicMetadata('Materials & credits', 'Using Bakerversity lessons, examples, downloads, and third-party resources.', '/materials')
export default function MaterialsPage() {
  return <PublicInformationPage title="Materials & credits" intro="Learn from the materials, and keep track of where they come from.">
    <section><h2>Learning with the course materials</h2><p>The current courses are free to read and work through. Follow any instructions attached to exercises, example files, and downloads. Use a separate practice environment for code examples rather than running unfamiliar commands against important work.</p></section>
    <section><h2>Sharing and reuse</h2><p>Share a link to a lesson so other learners can find the current version. Free access does not itself establish an open license for republishing course text, images, or downloads. Check each resource for its own license or permission information before reusing it.</p><p>For questions about reusing original course materials, <Link href="/contact">contact Michael</Link>.</p></section>
    <section><h2>Third-party materials</h2><p>Linked articles, embedded media, photographs, and external resources belong to their respective creators. Follow their attribution and license information. Photo credits appear with the images where provided; course-specific references belong with the relevant lesson.</p></section>
    <section><h2>Corrections and updates</h2><p>Bakerversity is an evolving independent learning project. Lessons and examples may be revised as the material develops. When reporting an error, include the lesson URL and the passage or example that needs attention.</p></section>
  </PublicInformationPage>
}
