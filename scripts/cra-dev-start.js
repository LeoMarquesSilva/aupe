/**
 * CRA/dotenv não sobrescreve variáveis já presentes em process.env.
 * PowerShell, launch.json ou CI costumam definir REACT_APP_*="" e o .env deixa de aplicar o App Secret.
 */
const { spawn } = require('child_process');
const path = require('path');

const KEYS = [
  'REACT_APP_FACEBOOK_APP_SECRET',
  'REACT_APP_META_APP_SECRET',
  'REACT_APP_INSTAGRAM_APP_SECRET',
];

for (const k of KEYS) {
  const v = process.env[k];
  if (v !== undefined && String(v).trim() === '') {
    delete process.env[k];
  }
}

const root = path.join(__dirname, '..');
const startScript = path.join(root, 'node_modules', 'react-scripts', 'scripts', 'start.js');

const child = spawn(process.execPath, [startScript], {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
