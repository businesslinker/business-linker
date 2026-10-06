'use client'
import { Phone, MessageCircle } from 'lucide-react'

export default function ContactButtons({ phone, whatsapp, size = 'md' }) {
  const waNumber = (whatsapp || phone || '').replace(/[^0-9]/g, '')
  const dims = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const iconSize = size === 'sm' ? 14 : 17

  return (
    <div className="flex gap-2 shrink-0">
      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={(e) => e.stopPropagation()}
          className={`${dims} rounded-full bg-blue-50 text-blue-700 flex items-center justify-center`}
          aria-label="Call"
        >
          <Phone size={iconSize} strokeWidth={2} />
        </a>
      )}
      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${dims} rounded-full bg-green-50 text-green-600 flex items-center justify-center`}
          aria-label="WhatsApp"
        >
          <MessageCircle size={iconSize} strokeWidth={2} />
        </a>
      )}
    </div>
  )
}
