'use client';

import { SettingsSaveBar } from '@/features/settings/components/settings-save-bar';
import { useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
import { useOrgBrand } from '@/features/theme/hooks/use-org-brand';
import { ORG_BRANDS, type OrgBrand } from '@/features/theme/types/brand';
import { BrandPreviewCard } from '@/features/theme/components/brand-preview-card';
import { ThemeModeToggle } from '@/features/theme/components/theme-mode-toggle';
import { ThemePresetsSection } from '@/features/theme/components/theme-presets-section';

export default function SettingsAppearancePage() {
  const { brand, effectiveBrand, role, setBrand, isUpdating, themeTokens } = useOrgBrand();
  const [pending, setPending] = useState<OrgBrand | null>(null);

  const canEditBrand = role === 'OWNER' || role === 'ADMIN';
  const selected = pending ?? effectiveBrand;
  const hasChanges = pending !== null && pending !== brand;
  const hasCustomTheme = themeTokens !== null;

  const handleSave = async () => {
    if (!pending) return;
    await setBrand(pending);
    setPending(null);
  };

  return <div className="space-y-5">
    <section aria-labelledby="mode-section">
      <h2 id="mode-section" className={styles.sectionTitle}>Só para você</h2>
      <div className={styles.block}>
        <SettingRow title="Tema" description="Neste navegador. Não muda o tema dos outros membros."><ThemeModeToggle variant="expanded" /></SettingRow>
        <SettingRow title="Densidade" description="Espaço entre as linhas das listas e do chat."><span className={styles.unavailable}>Ainda não disponível</span></SettingRow>
        <SettingRow title="Vidro nas janelas" description="Fundo translúcido como no macOS."><span className={styles.unavailable}>Ainda não disponível</span></SettingRow>
      </div>
    </section>
    <section aria-labelledby="brand-section">
      <h2 id="brand-section" className={styles.sectionTitle}>Escritório · vale para todos</h2>
      <div className={styles.block}>
        <SettingRow title="Identidade visual" description="Só proprietário e administrador mudam. Escolha uma marca e salve.">{!canEditBrand && <span className="bq-pill"><Lock size={12} /> Restrito</span>}</SettingRow>
        <details className={styles.details}><summary>Escolher marca e ver prévias</summary><div role="radiogroup" aria-label="Identidade visual da banca" aria-disabled={!canEditBrand || isUpdating} className="grid gap-3 p-3 sm:grid-cols-3">
          {ORG_BRANDS.map(b => <BrandPreviewCard key={b} brand={b} selected={selected === b} onSelect={next => canEditBrand && setPending(next)} disabled={!canEditBrand || isUpdating} size="md" />)}
        </div></details>
        <SettingRow title="Logo do escritório" description="Fica em Organização."><Link className="bq-button" href="/settings/general">Abrir Organização</Link></SettingRow>
        {canEditBrand && <SettingRow title="Theme Builder" description={hasCustomTheme ? `Tema customizado ativo (base: ${themeTokens?.base}).` : 'Cores, raio e densidade da organização, com prévia.'}><Link className="bq-button" href="/settings/appearance/builder">Editar tema</Link></SettingRow>}
      </div>
    </section>
    <ThemePresetsSection canEdit={canEditBrand} />
    {canEditBrand && <SettingsSaveBar dirty={hasChanges} saving={isUpdating} onDiscard={() => setPending(null)} onSave={() => void handleSave()} />}
  </div>;
}
