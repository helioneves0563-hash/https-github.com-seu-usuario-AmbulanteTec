/**
 * Serviço de Clientes — Integração Supabase
 * Filtrado por estabelecimento (todos os vendedores veem os mesmos clientes)
 */
const customerService = {
    /**
     * Busca todos os clientes do estabelecimento
     */
    async getCustomers() {
        const estab = await window.establishmentService.getMyEstablishment();
        if (!estab) return [];

        const { data, error } = await window.supabaseClient
            .from('customers')
            .select('*')
            .eq('establishment_id', estab.id)
            .order('name', { ascending: true });

        if (error) {
            console.error('Erro ao buscar clientes:', error);
            return [];
        }
        return data;
    },

    /**
     * Busca um cliente pelo ID
     */
    async getCustomerById(id) {
        const { data, error } = await window.supabaseClient
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar cliente:', error);
            return null;
        }
        return data;
    },

    /**
     * Cria ou atualiza um cliente (vinculando ao estabelecimento)
     */
    async upsertCustomer(customer) {
        const user = await window.authService.getCurrentUser();
        const estab = await window.establishmentService.getMyEstablishment();
        if (!estab) throw new Error('Estabelecimento não encontrado.');

        const { data, error } = await window.supabaseClient
            .from('customers')
            .upsert({ ...customer, seller_id: user?.id, establishment_id: estab.id })
            .select();

        if (error) {
            console.error('Erro ao salvar cliente:', error);
            throw error;
        }
        return data[0];
    }
};

window.customerService = customerService;
