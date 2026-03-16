export interface VideoFormatInfo {
  container: 'mp4' | 'mov' | 'unknown';
  codec: 'h264' | 'hevc' | 'unknown';
  isCompatible: boolean;
  details: string;
}

const CHUNK_SIZE = 512 * 1024; // 512KB

const MP4_BRANDS = new Set([
  'isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6',
  'mp41', 'mp42', 'mp71',
  'avc1', 'M4V ', 'M4A ', 'f4v ', 'dash',
  'msdh', 'msix',
]);

const MOV_BRANDS = new Set(['qt  ', 'MSNV']);

const H264_CODECS = new Set(['avc1', 'avc2', 'avc3', 'avc4']);
const HEVC_CODECS = new Set(['hvc1', 'hev1', 'hev2']);

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, false); // big-endian
}

function readString(view: DataView, offset: number, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(view.getUint8(offset + i));
  }
  return s;
}

function identifyContainer(majorBrand: string): 'mp4' | 'mov' | 'unknown' {
  if (MOV_BRANDS.has(majorBrand)) return 'mov';
  if (MP4_BRANDS.has(majorBrand)) return 'mp4';
  return 'unknown';
}

/**
 * Recursively searches MP4/MOV box structure for video codec identifiers.
 * Boxes that can contain children: moov, trak, mdia, minf, stbl.
 */
function findCodecInBoxes(
  view: DataView,
  start: number,
  end: number,
  depth: number = 0
): 'h264' | 'hevc' | null {
  if (depth > 12) return null;

  const containerBoxes = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl']);
  let offset = start;

  while (offset + 8 <= end) {
    let boxSize = readUint32(view, offset);
    const boxType = readString(view, offset + 4, 4);

    if (boxSize === 0) break;

    let headerSize = 8;
    if (boxSize === 1) {
      if (offset + 16 > end) break;
      const hi = readUint32(view, offset + 8);
      const lo = readUint32(view, offset + 12);
      boxSize = hi * 0x100000000 + lo;
      headerSize = 16;
    }

    if (boxSize < headerSize) break;

    const boxEnd = Math.min(offset + boxSize, end);
    const contentStart = offset + headerSize;

    if (boxType === 'stsd') {
      // stsd box: 4 bytes version/flags + 4 bytes entry_count, then entries
      const entryStart = contentStart + 8;
      if (entryStart + 8 <= boxEnd) {
        const entryCodec = readString(view, entryStart + 4, 4);
        if (H264_CODECS.has(entryCodec)) return 'h264';
        if (HEVC_CODECS.has(entryCodec)) return 'hevc';
      }
      // scan remaining stsd bytes for codec markers
      for (let i = contentStart; i + 4 <= boxEnd; i++) {
        const marker = readString(view, i, 4);
        if (H264_CODECS.has(marker)) return 'h264';
        if (HEVC_CODECS.has(marker)) return 'hevc';
      }
    } else if (containerBoxes.has(boxType)) {
      const result = findCodecInBoxes(view, contentStart, boxEnd, depth + 1);
      if (result) return result;
    }

    offset += boxSize;
  }

  return null;
}

/**
 * Scans a raw buffer for codec fourCC markers as a last-resort fallback.
 */
function scanForCodecMarkers(view: DataView): 'h264' | 'hevc' | null {
  for (let i = 0; i + 4 <= view.byteLength; i++) {
    const marker = readString(view, i, 4);
    if (HEVC_CODECS.has(marker)) return 'hevc';
    if (H264_CODECS.has(marker)) return 'h264';
  }
  return null;
}

async function readChunk(
  file: File,
  start: number,
  size: number
): Promise<ArrayBuffer> {
  const end = Math.min(start + size, file.size);
  const blob = file.slice(start, end);
  return blob.arrayBuffer();
}

/**
 * Detects the container type and video codec of a video file by parsing
 * the MP4/MOV box structure from the file's binary header.
 *
 * Reads the first and (if needed) last 512KB of the file.
 */
export async function detectVideoFormat(file: File): Promise<VideoFormatInfo> {
  try {
    // Read the first chunk
    const headBuffer = await readChunk(file, 0, CHUNK_SIZE);
    const headView = new DataView(headBuffer);

    // Parse ftyp box
    let container: VideoFormatInfo['container'] = 'unknown';
    if (headView.byteLength >= 12) {
      const ftypType = readString(headView, 4, 4);
      if (ftypType === 'ftyp') {
        const majorBrand = readString(headView, 8, 4);
        container = identifyContainer(majorBrand);
      }
    }

    // Try structured box parsing on head chunk
    let codec = findCodecInBoxes(headView, 0, headView.byteLength);

    // If codec not found in head, try tail chunk (moov at end of file)
    if (!codec && file.size > CHUNK_SIZE) {
      const tailStart = Math.max(0, file.size - CHUNK_SIZE);
      const tailBuffer = await readChunk(file, tailStart, CHUNK_SIZE);
      const tailView = new DataView(tailBuffer);
      codec = findCodecInBoxes(tailView, 0, tailView.byteLength);

      // Last resort: brute-force scan tail for fourCC markers
      if (!codec) {
        codec = scanForCodecMarkers(tailView);
      }
    }

    // Last resort: brute-force scan head for fourCC markers
    if (!codec) {
      codec = scanForCodecMarkers(headView);
    }

    const finalCodec = codec ?? 'unknown';
    const isCompatible = finalCodec !== 'hevc';

    let details: string;
    if (finalCodec === 'h264') {
      details = `Container: ${container.toUpperCase()}, Codec: H.264 (compatível)`;
    } else if (finalCodec === 'hevc') {
      details = `Container: ${container.toUpperCase()}, Codec: HEVC/H.265 (incompatível com Instagram)`;
    } else {
      details = `Container: ${container.toUpperCase()}, Codec: não identificado`;
    }

    return { container, codec: finalCodec, isCompatible, details };
  } catch (error) {
    console.warn('Erro ao analisar formato do vídeo:', error);
    return {
      container: 'unknown',
      codec: 'unknown',
      isCompatible: true, // assume compatible on error to avoid false blocking
      details: 'Não foi possível analisar o formato do vídeo',
    };
  }
}
