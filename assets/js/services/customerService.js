/**
 * Serviço de Clientes - Integração Supabase
 */
const customerService = {
    /**
     * Busca todos os clientes
     */
    async getCustomers() {
        const user = await window.authService.getCurrentUser();
        const { data, error } = await window.supabaseClient
            .from('customers')
            .select('*')
            .eq('seller_id', user?.id)
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
     * Cria ou atualiza um cliente
     */
    async upsertCustomer(customer) {
        const user = await window.authService.getCurrentUser();
        const { data, error } = await window.supabaseClient
            .from('customers')
            .upsert({ ...customer, seller_id: user?.id })
            .select();

        if (error) {
            console.error('Erro ao salvar cliente:', error);
            throw error;
        }
        return data[0];
    }
};

window.customerService = customerService;
