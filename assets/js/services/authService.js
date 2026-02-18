/**
 * Serviço de Autenticação - Integração Supabase Auth
 */
const authService = {
    /**
     * Login com e-mail e senha
     */
    async signIn(email, password) {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    /**
     * Cadastro de novo usuário
     */
    async signUp(email, password) {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    /**
     * Login com Google
     */
    async signInWithGoogle() {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });

        if (error) throw error;
        return data;
    },

    /**
     * Logout
     */
    async signOut() {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        window.location.href = 'login.html';
    },

    /**
     * Obter usuário atual
     */
    async getCurrentUser() {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        return user;
    },

    /**
     * Verificar se está logado
     */
    async isAuthenticated() {
        const user = await this.getCurrentUser();
        return !!user;
    }
};

window.authService = authService;

// Listener para o formulário de login (se existir na página)
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Entrando...';
                await authService.signIn(email, password);
                window.location.href = 'index.html';
            } catch (error) {
                alert('Erro ao entrar: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
            }
        });
    }

    const googleBtn = document.getElementById('google-login');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            try {
                await authService.signInWithGoogle();
            } catch (error) {
                alert('Erro ao entrar com Google: ' + error.message);
            }
        });
    }

    // Listener para o formulário de cadastro (se existir na página)
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Criando conta...';
                await authService.signUp(email, password);
                alert('Conta criada com sucesso! Por favor, verifique seu e-mail ou faça login.');
                window.location.reload();
            } catch (error) {
                let msg = error.message;
                if (msg.includes('rate limit')) {
                    msg = 'Limite de tentativas excedido. Por favor, aguarde de 1 a 5 minutos antes de tentar novamente.';
                }
                alert('Erro ao cadastrar: ' + msg);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Criar Conta';
            }
        });
    }
});
