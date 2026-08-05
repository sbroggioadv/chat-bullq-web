'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, X, Copy, Check, Mail } from 'lucide-react';
import { channelsService, type ChannelType } from '../services/channels.service';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';

const channelTypes: { value: ChannelType; label: string; icon: React.ElementType; color: string; description: string }[] = [
  {
    value: 'WHATSAPP_ZAPPFY',
    label: 'WhatsApp via Zappfy',
    icon: ZappfyIcon,
    color: 'bg-zinc-50 dark:bg-zinc-800',
    description: 'Recomendado para conectar seu número rapidamente',
  },
  {
    value: 'WHATSAPP_OFFICIAL',
    label: 'WhatsApp Oficial',
    icon: MetaIcon,
    color: 'bg-zinc-50 dark:bg-zinc-800',
    description: 'Para número configurado na plataforma da Meta',
  },
  {
    value: 'INSTAGRAM',
    label: 'Instagram',
    icon: InstagramIcon,
    color: 'bg-zinc-50 dark:bg-zinc-800',
    description: 'Instagram API com login empresarial — DMs e stories',
  },
  {
    value: 'GMAIL',
    label: 'Gmail',
    icon: Mail,
    color: 'bg-red-50 dark:bg-red-950/30',
    description: 'Caixa de e-mail no inbox (somente leitura no MVP)',
  },
];

const zappfySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  token: z.string().min(1, 'Token é obrigatório'),
  webhookSecret: z.string().optional(),
});

const waOfficialSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phoneNumberId: z.string().min(1, 'Phone Number ID é obrigatório'),
  accessToken: z.string().min(1, 'Access Token é obrigatório'),
  appSecret: z.string().min(1, 'App Secret é obrigatório'),
  businessAccountId: z.string().optional(),
  webhookSecret: z.string().optional(),
});

const instagramSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  accessToken: z.string().min(1, 'Access Token é obrigatório'),
  appSecret: z.string().min(1, 'App Secret é obrigatório'),
  igBusinessId: z.string().optional(),
  igAppId: z.string().optional(),
  webhookSecret: z.string().optional(),
});

const gmailSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  refreshToken: z.string().min(1, 'Refresh Token OAuth é obrigatório'),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  query: z.string().optional(),
});

type ZappfyFormData = z.infer<typeof zappfySchema>;
type WaOfficialFormData = z.infer<typeof waOfficialSchema>;
type InstagramFormData = z.infer<typeof instagramSchema>;
type GmailFormData = z.infer<typeof gmailSchema>;

