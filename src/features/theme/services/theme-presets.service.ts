/**
 * Sprint S18 Wave 4 — Theme Presets Library (Fase 2 frontend)
 *
 * Cliente HTTP pra os 7 endpoints da Wave 4. Sem regra de negócio —
 * só serialização/parse. Hooks que cuidam de otimismo, toast e refetch.
 */

import { api } from '@/lib/api';
import type { ThemeTokens } from '../types/brand';

export interface ThemePreset {
  id: string;
  orgId: string;
  name: string;
  tokens: ThemeTokens;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  isActive: boolean;
}

interface ActivateResponse {
  id: string;
  activeThemePresetId: string | null;
  themeTokens: ThemeTokens | null;
}

const BASE = '/organizations/current/theme-presets';

export const themePresetsService = {
  async list(): Promise<ThemePreset[]> {
    const { data } = await api.get<{ data: ThemePreset[] }>(BASE);
    return data.data;
  },

  async findOne(presetId: string): Promise<ThemePreset> {
    const { data } = await api.get<{ data: ThemePreset }>(`${BASE}/${presetId}`);
    return data.data;
  },

  async create(payload: { name: string; tokens: ThemeTokens }): Promise<ThemePreset> {
    const { data } = await api.post<{ data: ThemePreset }>(BASE, payload);
    return data.data;
  },

  async update(
    presetId: string,
    payload: { name?: string; tokens?: ThemeTokens },
  ): Promise<ThemePreset> {
    const { data } = await api.patch<{ data: ThemePreset }>(
      `${BASE}/${presetId}`,
      payload,
    );
    return data.data;
  },

  async delete(presetId: string): Promise<void> {
    await api.delete(`${BASE}/${presetId}`);
  },

  async activate(presetId: string): Promise<ActivateResponse> {
    const { data } = await api.post<{ data: ActivateResponse }>(
      `${BASE}/${presetId}/activate`,
      {},
    );
    return data.data;
  },

  async deactivate(): Promise<ActivateResponse> {
    const { data } = await api.post<{ data: ActivateResponse }>(
      `${BASE}/deactivate`,
      {},
    );
    return data.data;
  },
};
