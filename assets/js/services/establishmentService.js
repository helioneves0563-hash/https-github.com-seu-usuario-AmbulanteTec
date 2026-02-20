/**
 * Serviço de Estabelecimentos
 * Gerencia o vínculo entre vendedores e seu estabelecimento (loja/banca/etc.)
 */
const establishmentService = {
    _cache: null,

    /**
     * Gera um código único para o estabelecimento (ex: "LANCHE-A3K9")
     */
    _generateCode(name) {
        const prefix = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6) || 'EST';
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${suffix}`;
    },

    /**
     * Busca o estabelecimento do usuário logado (com cache)
     */
    async getMyEstablishment() {
        if (this._cache) return this._cache;

        const user = await window.authService.getCurrentUser();
        if (!user) return null;

        const { data, error } = await window.supabaseClient
            .from('establishment_members')
            .select('*, establishments(*)')
            .eq('user_id', user.id)
            .single();

        if (error || !data) return null;

        this._cache = { ...data.establishments, role: data.role };
        return this._cache;
    },

    /**
     * Invalida o cache (use após criar/entrar em estabelecimento)
     */
    clearCache() {
        this._cache = null;
    },

    /**
     * Cria um novo estabelecimento e associa o usuário como owner
     */
    async createEstablishment(name) {
        const user = await window.authService.getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado.');

        const code = this._generateCode(name);

        // 1. Criar estabelecimento
        const { data: estab, error: estabError } = await window.supabaseClient
            .from('establishments')
            .insert({ name, code, owner_id: user.id })
            .select()
            .single();

        if (estabError) throw estabError;

        // 2. Adicionar criador como owner
        const { error: memberError } = await window.supabaseClient
            .from('establishment_members')
            .insert({ establishment_id: estab.id, user_id: user.id, role: 'owner' });

        if (memberError) throw memberError;

        this.clearCache();
        return estab;
    },

    /**
     * Entra em um estabelecimento existente via código
     */
    async joinEstablishment(code) {
        const user = await window.authService.getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado.');

        // 1. Buscar estabelecimento pelo código
        const { data: estab, error: findError } = await window.supabaseClient
            .from('establishments')
            .select('*')
            .eq('code', code.toUpperCase().trim())
            .single();

        if (findError || !estab) throw new Error('Código inválido. Estabelecimento não encontrado.');

        // 2. Verificar se já é membro
        const { data: existing } = await window.supabaseClient
            .from('establishment_members')
            .select('id')
            .eq('establishment_id', estab.id)
            .eq('user_id', user.id)
            .single();

        if (existing) {
            this.clearCache();
            return estab; // Já é membro, apenas retorna
        }

        // 3. Inserir como membro (seller)
        const { error: memberError } = await window.supabaseClient
            .from('establishment_members')
            .insert({ establishment_id: estab.id, user_id: user.id, role: 'seller' });

        if (memberError) throw memberError;

        this.clearCache();
        return estab;
    },

    /**
     * Lista todos os membros do estabelecimento do usuário logado
     */
    async getMembers() {
        const estab = await this.getMyEstablishment();
        if (!estab) return [];

        const { data, error } = await window.supabaseClient
            .from('establishment_members')
            .select('*, user_id')
            .eq('establishment_id', estab.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar membros:', error);
            return [];
        }
        return data;
    },

    /**
     * Remove um membro do estabelecimento (apenas owner)
     */
    async removeMember(userId) {
        const estab = await this.getMyEstablishment();
        if (!estab || estab.role !== 'owner') throw new Error('Apenas o dono pode remover membros.');
        if (estab.owner_id === userId) throw new Error('O dono não pode ser removido.');

        const { error } = await window.supabaseClient
            .from('establishment_members')
            .delete()
            .eq('establishment_id', estab.id)
            .eq('user_id', userId);

        if (error) throw error;
    },

    /**
     * Busca um estabelecimento pelo código (uso público - página do cliente)
     */
    async getByCode(code) {
        const { data, error } = await window.supabaseClient
            .from('establishments')
            .select('*')
            .eq('code', code.toUpperCase().trim())
            .single();

        if (error) return null;
        return data;
    }
};

window.establishmentService = establishmentService;
