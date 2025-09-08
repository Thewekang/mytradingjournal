import { ContactForm } from '@/components/contact-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us • Trading Journal',
  description: 'Get in touch with our support team for help with your trading journal.'
}

export default function ContactPage() {
  return <ContactForm />
}
