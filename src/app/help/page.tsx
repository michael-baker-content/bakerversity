import { publicMetadata } from '@/lib/publicMetadata'
import Link from 'next/link'
import PublicInformationPage from '@/components/PublicInformationPage'
export const metadata = publicMetadata('Learning here', 'Free access, self-paced learning, and help using Bakerversity.', '/help')
export default function HelpPage() {
  return <PublicInformationPage title="Learning here" intro="A few things to know before you dive in.">
    <section><h2>Are the courses free?</h2><p>Yes. All courses currently available on Bakerversity are free. You do not need to create an account or log in to read the lessons.</p><Link href="/courses">Explore the course catalogue →</Link></section>
    <section><h2>Where should I start?</h2><p>Start with Practical Localization Engineering, currently the only course. Open it and use its table of contents to choose a lesson. Follow the modules in order, or return to a topic whenever you need a refresher. Work through examples at your own pace.</p></section>
    <section><h2>Why are there account and progress controls?</h2><p>Bakerversity is still being developed. Some account-based features are available, but a more complete progress-tracking experience for enrolled students is still being built. Accounts are optional for reading; signed-out reading is not saved as personal course progress.</p><p>The current offering is self-directed learning. Certificates and a full enrolled-student experience are not part of the public offering at this stage.</p></section>
    <section><h2>Will access always work this way?</h2><p>This describes the current offering, not a promise that every future course will have the same access requirements. Any future paid or account-based offering will need its own clearly stated access information.</p></section>
    <section id="accessibility"><h2>Accessibility &amp; help</h2><p>You can navigate links and controls with your keyboard, zoom the page in your browser, and use the theme control to choose a light or dark appearance. On smaller screens, open Course contents to find the lesson list.</p><p>If a lesson, media item, or exercise is difficult to use, a useful report includes the page link, what you were trying to do, and the browser or assistive technology you used. Please do not include passwords or sensitive personal information.</p><p><Link href="/contact">Contact Michael</Link> with questions, corrections, or accessibility issues.</p></section>
  </PublicInformationPage>
}
