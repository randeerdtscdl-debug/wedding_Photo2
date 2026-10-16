import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Cormorant_Garamond, Inter, Noto_Sans_Sinhala } from 'next/font/google';
import './globals.css';
import { GuestProvider } from '@/components/GuestProvider';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-playfair', display: 'swap' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter', display: 'swap' });
const sinhala = Noto_Sans_Sinhala({ subsets: ['sinhala'], weight: ['400', '500', '600'], variable: '--font-sinhala', display: 'swap' });

export const metadata: Metadata = {
  title: 'Umini & Randeera • Wedding Gallery',
  description: 'Share your moments from our big day.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#5C0000' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${cormorant.variable} ${inter.variable} ${sinhala.variable}`}>
      <body>
        <GuestProvider>{children}</GuestProvider>
      </body>
    </html>
  );
}
