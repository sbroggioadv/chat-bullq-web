import { UserRound as UserCircle, Bell, Sun as Palette, Briefcase as Building2, Users, MessageSquare as Radio, Grid2X2 as Layers, Zap, Tag as Tags, Phone as BookUser, Sparkles, Inbox, Clock, KeyRound, List, CalendarDays, PenTool, Plug } from 'lucide-react';

export const settingsGroups = [
  { label: 'Você', items: [
    { id: 'profile', label: 'Perfil', icon: UserCircle, tone: 'info', description: 'Como você aparece para a equipe.', keywords: 'nome foto email sair sessão login' },
    { id: 'notifications', label: 'Notificações', icon: Bell, tone: 'error', description: 'Quando e como o BullQ chama a sua atenção.', keywords: 'push alerta sla menção não perturbe silenciar' },
    { id: 'appearance', label: 'Aparência', icon: Palette, tone: 'info', description: 'O seu tema e a identidade visual do escritório.', keywords: 'tema escuro claro densidade cor vidro' },
  ]},
  { label: 'Escritório', items: [
    { id: 'general', label: 'Organização', icon: Building2, tone: 'info', description: 'Dados do escritório. Aparecem no menu e nas comunicações.', keywords: 'logo nome identificador plano workspace' },
    { id: 'members', label: 'Membros e papéis', icon: Users, tone: 'info', description: 'Quem acessa o BullQ e o que cada um pode fazer.', keywords: 'convite equipe atendente administrador proprietário' },
  ]},
  { label: 'Atendimento', items: [
    { id: 'channels', label: 'Canais', icon: Radio, tone: 'ok', description: 'WhatsApp, Instagram, Gmail e as demais caixas de entrada.', keywords: 'zappfy meta webhook número conectar credenciais' },
    { id: 'segments', label: 'Segmentos de números', icon: Layers, tone: 'ok', description: 'Vários números que estão nos mesmos grupos viram uma conversa só.', keywords: 'whatsapp grupos números compartilhados' },
    { id: 'quick-replies', label: 'Mensagens rápidas', icon: Zap, tone: 'warn', description: 'Atalhos de texto. Digite / no chat e escolha.', keywords: 'atalho texto pronto resposta' },
    { id: 'tags', label: 'Tags', icon: Tags, tone: 'agent', description: 'Etiquetas coloridas para organizar conversas e contatos.', keywords: 'etiquetas cores' },
    { id: 'contacts', label: 'Contatos', icon: BookUser, tone: 'warn', description: 'Todos os contatos que já falaram com o escritório.', keywords: 'lista fotos sincronizar importar' },
  ]},
  { label: 'Jarvis e IA', items: [
    { id: 'ai', label: 'Comportamento do Jarvis', icon: Sparkles, tone: 'agent', description: 'Quando o Jarvis atende, o que ele sabe e quanto pode gastar.', keywords: 'inteligência desligar horário contexto tokens domínios' },
    { id: 'incoming', label: 'Incoming', icon: Inbox, tone: 'warn', description: 'O que vira demanda no Incoming.', keywords: 'pessoas grupos contrato documento reunião' },
    { id: 'watchdog', label: 'Conversas presas', icon: Clock, tone: 'error', description: 'Reativa conversas em que a IA travou ou ninguém respondeu.', keywords: 'watchdog abandonou reativar' },
    { id: 'ai-credentials', label: 'Credenciais de IA', icon: KeyRound, tone: 'neutral', description: 'As chaves de cada provedor de IA e quem usa qual.', keywords: 'api key provedor fugu qwen claude openai whisper embeddings' },
  ]},
  { label: 'Integrações', items: [
    { id: 'clickup', label: 'ClickUp', icon: List, tone: 'agent', description: 'Destinos das demandas e atualizações no ClickUp.', keywords: 'listas funil comentário task subtask' },
    { id: 'google', label: 'Google Agenda, Meet e Gmail', icon: CalendarDays, tone: 'info', description: 'Agenda e Meet para reuniões; Gmail para e-mails.', keywords: 'sincronizar email' },
    { id: 'autentique', label: 'Autentique', icon: PenTool, tone: 'ok', description: 'Assinatura dos contratos de honorários.', keywords: 'assinatura contrato' },
    { id: 'api-keys', label: 'API e MCP', icon: Plug, tone: 'neutral', description: 'Chaves de acesso para integrações, scripts e o MCP.', keywords: 'chave api integração' },
  ]},
];
export const settingsItems = settingsGroups.flatMap(group => group.items);
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
