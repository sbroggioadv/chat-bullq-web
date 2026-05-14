import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

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
      className="bg-background"
    >
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
