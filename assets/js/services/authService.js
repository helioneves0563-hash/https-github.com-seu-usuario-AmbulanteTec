/**
 * Serviço de Autenticação — Integração Supabase Auth
 *
 * FLUXO DE ESTABELECIMENTO:
 *  - Durante o signUp, salvamos a intenção (nome ou código) no localStorage.
 *  - O establishment.html lê essa intenção ao carregar e executa create/join
 *    quando o usuário já tem sessão ativa garantida.
 *  - Isso evita problemas de timing de sessão logo após o signUp.
 */
const authService = {

    async signIn(email, password) {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    /**
     * Cadastro de novo usuário.
     * Salva intenção de estabelecimento no localStorage para ser processada
     * quando o usuário já tiver sessão ativa (em establishment.html).
     */
    async signUp(email, password, establishmentName = '', establishmentCode = '') {
        const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
        if (error) throw error;

        // Salvar intenção de estabelecimento para processar após login
        if (establishmentCode && establishmentCode.trim()) {
            localStorage.setItem('pending_estab', JSON.stringify({
                type: 'join',
                code: establishmentCode.trim().toUpperCase()
            }));
        } else if (establishmentName && establishmentName.trim()) {
            localStorage.setItem('pending_estab', JSON.stringify({
                type: 'create',
                name: establishmentName.trim()
            }));
        }

        return data;
    },

    async signInWithGoogle() {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/index.html' }
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        window.establishmentService?.clearCache();
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        window.location.href = 'login.html';
    },

    async getCurrentUser() {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        return user;
    },

    async isAuthenticated() {
        const user = await this.getCurrentUser();
        return !!user;
    }
};

window.authService = authService;

// ─── Listeners de formulários ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = loginForm.querySelector('button[type="submit"]');
            try {
                btn.disabled = true;
                btn.textContent = 'Entrando...';
                await authService.signIn(email, password);
                // Se há intenção pendente de estabelecimento, ir para lá primeiro
                const pending = localStorage.getItem('pending_estab');
                window.location.href = pending ? 'establishment.html' : 'index.html';
            } catch (err) {
                alert('Erro ao entrar: ' + err.message);
                btn.disabled = false;
                btn.textContent = 'Entrar';
            }
        });
    }

    // Google
    const googleBtn = document.getElementById('google-login');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            try { await authService.signInWithGoogle(); }
            catch (err) { alert('Erro Google: ' + err.message); }
        });
    }

    // Cadastro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const name = document.getElementById('reg-establishment-name')?.value || '';
            const code = document.getElementById('reg-establishment-code')?.value || '';
            const btn = registerForm.querySelector('button[type="submit"]');
            try {
                btn.disabled = true;
                btn.textContent = 'Criando conta...';
                await authService.signUp(email, password, name, code);
                alert('Conta criada! Faça login para continuar.');
                window.toggleView?.('login');
            } catch (err) {
                let msg = err.message;
                if (msg.includes('rate limit')) msg = 'Aguarde alguns minutos antes de tentar novamente.';
                alert('Erro ao cadastrar: ' + msg);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Criar Conta';
            }
        });
    }
});
