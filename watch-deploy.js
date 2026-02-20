/**
 * watch-deploy.js — Auto-deploy no Vercel a cada alteração de código
 *
 * Como usar:
 *   node watch-deploy.js
 *
 * Qualquer arquivo salvo dispara automaticamente:
 *   git add -A → git commit → git push → Vercel faz o deploy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = __dirname;
const DEBOUNCE_MS = 3000; // aguarda 3s após última alteração antes de commitar

let debounceTimer = null;
let isDeploying = false;

const IGNORED = ['.git', 'node_modules', '.DS_Store', 'watch-deploy.js'];

function shouldIgnore(filename) {
    return IGNORED.some(ig => filename.includes(ig));
}

function hasChanges() {
    try {
        const out = execSync('git status --porcelain', { cwd: PROJECT_DIR }).toString();
        return out.trim().length > 0;
    } catch { return false; }
}

function deploy() {
    if (isDeploying) return;
    if (!hasChanges()) {
        console.log('   ⟳  Sem alterações novas.\n');
        return;
    }

    isDeploying = true;
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`\n🚀 Enviando para o Vercel... [${timestamp}]`);

    try {
        execSync('git add -A', { cwd: PROJECT_DIR, stdio: 'pipe' });
        execSync(`git commit -m "auto: ${timestamp}"`, { cwd: PROJECT_DIR, stdio: 'pipe' });
        execSync('git push origin main', { cwd: PROJECT_DIR, stdio: 'pipe' });
        console.log('✅ Código enviado! O Vercel está publicando a nova versão...\n');
    } catch (e) {
        const msg = e.stderr?.toString() || e.message;
        if (msg.includes('nothing to commit')) {
            console.log('   ⟳  Nada para commitar.\n');
        } else {
            console.error('❌ Erro no deploy:', msg);
        }
    }

    isDeploying = false;
}

function onFileChange(filename) {
    if (!filename || shouldIgnore(filename)) return;
    console.log(`📝 Alterado: ${filename}`);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(deploy, DEBOUNCE_MS);
}

// Iniciar monitoramento recursivo
fs.watch(PROJECT_DIR, { recursive: true }, (event, filename) => {
    onFileChange(filename || '');
});

console.log('');
console.log('╔═══════════════════════════════════════════════╗');
console.log('║   🔄  AmbulanteTec — Auto-Deploy Ativo        ║');
console.log('║   Salve qualquer arquivo para publicar         ║');
console.log('║   automaticamente no Vercel via GitHub         ║');
console.log('║   Pressione Ctrl+C para encerrar               ║');
console.log('╚═══════════════════════════════════════════════╝');
console.log('');
