'use client';

import { useRef, useState, useCallback, type ComponentType } from 'react';
import { Upload, Trash2, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { inboxService } from '@/features/inbox/services/inbox.service';
import { cn } from '@/lib/utils';
import { ImageCropModal } from './image-crop-modal';

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

/**
 * S19 Wave 1: componente reutilizavel pra upload de imagem.
 *
 * - Aceita uma imagem por vez, faz upload via inboxService.uploadImage (endpoint
 *   /messages/uploads/image ja existente — reusar evita duplicar pipeline de
 *   upload + validacao).
 * - Estados explicitos: idle (CTA), uploading (spinner), preview (img + acoes),
 *   error (toast + volta pro idle).
 * - Suporta `shape: square | circle` (org logo = square, user avatar = circle).
 * - Tokens CSS: bg-muted, border-border, bg-card, text-fg / text-fg-muted —
 *   nada de zinc hardcoded, segue convencao Waves 4.4/4.5/4.6.
 */
interface ImageUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Forma do preview. Default 'square'. */
  shape?: 'square' | 'circle';
  /** Tamanho maximo em bytes. Default 5MB. */
  maxSize?: number;
  /** MIME types aceitos. Default 'image/*'. */
  accept?: string;
  /** Desabilita interacao. */
  disabled?: boolean;
  /** Label visivel acima do componente (opcional). */
  label?: string;
  /** Texto descritivo abaixo (opcional). */
  description?: string;
  /** Icon de placeholder quando vazio. Default Building2 (org logo). Wave 2: UserCircle pra avatar. */
  placeholderIcon?: IconComponent;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({
  value,
  onChange,
  shape = 'square',
  maxSize = DEFAULT_MAX_SIZE,
  accept = 'image/*',
  disabled = false,
  label,
  description,
  placeholderIcon: PlaceholderIcon = Building2,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Sprint S19 Wave 3.1: arquivo selecionado pendente de crop. Quando setado,
  // o ImageCropModal renderiza e bloqueia novos picks ate user aplicar/cancelar.
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  const handlePick = useCallback(() => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }, [disabled, uploading]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset pra permitir re-selecionar mesmo arquivo
      e.target.value = '';
      if (!file) return;

      // Validacao client-side antes de abrir modal de crop (que carrega imagem)
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo invalido', {
          description: 'Selecione uma imagem (PNG, JPG, WebP, etc.)',
        });
        return;
      }
      if (file.size > maxSize) {
        const mb = (maxSize / (1024 * 1024)).toFixed(0);
        toast.error('Imagem muito grande', {
          description: `Limite: ${mb}MB`,
        });
        return;
      }

      // Wave 3.1: NAO faz upload direto. Abre modal de crop primeiro — user
      // ajusta posicao/zoom/rotacao, e so apos aplicar o upload acontece.
      setPendingFile(file);
    },
    [maxSize],
  );

  const handleCropConfirm = useCallback(
    async (croppedFile: File) => {
      setPendingFile(null);
      setUploading(true);
      try {
        const result = await inboxService.uploadImage(croppedFile);
        onChange(result.url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        toast.error('Falha no upload', { description: msg });
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleCropCancel = useCallback(() => {
    setPendingFile(null);
  }, []);

  const handleRemove = useCallback(() => {
    if (disabled || uploading) return;
    onChange(null);
  }, [disabled, uploading, onChange]);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-fg">{label}</span>
      )}
      <div className="flex items-start gap-4">
        {/* Preview / placeholder */}
        <div
          className={cn(
            'relative flex size-24 shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-border bg-muted transition-colors',
            radiusClass,
            !disabled && !uploading && 'cursor-pointer hover:border-primary/50 hover:bg-muted/70',
            disabled && 'cursor-not-allowed opacity-60',
          )}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={value ? 'Trocar imagem' : 'Adicionar imagem'}
          aria-disabled={disabled || uploading}
          onClick={handlePick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handlePick();
            }
          }}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-fg-muted" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Preview"
              className={cn('size-full object-cover', radiusClass)}
            />
          ) : (
            <PlaceholderIcon className="size-8 text-fg-muted/60" aria-hidden />
          )}
        </div>

        {/* Acoes */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePick}
              disabled={disabled || uploading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-fg shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="size-4" />
              {value ? 'Trocar' : 'Adicionar imagem'}
            </button>
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || uploading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-fg-muted shadow-sm transition-colors hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Remover imagem"
              >
                <Trash2 className="size-4" />
                Remover
              </button>
            )}
          </div>
          {description && (
            <p className="text-xs text-fg-muted">{description}</p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />

      {/* Wave 3.1: modal de crop. Abre quando user seleciona arquivo via picker.
          Em "Aplicar" -> dispara upload do File cortado. Em "Cancelar" -> volta
          pro estado idle (nada e upado). */}
      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          shape={shape}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
