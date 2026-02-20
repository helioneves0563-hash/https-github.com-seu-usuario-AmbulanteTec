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

        // 2. Calcular total dos novos itens
        const newTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // 3. Verificar se já existe um pedido em aberto para acumular
        let order;
        const { data: openOrders } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('customer_id', customerId)
            .eq('status', 'Aberto')
            .order('created_at', { ascending: false })
            .limit(1);

        if (openOrders && openOrders.length > 0) {
            // Reutiliza e atualiza o pedido aberto existente
            order = openOrders[0];
            const updatedTotal = parseFloat(order.total || 0) + newTotal;

            const { data: updatedOrder, error: updateError } = await window.supabaseClient
                .from('orders')
                .update({ total: updatedTotal })
                .eq('id', order.id)
                .select()
                .single();

            if (updateError) throw new Error('Erro ao atualizar pedido existente: ' + updateError.message);
            order = updatedOrder;
        } else {
            // Criar um novo pedido
            const { data: newOrder, error: orderError } = await window.supabaseClient
                .from('orders')
                .insert({
                    customer_id: customerId,
                    establishment_id: establishmentId,
                    total: newTotal,
                    status: 'Aberto'
                })
                .select()
                .single();

            if (orderError) throw new Error('Erro ao criar pedido: ' + orderError.message);
            order = newOrder;
        }

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
