import { Prompt } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata = {
  title: 'ระบบเช็คชื่อ Airdrop',
  description: 'ระบบเช็คชื่อผู้เล่น Airdrop แบ่งตาม HOUSE',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={prompt.className}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