const inputCls = 'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';
const labelCls = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';
const errorCls = 'text-xs text-red-500';

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateChannelDialog({ open, onClose, onCreated }: CreateChannelDialogProps) {
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [selectedType, setSelectedType] = useState<ChannelType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  // PRIVATE por padrão: cliente/convidado conecta o próprio WhatsApp sem abrir
  // o canal para a organização inteira.
  const [visibility, setVisibility] = useState<'ORG' | 'PRIVATE'>('PRIVATE');

  const zappfyForm = useForm<ZappfyFormData>({
    resolver: zodResolver(zappfySchema),
    defaultValues: { name: '', token: '', webhookSecret: '' },
  });

  const waForm = useForm<WaOfficialFormData>({
    resolver: zodResolver(waOfficialSchema),
    defaultValues: { name: '', phoneNumberId: '', accessToken: '', appSecret: '', businessAccountId: '', webhookSecret: '' },
  });

  const igForm = useForm<InstagramFormData>({
    resolver: zodResolver(instagramSchema),
    defaultValues: { name: '', accessToken: '', appSecret: '', igBusinessId: '', igAppId: '', webhookSecret: '' },
  });

  const gmailForm = useForm<GmailFormData>({
    resolver: zodResolver(gmailSchema),
    defaultValues: { name: '', email: '', refreshToken: '', clientId: '', clientSecret: '', query: 'in:inbox' },
  });

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  const handleTypeSelect = (type: ChannelType) => {
    setSelectedType(type);
    setStep('config');
  };

  const handleCopyWebhook = (channelType: string) => {
    navigator.clipboard.writeText(`${apiBaseUrl}/webhooks/${channelType}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitChannel = async (type: ChannelType, name: string, config: Record<string, any>, webhookSecret?: string) => {
    setIsLoading(true);
    try {
      await channelsService.create({ type, name, config, webhookSecret, visibility });
      toast.success(
        visibility === 'PRIVATE'
          ? 'Canal privado criado com sucesso!'
          : 'Canal criado com sucesso!',
      );
      handleClose();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar canal');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitZappfy = (data: ZappfyFormData) =>
    submitChannel('WHATSAPP_ZAPPFY', data.name, { token: data.token }, data.webhookSecret);

  const onSubmitWaOfficial = (data: WaOfficialFormData) =>
    submitChannel(
      'WHATSAPP_OFFICIAL',
      data.name,
      {
        phoneNumberId: data.phoneNumberId,
        accessToken: data.accessToken,
        appSecret: data.appSecret,
        businessAccountId: data.businessAccountId || undefined,
      },
      data.webhookSecret,
    );

  const onSubmitInstagram = (data: InstagramFormData) =>
    submitChannel(
      'INSTAGRAM',
      data.name,
      {
        accessToken: data.accessToken,
        appSecret: data.appSecret,
        igBusinessId: data.igBusinessId || undefined,
        igAppId: data.igAppId || undefined,
        apiVersion: 'v21.0',
      },
      data.webhookSecret,
    );

  const onSubmitGmail = (data: GmailFormData) => {
    // Caminho avançado (colagem manual) — preferir OAuth.
    const config: Record<string, string> = {
      refreshToken: data.refreshToken,
    };
    if (data.email) config.email = data.email;
    if (data.query) config.query = data.query;
    // clientId/secret NÃO vão pro banco em multi-tenant — ficam na plataforma
    submitChannel('GMAIL', data.name, config);
  };

  const [gmailAdvanced, setGmailAdvanced] = useState(false);
  const [gmailConnecting, setGmailConnecting] = useState(false);

  const connectGmailOAuth = async () => {
    setGmailConnecting(true);
    try {
      const status = await channelsService.gmailOAuthStatus();
      if (!status.configured) {
        toast.error(
          'Conector Gmail ainda não está configurado no servidor. Peça ao admin da plataforma pra setar GMAIL_OAUTH_CLIENT_ID/SECRET.',
        );
        return;
      }
      const name = gmailForm.getValues('name') || undefined;
      const { url } = await channelsService.gmailOAuthStart({
        name,
        visibility,
      });
      // Full redirect — Google volta no callback da API e redireciona pra /settings/channels
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao iniciar OAuth Gmail');
      setGmailConnecting(false);
    }
  };

  const handleClose = () => {
    setStep('type');
    setSelectedType(null);
    zappfyForm.reset();
    waForm.reset();
    igForm.reset();
    gmailForm.reset();
    setVisibility('PRIVATE');
    onClose();
  };

  if (!open) return null;

  const titleMap: Record<string, string> = {
    WHATSAPP_ZAPPFY: 'Conectar WhatsApp',
    WHATSAPP_OFFICIAL: 'Conectar WhatsApp Oficial',
    INSTAGRAM: 'Conectar Instagram',
    GMAIL: 'Conectar Gmail',
  };

  const submitLabelMap: Record<string, string> = {
    WHATSAPP_ZAPPFY: 'Conectar WhatsApp',
    WHATSAPP_OFFICIAL: 'Conectar WhatsApp',
    INSTAGRAM: 'Conectar Instagram',
    GMAIL: 'Conectar Gmail',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {step === 'type' ? 'Conectar canal' : titleMap[selectedType || '']}
          </h2>
          <button onClick={handleClose} className="rounded-md p-1 text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'type' ? (
          <div className="mt-6 grid gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              Novos canais nascem privados. Depois você pode liberar acesso para outros membros.
            </div>
            {channelTypes.map((ct) => (
              <button
                key={ct.value}
                onClick={() => handleTypeSelect(ct.value)}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-primary hover:shadow-sm dark:border-zinc-700 dark:hover:border-primary"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 ${ct.color}`}>
                  <ct.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ct.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{ct.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : selectedType === 'WHATSAPP_ZAPPFY' ? (
          <form onSubmit={zappfyForm.handleSubmit(onSubmitZappfy)} className="mt-6 space-y-4">
            <Field label="Nome do WhatsApp" placeholder="Ex: WhatsApp da Marcela" error={zappfyForm.formState.errors.name?.message} {...zappfyForm.register('name')} />
            <Field label="Token da instância" placeholder="Cole o token da Zappfy" error={zappfyForm.formState.errors.token?.message} {...zappfyForm.register('token')} />
            <Field label="Segredo do webhook" placeholder="Opcional" optional {...zappfyForm.register('webhookSecret')} />
            <WebhookUrl url={`${apiBaseUrl}/webhooks/WHATSAPP_ZAPPFY`} copied={copied} onCopy={() => handleCopyWebhook('WHATSAPP_ZAPPFY')} />
            <FormFooter isLoading={isLoading} onBack={() => setStep('type')} submitLabel={submitLabelMap[selectedType]} />
          </form>
        ) : selectedType === 'WHATSAPP_OFFICIAL' ? (
          <form onSubmit={waForm.handleSubmit(onSubmitWaOfficial)} className="mt-6 space-y-4">
            <Field label="Nome do WhatsApp" placeholder="Ex: WhatsApp Business" error={waForm.formState.errors.name?.message} {...waForm.register('name')} />
            <Field label="Phone Number ID" placeholder="Encontrado no Meta Business Suite" error={waForm.formState.errors.phoneNumberId?.message} {...waForm.register('phoneNumberId')} />
            <Field label="Access Token" type="text" placeholder="System User Token ou Temporary Token" error={waForm.formState.errors.accessToken?.message} {...waForm.register('accessToken')} />
            <Field label="App Secret" type="text" placeholder="Chave secreta do app na Meta" error={waForm.formState.errors.appSecret?.message} {...waForm.register('appSecret')} />
            <Field label="Business Account ID (WABA)" placeholder="Opcional — habilita auto-subscribe do webhook" optional {...waForm.register('businessAccountId')} />
            <Field label="Verify Token" placeholder="Token que você definiu na Meta" optional {...waForm.register('webhookSecret')} />
            <WebhookUrl url={`${apiBaseUrl}/webhooks/WHATSAPP_OFFICIAL`} copied={copied} onCopy={() => handleCopyWebhook('WHATSAPP_OFFICIAL')} />
            <FormFooter isLoading={isLoading} onBack={() => setStep('type')} submitLabel={submitLabelMap[selectedType]} />
          </form>
        ) : selectedType === 'INSTAGRAM' ? (
          <form onSubmit={igForm.handleSubmit(onSubmitInstagram)} className="mt-6 space-y-4">
            <Field label="Nome do canal" placeholder="Ex: Instagram Loja" error={igForm.formState.errors.name?.message} {...igForm.register('name')} />
            <Field label="Access Token" type="text" placeholder="Instagram User Access Token (IGAAN...)" error={igForm.formState.errors.accessToken?.message} {...igForm.register('accessToken')} />
            <Field label="App Secret" type="text" placeholder="Chave secreta do app (para validar webhooks)" error={igForm.formState.errors.appSecret?.message} {...igForm.register('appSecret')} />
            <Field label="Instagram Business ID" placeholder="Opcional — detectado automaticamente" optional {...igForm.register('igBusinessId')} />
            <Field label="Instagram App ID" placeholder="Opcional — ID do app do Instagram" optional {...igForm.register('igAppId')} />
            <Field label="Webhook Verify Token" placeholder="Token que você definiu no Meta" optional {...igForm.register('webhookSecret')} />
            <WebhookUrl url={`${apiBaseUrl}/webhooks/INSTAGRAM`} copied={copied} onCopy={() => handleCopyWebhook('INSTAGRAM')} />
            <FormFooter isLoading={isLoading} onBack={() => setStep('type')} submitLabel={submitLabelMap[selectedType]} />
          </form>
        ) : selectedType === 'GMAIL' ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
              <strong>Multi-tenant:</strong> cada organização conecta a <em>própria</em> conta Google.
              O token fica só no canal dessa org. MVP = ler a caixa no inbox (sem enviar).
            </div>

            <Field
              label="Nome do canal (opcional)"
              placeholder="Ex: Gmail Escritório — se vazio, usa o e-mail"
              optional
              {...gmailForm.register('name')}
            />

            <button
              type="button"
              onClick={connectGmailOAuth}
              disabled={gmailConnecting || isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-750"
            >
              {gmailConnecting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mail className="h-5 w-5 text-red-500" />
              )}
              {gmailConnecting ? 'Abrindo Google…' : 'Conectar com Google'}
            </button>

            <p className="text-center text-[11px] text-zinc-500">
              Você será redirecionado ao Google e volta aqui com a caixa conectada.
            </p>

            <button
              type="button"
              onClick={() => setGmailAdvanced((v) => !v)}
              className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {gmailAdvanced ? 'Ocultar opção avançada' : 'Opção avançada: colar refresh token'}
            </button>

            {gmailAdvanced && (
              <form onSubmit={gmailForm.handleSubmit(onSubmitGmail)} className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                <Field label="Refresh Token" type="text" placeholder="1//..." error={gmailForm.formState.errors.refreshToken?.message} {...gmailForm.register('refreshToken')} />
                <Field label="E-mail" placeholder="opcional" optional {...gmailForm.register('email')} />
                <Field label="Filtro (query)" placeholder="in:inbox" optional {...gmailForm.register('query')} />
                <FormFooter isLoading={isLoading} onBack={() => setStep('type')} submitLabel="Salvar token manual" />
              </form>
            )}

            {!gmailAdvanced && (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setStep('type')}
                  className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  ← Voltar
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { forwardRef } from 'react';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  optional?: boolean;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, optional, ...props }, ref) => (
    <div className="space-y-1.5">
      <label className={labelCls}>
        {label} {optional && <span className="text-zinc-400">(opcional)</span>}
      </label>
      <input ref={ref} className={inputCls} {...props} />
      {error && <p className={errorCls}>{error}</p>}
    </div>
  ),
);
Field.displayName = 'Field';

function WebhookUrl({ url, copied, onCopy }: { url: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        URL do Webhook (cole no painel do provedor):
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {url}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function FormFooter({
  isLoading,
  onBack,
  submitLabel,
}: {
  isLoading: boolean;
  onBack: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Voltar
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}
