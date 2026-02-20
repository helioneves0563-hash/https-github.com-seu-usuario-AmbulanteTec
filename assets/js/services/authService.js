/**
 * Serviço de Autenticação — Integração Supabase Auth
 * Incluindo fluxo de criação/entrada em estabelecimento no cadastro
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
     * Cadastro de novo usuário + vínculo com estabelecimento
     * @param {string} email
     * @param {string} password
     * @param {string} establishmentName - Nome para criar novo estabelecimento
     * @param {string} establishmentCode - Código para entrar em estabelecimento existente
     */
    async signUp(email, password, establishmentName = '', establishmentCode = '') {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
        });
        if (error) throw error;

        // Após criar a conta, associar ao estabelecimento
        // (o usuário precisa estar logado para executar as operações RLS)
        if (data.user) {
            try {
                if (establishmentCode && establishmentCode.trim()) {
                    // Entrar em estabelecimento existente via código
                    await window.establishmentService.joinEstablishment(establishmentCode.trim());
                } else if (establishmentName && establishmentName.trim()) {
                    // Criar novo estabelecimento
                    await window.establishmentService.createEstablishment(establishmentName.trim());
                } else {
                    // Fallback: criar estabelecimento com o email como nome
                    const defaultName = email.split('@')[0];
                    await window.establishmentService.createEstablishment(defaultName);
                }
            } catch (estabError) {
                console.warn('Aviso: usuário criado mas houve erro ao vincular estabelecimento:', estabError.message);
                // Não bloqueia o cadastro, o usuário pode criar/entrar depois
            }
        }

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
        window.establishmentService?.clearCache();
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

// Listener para formulário de login
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

    // Listener para formulário de cadastro (com campo de estabelecimento)
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const establishmentName = document.getElementById('reg-establishment-name')?.value || '';
            const establishmentCode = document.getElementById('reg-establishment-code')?.value || '';
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Criando conta...';
                await authService.signUp(email, password, establishmentName, establishmentCode);
                alert('Conta criada com sucesso! Por favor, verifique seu e-mail ou faça login.');
                window.location.reload();
            } catch (error) {
                let msg = error.message;
                if (msg.includes('rate limit')) {
                    msg = 'Limite de tentativas excedido. Por favor, aguarde alguns minutos.';
                }
                alert('Erro ao cadastrar: ' + msg);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Criar Conta';
            }
        });
    }
});
