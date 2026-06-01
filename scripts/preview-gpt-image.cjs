/**
 * Prévia local: testa gpt-image-2 (ou GPT_IMAGES_MODEL) + composição de prompt (sem Supabase).
 * Uso (na raiz do repo): node scripts/preview-gpt-image.cjs
 *        node scripts/preview-gpt-image.cjs --story
 *        node scripts/preview-gpt-image.cjs --edit   (precisa scripts/fixtures/sample-logo.png)
 *
 * Requer GPT_IMAGES_API_KEY no .env da raiz ou no ambiente.
 * Opcional: GPT_IMAGES_MODEL=gpt-image-2 | dall-e-3 | dall-e-2
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API = 'https://api.openai.com/v1';

function resolveModel() {
  return (process.env.GPT_IMAGES_MODEL || 'gpt-image-2').trim();
}

function apiSizeFor(model, isStory) {
  if (model === 'dall-e-3') return isStory ? '1024x1792' : '1024x1024';
  if (model === 'dall-e-2') return '1024x1024';
  return isStory ? '1024x1536' : '1024x1024';
}

function buildComposedPrompt({ format, userPrompt }) {
  const brandName = 'Café Aurora (exemplo)';
  const instagram = '@cafeaurora_exemplo';
  const guidelines =
    'Tom acolhedor, fotografia natural, luz suave. Evitar estética genérica de stock.';
  const primary = '#5C4033';
  const secondary = '#D4A574';
  const fontNotes = 'Tipografia: sans geométrica amigável para títulos curtos.';

  const formatBlock =
    format === 'story'
      ? 'Formato: arte vertical 9:16 para story de rede social (campo seguro para texto/links).'
      : 'Formato: post quadrado 1:1 para feed de rede social.';

  return [
    'Create a polished social media image for the following brand. Follow the brand constraints closely.',
    `Brand name: ${brandName}`,
    `Instagram handle: ${instagram}`,
    `Brand visual guidelines: ${guidelines}`,
    `Primary color: ${primary}. Secondary accent: ${secondary}.`,
    fontNotes,
    formatBlock,
    'Respect brand identity; do not distort or parody logos if reference images are provided.',
    '',
    'Creative direction from the marketer:',
    userPrompt,
  ].join('\n');
}

async function generations({ apiKey, model, prompt, size, quality }) {
  let body;
  if (model === 'dall-e-3') {
    body = {
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality: quality === 'high' ? 'hd' : 'standard',
      response_format: 'b64_json',
    };
  } else if (model === 'dall-e-2') {
    body = {
      model: 'dall-e-2',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    };
  } else {
    body = {
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size,
      quality,
    };
  }
  const res = await fetch(`${API}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.message || JSON.stringify(json) || res.statusText);
  }
  const item = json.data?.[0];
  const b64 = item?.b64_json;
  if (b64) return { b64 };
  if (item?.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`Falha ao baixar URL da imagem (${r.status})`);
    return { b64: Buffer.from(await r.arrayBuffer()).toString('base64') };
  }
  throw new Error('Resposta sem imagem (b64_json/url)');
}

async function edits({ apiKey, editModel, prompt, imagePath, size, quality }) {
  const buf = fs.readFileSync(imagePath);
  const fd = new FormData();
  fd.append('model', editModel);
  fd.append('prompt', prompt);
  fd.append('n', '1');
  if (editModel === 'gpt-image-2') {
    fd.append('size', size);
    fd.append('quality', quality);
  } else {
    fd.append('size', size);
    fd.append('response_format', 'b64_json');
  }
  const blob = new Blob([buf], { type: 'image/png' });
  fd.append('image', blob, 'ref.png');

  const res = await fetch(`${API}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.message || JSON.stringify(json) || res.statusText);
  }
  const item = json.data?.[0];
  const b64 = item?.b64_json;
  if (b64) return { b64 };
  if (item?.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`Falha ao baixar URL (${r.status})`);
    return { b64: Buffer.from(await r.arrayBuffer()).toString('base64') };
  }
  throw new Error('Resposta sem imagem (edits)');
}

async function main() {
  const apiKey = process.env.GPT_IMAGES_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Defina GPT_IMAGES_API_KEY (ou OPENAI_API_KEY) no .env ou no ambiente.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const isStory = args.includes('--story');
  const isEdit = args.includes('--edit');
  const model = resolveModel();
  const size = apiSizeFor(model, isStory);
  const format = isStory ? 'story' : 'feed';
  const userPrompt =
    'Promoção de café da manhã com croissant e cappuccino em uma mesa de madeira clara, manhã ensolarada.';

  const prompt = buildComposedPrompt({ format, userPrompt });
  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Gerando com ${model} (quality=low)...`);
  let b64;
  if (isEdit) {
    const logoPath = path.join(__dirname, 'fixtures', 'sample-logo.png');
    if (!fs.existsSync(logoPath)) {
      console.error('Coloque um PNG em', logoPath, 'ou rode sem --edit');
      process.exit(1);
    }
    const isGpt = model === 'gpt-image-2' || model.startsWith('gpt-image');
    const canLogoEdit = isGpt || !isStory;
    if (!canLogoEdit) {
      console.warn('Com DALL·E, edição com logo só no feed; gerando em story sem referência à logo.');
      ({ b64 } = await generations({ apiKey, model, prompt, size, quality: 'low' }));
    } else {
      const editModel = isGpt ? 'gpt-image-2' : 'dall-e-2';
      const editSize = editModel === 'dall-e-2' ? '1024x1024' : size;
      ({ b64 } = await edits({
        apiKey,
        editModel,
        prompt,
        imagePath: logoPath,
        size: editSize,
        quality: 'low',
      }));
    }
  } else {
    ({ b64 } = await generations({ apiKey, model, prompt, size, quality: 'low' }));
  }

  const outFile = path.join(outDir, isEdit ? 'preview-edit.png' : isStory ? 'preview-story.png' : 'preview-feed.png');
  fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
  console.log('OK:', outFile);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
