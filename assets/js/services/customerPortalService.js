/**
 * Serviço de Portal do Cliente
 * Acesso simplificado para clientes finais (sem login Supabase)
 */
const customerPortalService = {
    /**
     * Busca dados públicos de um estabelecimento pelo código
     */
    async getEstablishmentByCode(code) {
        const { data, error } = await window.supabaseClient
            .from('establishments')
            .select('id, name, code')
            .eq('code', code.toUpperCase().trim())
            .single();

        if (error) return null;
        return data;
    },

    /**
     * Busca produtos disponíveis (com estoque > 0) do estabelecimento
     */
    async getPublicProducts(establishmentId) {
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .eq('establishment_id', establishmentId)
            .eq('available', true)
            .gt('stock', 0)
            .order('category', { ascending: true });

        if (error) {
            console.error('Erro ao buscar produtos:', error);
            return [];
        }
        return data;
    },

    /**
     * Cria o cliente (se não existir) e o pedido com os itens
     */
    async createCustomerAndOrder(customerData, items, establishmentId) {
        // 1. Verificar se cliente já existe (pelo telefone no estabelecimento)
        let customerId;
        const { data: existing } = await window.supabaseClient
            .from('customers')
            .select('id')
            .eq('establishment_id', establishmentId)
            .eq('phone', customerData.phone)
            .single();

        if (existing) {
            customerId = existing.id;
        } else {
            // Criar novo cliente
            const { data: newCustomer, error: custError } = await window.supabaseClient
                .from('customers')
                .insert({
                    name: customerData.name,
                    phone: customerData.phone,
                    establishment_id: establishmentId,
                    status: 'Active'
                })
                .select()
                .single();

            if (custError) throw custError;
            customerId = newCustomer.id;
        }

        // 2. Calcular total
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // 3. Criar pedido
        const { data: order, error: orderError } = await window.supabaseClient
            .from('orders')
            .insert({
                customer_id: customerId,
                establishment_id: establishmentId,
                total,
                status: 'Aberto'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 4. Criar itens do pedido
        const orderItems = items.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price
        }));

        const { error: itemsError } = await window.supabaseClient
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // 5. Decrementar estoque de cada produto
        for (const item of items) {
            await window.supabaseClient.rpc('decrement_stock', {
                p_product_id: item.id,
                p_quantity: item.quantity
            }).catch(e => console.warn('Erro ao decrementar estoque:', e));
        }

        return order;
    },

    /**
     * Salva dados do cliente na sessão (localStorage)
     */
    saveSession(customerData, establishmentId) {
        localStorage.setItem('portal_customer', JSON.stringify(customerData));
        localStorage.setItem('portal_establishment_id', establishmentId);
    },

    /**
     * Recupera a sessão do cliente
     */
    getSession() {
        const customer = localStorage.getItem('portal_customer');
        const establishmentId = localStorage.getItem('portal_establishment_id');
        return {
            customer: customer ? JSON.parse(customer) : null,
            establishmentId
        };
    },

    /**
     * Encerra a sessão do cliente
     */
    clearSession() {
        localStorage.removeItem('portal_customer');
        localStorage.removeItem('portal_establishment_id');
        localStorage.removeItem('portal_cart');
    }
};

window.customerPortalService = customerPortalService;
