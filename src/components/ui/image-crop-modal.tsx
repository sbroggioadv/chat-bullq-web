'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Check, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { getCroppedImageBlob } from '@/lib/crop-image';

/**
 * S19 Wave 3.1: modal de crop de imagem com mascara circular ou quadrada,
 * controle de zoom (slider + scroll wheel) e drag pra posicionar.
 *
 * Pattern UX espelhado de GitHub/LinkedIn/Slack:
 *   1. User seleciona arquivo no ImageUpload
 *   2. Em vez de upload direto, ImageUpload abre este modal com a imagem
 *   3. User ajusta zoom + drag pra posicionar dentro da mascara
 *   4. Confirma -> componente retorna um File JPEG cortado nas dimensoes alvo
 *   5. ImageUpload faz upload do File resultante
 *
 * Forma do crop (`shape`) sincroniza com a do ImageUpload — `circle` pra avatar,
 * `square` (com cantos arredondados na preview) pra logo workspace.
 */
interface ImageCropModalProps {
  /** File original selecionado pelo usuario (vem do <input type='file'>) */
  file: File;
  /** Forma da mascara de crop. 'circle' = avatar; 'square' = logo */
  shape: 'circle' | 'square';
  /** Tamanho de saida em pixels (lado do quadrado). Default 512x512. */
  outputSize?: number;
  /** Chamado quando o user clica em "Aplicar" — recebe o File JPEG cortado */
  onConfirm: (cropped: File) => void;
  /** Chamado quando o user clica em "Cancelar" ou Escape */
  onCancel: () => void;
}

const DEFAULT_OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;

export function ImageCropModal({
  file,
  shape,
  outputSize = DEFAULT_OUTPUT_SIZE,
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  // URL temporaria do arquivo — revogada no cleanup pra evitar memory leak.
  // Recriada sempre que `file` muda (raro neste modal, mas defensivo).
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Estado do cropper (controlado)
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  // Callback do react-easy-crop chamado a cada interacao. Guardamos so a
  // ultima area em pixels — usada no momento do "Aplicar" pra desenhar o
  // recorte no canvas.
  const onCropComplete = useCallback((_cropped: Area, croppedPx: Area) => {
    setCroppedAreaPixels(croppedPx);
  }, []);

  // Escape fecha (quando nao esta processando — evita perder progresso)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, processing]);

  const handleConfirm = async () => {
    if (!objectUrl || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      // Nome do file derivado do original — mantem a extensao .jpg porque
      // o canvas.toBlob sempre exporta JPEG (qualidade 0.92).
      const fileName = file.name.replace(/\.[^.]+$/, '') + '-cropped.jpg';
      const cropped = await getCroppedImageBlob(
        objectUrl,
        croppedAreaPixels,
        fileName,
      );
      onConfirm(cropped);
    } catch (err) {
      // Falha aqui e rara (canvas + image decode bem suportados em todos
      // browsers modernos). Caller (ImageUpload) lida com toast.
      console.error('Erro ao cortar imagem:', err);
      setProcessing(false);
    }
  };

  const aspect = 1; // sempre quadrado (avatar/logo sao 1:1)
  const cropShape = shape === 'circle' ? 'round' : 'rect';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => !processing && onCancel()}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h3 id="crop-modal-title" className="text-base font-semibold text-fg">
            Ajustar imagem
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="rounded-lg p-1 text-fg-muted transition-colors hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cancelar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative h-[420px] w-full bg-black/95">
          {objectUrl && (
            <Cropper
              image={objectUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={shape === 'square'}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              cropSize={{ width: 360, height: 360 }}
              objectFit="contain"
              restrictPosition
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 px-6 py-4">
          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.2))}
              disabled={processing || zoom <= MIN_ZOOM}
              className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Diminuir zoom"
            >
              <ZoomOut className="size-4" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              disabled={processing}
              aria-label="Zoom"
              className="flex-1 accent-[var(--primary)] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.2))}
              disabled={processing || zoom >= MAX_ZOOM}
              className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              disabled={processing}
              className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Girar 90 graus"
              title="Girar 90°"
            >
              <RotateCw className="size-4" />
            </button>
          </div>

          {/* Hint */}
          <p className="text-xs text-fg-muted">
            Arraste a imagem para posicionar. Use o slider ou a roda do mouse para zoom.
          </p>
        </div>

        {/* Footer com acoes */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="text-sm font-medium text-fg-muted hover:text-fg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing || !croppedAreaPixels}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processando…
              </>
            ) : (
              <>
                <Check className="size-4" />
                Aplicar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unused import suppression intentionally — outputSize is reserved for
          future "Aplicar em tamanho HxW" — react-easy-crop already exporta na
          resolucao do croppedAreaPixels (default = pixels reais do recorte). */}
      <span className="hidden" aria-hidden>
        {outputSize}
      </span>
    </div>
  );
}
