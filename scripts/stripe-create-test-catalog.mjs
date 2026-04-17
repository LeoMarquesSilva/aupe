#!/usr/bin/env node
// scripts/stripe-create-test-catalog.mjs
// Cria todos os produtos/preços em TEST mode usando a chave STRIPE_SECRET_KEY_TEST do .env.
// Uso: node scripts/stripe-create-test-catalog.mjs
// Output: JSON com os novos IDs para copiar/colar em stripeProducts.ts e na migration.

import 'dotenv/config';

const STRIPE_API = 'https://api.stripe.com/v1';
const SECRET_KEY =
  process.env.STRIPE_SECRET_KEY_TEST ||
  process.env.REACT_APP_STRIPE_SECRET_KEY_TEST ||
  (process.env.REACT_APP_STRIPE_SECRET_KEY?.startsWith('sk_test_')
    ? process.env.REACT_APP_STRIPE_SECRET_KEY
    : null);

if (!SECRET_KEY) {
  console.error(
    '❌ Nenhuma chave TEST encontrada. Defina STRIPE_SECRET_KEY_TEST no .env (valor sk_test_...).'
  );
  process.exit(1);
}

if (!SECRET_KEY.startsWith('sk_test_')) {
  console.error('❌ A chave fornecida não é uma sk_test_ — abortando por segurança.');
  process.exit(1);
}

// Catálogo espelho do plan: nome, descrição, amount (cents), recurring (mensal)
const PLANS = [
  { code: 'STARTER', name: 'INSYT STARTER', amount: 3000, description: 'Para começar a profissionalizar sua operação' },
  { code: 'BASIC', name: 'INSYT BASIC', amount: 17800, description: 'Para quem está escalando a operação' },
  { code: 'PRO', name: 'INSYT PRO', amount: 35600, description: 'Para times e agências consolidadas' },
  { code: 'BUSINESS', name: 'INSYT BUSINESS', amount: 50000, description: 'Operação avançada multi-conta' },
  { code: 'ENTERPRISE', name: 'INSYT ENTERPRISE', amount: 100, description: 'Preço sob consulta — fale com nossa equipe' },
];

const ADDONS = [
  { code: 'CONTA_ADICIONAL_STARTER', name: 'INSYT Add-on Conta Adicional - STARTER', amount: 3000, scope: 'STARTER' },
  { code: 'CONTA_ADICIONAL_BASIC', name: 'INSYT Add-on Conta Adicional - BASIC', amount: 2000, scope: 'BASIC' },
  { code: 'CONTA_ADICIONAL_PRO', name: 'INSYT Add-on Conta Adicional - PRO', amount: 1800, scope: 'PRO' },
  { code: 'CONTA_ADICIONAL_BUSINESS', name: 'INSYT Add-on Conta Adicional - BUSINESS', amount: 1500, scope: 'BUSINESS' },
  { code: 'CONTA_ADICIONAL_ENTERPRISE', name: 'INSYT Add-on Conta Adicional - ENTERPRISE', amount: 1200, scope: 'ENTERPRISE' },
  { code: 'FLUXO_APROVACAO', name: 'INSYT Add-on Fluxo de Aprovação', amount: 10000, scope: null },
];

async function stripe(method, path, form) {
  const body = form
    ? Object.entries(form)
        .flatMap(([k, v]) =>
          Array.isArray(v)
            ? v.map((item, i) =>
                typeof item === 'object'
                  ? Object.entries(item).map(
                      ([ik, iv]) => `${encodeURIComponent(`${k}[${i}][${ik}]`)}=${encodeURIComponent(iv)}`
                    )
                  : `${encodeURIComponent(`${k}[${i}]`)}=${encodeURIComponent(item)}`
              )
            : typeof v === 'object'
              ? Object.entries(v).map(
                  ([ik, iv]) => `${encodeURIComponent(`${k}[${ik}]`)}=${encodeURIComponent(iv)}`
                )
              : [`${encodeURIComponent(k)}=${encodeURIComponent(v)}`]
        )
        .flat()
        .join('&')
    : undefined;
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${method} ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function createItem({ name, description, amount, metadata }) {
  const product = await stripe('POST', '/products', {
    name,
    ...(description ? { description } : {}),
    ...(metadata ? { metadata } : {}),
  });
  const price = await stripe('POST', '/prices', {
    product: product.id,
    unit_amount: amount,
    currency: 'brl',
    recurring: { interval: 'month' },
  });
  return { productId: product.id, priceId: price.id, amount };
}

async function main() {
  console.log('🔑 Usando chave:', SECRET_KEY.slice(0, 12) + '...' + SECRET_KEY.slice(-6));
  console.log('🚀 Criando catálogo em TEST mode...\n');

  const plans = {};
  for (const p of PLANS) {
    console.log(`  📦 Plano ${p.code}...`);
    plans[p.code] = await createItem({
      name: p.name,
      description: p.description,
      amount: p.amount,
      metadata: { insyt_code: p.code, insyt_type: 'plan' },
    });
    console.log(`     product=${plans[p.code].productId}  price=${plans[p.code].priceId}`);
  }

  const addons = {};
  for (const a of ADDONS) {
    console.log(`  🧩 Addon ${a.code}...`);
    addons[a.code] = await createItem({
      name: a.name,
      amount: a.amount,
      metadata: {
        insyt_code: a.code,
        insyt_type: 'addon',
        ...(a.scope ? { insyt_scope_plan: a.scope } : {}),
      },
    });
    console.log(`     product=${addons[a.code].productId}  price=${addons[a.code].priceId}`);
  }

  const output = { plans, addons };
  const outPath = 'scripts/stripe-test-catalog.out.json';
  await (await import('fs/promises')).writeFile(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Catálogo salvo em ${outPath}`);
  console.log('\n📋 Resultado:\n' + JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
