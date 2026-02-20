/**
 * Serviço de Portal do Cliente
 * Acesso simplificado para clientes finais (sem login Supabase)
 */
const customerPortalService = {

    async getEstablishmentByCode(code) {
        const { data, error } = await window.supabaseClient
            .from('establishments')
            .select('id, name, code')
            .eq('code', code.toUpperCase().trim())
            .single();
        if (error) return null;
        return data;
    },

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
        return data || [];
    },

    async createCustomerAndOrder(customerData, items, establishmentId) {
        // 1. Verificar se cliente já existe pelo telefone
        let customerId;
        const { data: existing } = await window.supabaseClient
            .from('customers')
            .select('id')
            .eq('establishment_id', establishmentId)
            .eq('phone', customerData.phone)
            .maybeSingle(); // maybeSingle não lança erro quando não encontra

        if (existing) {
            customerId = existing.id;
        } else {
            // Criar novo cliente
            const { data: newCustomer, error: custError } = await window.supabaseClient
                .from('customers')
                .insert({
                    name: customerData.name,
                    phone: customerData.phone,
                    establishment_id: establishmentId
                })
                .select()
                .single();

            if (custError) throw new Error('Erro ao registrar cliente: ' + custError.message);
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

        if (orderError) throw new Error('Erro ao criar pedido: ' + orderError.message);

        // 4. Criar itens do pedido (se a tabela order_items existir)
        if (order && items.length > 0) {
            const orderItems = items.map(item => ({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price
            }));

            const { error: itemsError } = await window.supabaseClient
                .from('order_items')
                .insert(orderItems);

            if (itemsError) {
                // Não interrompe o fluxo — o pedido já foi criado
                console.warn('Itens do pedido não salvos:', itemsError.message);
            }
        }

        // 5. Decrementar estoque (silencioso — não bloqueia o pedido se falhar)
        for (const item of items) {
            try {
                await window.supabaseClient
                    .from('products')
                    .update({ stock: item.stock - item.quantity })
                    .eq('id', item.id);
            } catch (e) {
                console.warn('Aviso: estoque não decrementado para', item.id);
            }
        }

        return order;
    },

    saveSession(customerData, establishmentId) {
        localStorage.setItem('portal_customer', JSON.stringify(customerData));
        localStorage.setItem('portal_establishment_id', establishmentId);
    },

    getSession() {
        const customer = localStorage.getItem('portal_customer');
        const establishmentId = localStorage.getItem('portal_establishment_id');
        return {
            customer: customer ? JSON.parse(customer) : null,
            establishmentId
        };
    },

    clearSession() {
        localStorage.removeItem('portal_customer');
        localStorage.removeItem('portal_establishment_id');
        localStorage.removeItem('portal_cart');
    }
};

window.customerPortalService = customerPortalService;
