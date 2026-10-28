import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiSettingsPanel } from '@/features/settings/components/ai-settings-panel';
import { aiSettingsService, type OrganizationAiSettings } from '@/features/ai-agents/services/ai-settings.service';
vi.mock('@/features/ai-agents/services/ai-settings.service', async importOriginal => ({ ...await importOriginal<typeof import('@/features/ai-agents/services/ai-settings.service')>(), aiSettingsService: { get: vi.fn(), update: vi.fn() } }));
vi.mock('@/features/settings/components/watchdog-summary', () => ({ WatchdogSummary: () => <div>Resumo real</div> }));
vi.mock('@/features/channels/services/channels.service', () => ({channelsService:{list:async()=>[]}}));
const settings: OrganizationAiSettings = {id:'org',name:'Teste',aiEnabled:true,aiPanicMode:false,aiTimezone:'America/Sao_Paulo',aiBusinessHours:null,aiOutOfHoursMessage:null,aiBusinessNotes:null,aiAutoDisableOnHuman:true,aiMonthlyTokenCap:null,watchdogEnabled:true,watchdogBusinessHours:null,watchdogConfig:{delayBotMin:21,delayPendingMin:32,delayHumanIdleMin:65,maxAttempts:4},allowedUrlDomains:null};
afterEach(()=>{cleanup();vi.clearAllMocks();});
function open(watchdogOnly=false) {
 vi.mocked(aiSettingsService.get).mockResolvedValue(settings);
 vi.mocked(aiSettingsService.update).mockResolvedValue(settings);
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AiSettingsPanel watchdogOnly={watchdogOnly} /></QueryClientProvider>);
}
describe('Configurações de IA separadas preservam o contrato',()=>{
 it('watchdog mantém valores da API e salva sem regravar comportamento da IA',async()=>{
  open(true);
  const field=await screen.findByRole('spinbutton',{name:'IA travou (status BOT)'});
  expect(field).toHaveValue(21);
  fireEvent.change(field,{target:{value:'25'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar',exact:true}));
  await waitFor(()=>expect(aiSettingsService.update).toHaveBeenCalledWith({watchdogEnabled:true,watchdogBusinessHours:null,watchdogConfig:{delayBotMin:25,delayPendingMin:32,delayHumanIdleMin:65,maxAttempts:4}}));
 });
 it('descartar restaura a resposta da API e não faz PATCH',async()=>{
  open(true);
  fireEvent.change(await screen.findByRole('spinbutton',{name:'Tentativas máximas'}),{target:{value:'7'}});
  fireEvent.click(screen.getByRole('button',{name:'Descartar'}));
  expect(screen.getByRole('spinbutton',{name:'Tentativas máximas'})).toHaveValue(4);
  expect(aiSettingsService.update).not.toHaveBeenCalled();
 });
 it('comportamento salva o panic sem modificar watchdog',async()=>{
  open();
  fireEvent.click(await screen.findByRole('switch',{name:'Pausar toda a IA'}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar',exact:true}));
  await waitFor(()=>expect(aiSettingsService.update).toHaveBeenCalled());
  const payload=vi.mocked(aiSettingsService.update).mock.calls[0][0];
  expect(payload.aiPanicMode).toBe(true);
  expect(payload).not.toHaveProperty('watchdogEnabled');
  expect(payload).not.toHaveProperty('watchdogConfig');
 });
});
