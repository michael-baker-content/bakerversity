import { publicMetadata } from '@/lib/publicMetadata'
import PublicInformationPage from '@/components/PublicInformationPage'
import ContactForm from '@/components/ContactForm'
import { publicSite } from '@/lib/publicSite'
export const metadata = publicMetadata('Contact', 'Questions, corrections, accessibility feedback and privacy requests for Bakerversity.', '/contact')
export default function ContactPage() {
  const configured = process.env.FORMSPREE_CONTACT_ENDPOINT?.trim() ?? publicSite.contactEndpoint
  const endpoint = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+\/?$/.test(configured) ? configured : null
  return <PublicInformationPage title="Contact Michael" intro="Have a question, found an error, or need help using a lesson? Send a message here."><ContactForm endpoint={endpoint} /></PublicInformationPage>
}
