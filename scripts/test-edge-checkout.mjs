import 'dotenv/config';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const ANON = process.env.REACT_APP_SUPABASE_KEY;

const priceId = process.argv[2] || 'price_1TNCCk5QaHLfiCdUDgq3gXFs';

const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: ANON,
    Authorization: `Bearer ${ANON}`,
    origin: 'http://localhost:3000',
  },
  body: JSON.stringify({
    items: [{ priceId, quantity: 1 }],
    organizationId: '00000000-0000-0000-0000-000000000000',
    userId: '00000000-0000-0000-0000-000000000000',
  }),
});
const data = await res.json();
console.log('HTTP', res.status);
console.log(JSON.stringify(data, null, 2));
