/**
 * AdminService — Painel do Gestor do AmbulanteTec
 *
 * Identificação de admin: usuário deve estar na tabela `app_admins`.
 * Para tornar um usuário admin, insira o user_id via Supabase SQL Editor:
 *   INSERT INTO app_admins (user_id) VALUES ('<seu-user-id>');
 */
const adminService = {
    _isAdminCache: null,

    /** Verifica se o usuário atual é admin */
    async isAdmin() {
        if (this._isAdminCache !== null) return this._isAdminCache;
        const user = await window.authService.getCurrentUser();
        if (!user) { this._isAdminCache = false; return false; }

        const { data, error } = await window.supabaseClient
            .from('app_admins')
            .select('user_id')
            .eq('user_id', user.id)
            .single();

        this._isAdminCache = !error && !!data;
        return this._isAdminCache;
    },

    /** Lista todos os estabelecimentos com contagem de membros */
    async getAllEstablishments() {
        const { data, error } = await window.supabaseClient
            .from('establishments')
            .select('*, establishment_members(count)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /** Cria um estabelecimento pré-cadastrado com código customizado */
    async createEstablishment(name, code) {
        const user = await window.authService.getCurrentUser();
        if (!user) throw new Error('Não autenticado');

        const finalCode = code
            ? code.toUpperCase().trim()
            : name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

        const { data, error } = await window.supabaseClient
            .from('establishments')
            .insert({ name: name.trim(), code: finalCode, owner_id: user.id })
            .select()
            .single();

        if (error) throw error;

        // Adicionar criador como owner
        await window.supabaseClient
            .from('establishment_members')
            .insert({ establishment_id: data.id, user_id: user.id, role: 'owner' });

        return data;
    },

    /** Exclui um estabelecimento */
    async deleteEstablishment(id) {
        const { error } = await window.supabaseClient
            .from('establishments')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    /** Lista todas as propagandas globais (establishment_id IS NULL) */
    async getAllAds() {
        const { data, error } = await window.supabaseClient
            .from('ads')
            .select('*')
            .is('establishment_id', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /** Cria propaganda global */
    async createAd(adData) {
        const { data, error } = await window.supabaseClient
            .from('ads')
            .insert({ ...adData, establishment_id: null, active: true })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /** Exclui propaganda */
    async deleteAd(id) {
        const { error } = await window.supabaseClient
            .from('ads')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

window.adminService = adminService;
