import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const geist = Geist({ subsets: ['latin'], weight: ['300', '400', '500', '600'], display: 'swap', adjustFontFallback: false, variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], weight: ['400', '500'], display: 'swap', adjustFontFallback: false, variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Chat BullQ',
  description: 'Omnichannel customer service platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `data-brand` e `data-mode` são re-aplicados em runtime pelo ThemeProvider
    // (org-level brand vem do auth-store; mode vem do next-themes / preferência
    // do user). Os valores aqui são o boot default (Brand A · light) pra evitar
    // flash de cor antes do JS hidratar.
    <html
      lang="pt-BR"
      data-brand="A"
      data-mode="light"
      suppressHydrationWarning
      className={`bg-background ${geist.variable} ${geistMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
