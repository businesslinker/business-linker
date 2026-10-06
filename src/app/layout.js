import './globals.css'

export const metadata = {
  title: 'Business Linker',
  description: 'Multi-city business networking community',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
