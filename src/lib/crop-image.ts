/**
 * S19 Wave 3.1: helper canvas pra cortar uma imagem em pixels especificos.
 *
 * Recebe URL/data-url da imagem original + area de pixels (x, y, width, height)
 * retornada pelo react-easy-crop, e devolve um Blob jpeg do recorte final pra
 * ser enviado pro endpoint de upload.
 *
 * Pattern oficial do react-easy-crop (https://github.com/ValentinH/react-easy-crop
 * /blob/master/docs/docs/recipes/CropImage.md) adaptado pro projeto:
 *   - sai com qualidade JPEG 0.92 (balanco tamanho/qualidade, mesma ratio que
 *     redes sociais usam pra avatares)
 *   - filename derivado do arquivo original ou "avatar.jpg" como fallback
 *   - lida com CORS (crossOrigin='anonymous') — necessario quando a imagem
 *     vem de blob: URL ou data: URL (caso comum) e tambem garante que canvas
 *     nao fique "tainted"
 */
export interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Carrega uma imagem (URL, data URL, ou object URL) em um HTMLImageElement.
 * Resolve quando o decode completa. Crucial usar crossOrigin='anonymous' pro
 * canvas.toBlob nao quebrar com "tainted canvas" em alguns navegadores.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Recorta uma imagem em area especifica de pixels e retorna um Blob JPEG.
 *
 * @param imageSrc URL/data-url/blob-url da imagem original (vinda do file picker)
 * @param pixelCrop area em pixels retornada por onCropComplete do react-easy-crop
 * @param fileName nome desejado para o arquivo (default 'avatar.jpg')
 * @returns Promise<File> — File pronto pra subir via FormData
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: CroppedAreaPixels,
  fileName = 'avatar.jpg',
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Browser nao suporta canvas 2D context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao gerar blob da imagem cortada'));
          return;
        }
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });
}

/**
 * Cria uma object URL a partir de um File (pra preview no react-easy-crop).
 * Caller deve revogar via URL.revokeObjectURL quando nao precisar mais.
 */
export function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}
