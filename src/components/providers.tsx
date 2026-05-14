'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { makeQueryClient } from '@/lib/query-client';
import { BrandThemeBridge } from '@/features/theme/components/brand-theme-bridge';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {/* next-themes seta dois atributos no <html>:
       *  - `data-mode` (preferido, casa com os blocos `[data-brand][data-mode]` do globals.css)
       *  - `class` ('light'/'dark') pra manter retrocompat com utilitários `dark:*` do Tailwind
       * BrandThemeBridge propaga o `data-brand` da org ativa pro mesmo <html>. */}
      <ThemeProvider
        attribute={['data-mode', 'class']}
        defaultTheme="light"
        enableSystem
        storageKey="bullq2-theme-mode"
      >
        <BrandThemeBridge />
        {children}
        <Toaster richColors position="bottom-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
