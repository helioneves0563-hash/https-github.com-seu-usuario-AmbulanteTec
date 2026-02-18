/**
 * Serviço de Destaque - Integração Supabase
 */
const highlightService = {
    /**
     * Obter o destaque do vendedor atual
     */
    async getHighlight() {
        const user = await window.authService.getCurrentUser();
        if (!user) return null;

        const { data, error } = await window.supabaseClient
            .from('highlights')
            .select('*')
            .eq('seller_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error('Erro ao buscar destaque:', error);
            return null;
        }

        return data;
    },

    /**
     * Salvar ou atualizar o destaque
     */
    async upsertHighlight(highlightData) {
        const user = await window.authService.getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data, error } = await window.supabaseClient
            .from('highlights')
            .upsert({
                ...highlightData,
                seller_id: user.id,
                updated_at: new Date()
            })
            .select();

        if (error) {
            console.error('Erro ao salvar destaque:', error);
            throw error;
        }

        return data[0];
    }
};

window.highlightService = highlightService;
