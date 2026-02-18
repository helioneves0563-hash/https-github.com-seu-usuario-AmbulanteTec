/**
 * Serviço de Pedidos - Integração Supabase
 */
const orderService = {
    /**
     * Busca todos os pedidos com os nomes dos clientes
     */
    async getOrders() {
        const user = await window.authService.getCurrentUser();
        const { data, error } = await window.supabaseClient
            .from('orders')
            .select('*, customers(name)')
            .eq('seller_id', user?.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar pedidos:', error);
            return [];
        }
        return data;
    },

    /**
     * Busca um pedido detalhado pelo ID
     */
    async getOrderById(id) {
        const { data, error } = await window.supabaseClient
            .from('orders')
            .select('*, customers(*)')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar pedido:', error);
            return null;
        }
        return data;
    },

    /**
     * Cria ou atualiza um pedido
     */
    async upsertOrder(order) {
        const { data, error } = await window.supabaseClient
            .from('orders')
            .upsert(order)
            .select();

        if (error) {
            console.error('Erro ao salvar pedido:', error);
            throw error;
        }
        return data[0];
    },

    /**
     * Cria um novo pedido e seus itens vinculados
     */
    async createOrderWithItems(orderData, items) {
        // 1. Criar o pedido
        const { data: order, error: orderError } = await window.supabaseClient
            .from('orders')
            .insert({ ...orderData, seller_id: (await window.authService.getCurrentUser())?.id })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Criar os itens vinculados
        const itemsToInsert = items.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price
        }));

        const { error: itemsError } = await window.supabaseClient
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        return order;
    },

    /**
     * Busca os itens de um pedido com detalhes básicos do produto
     */
    async getOrderItems(orderId) {
        const { data, error } = await window.supabaseClient
            .from('order_items')
            .select(`
                *,
                product:products (
                    name,
                    price,
                    image_url,
                    category
                )
            `)
            .eq('order_id', orderId);

        if (error) throw error;
        return data;
    },

    /**
     * Remove um pedido e seus itens (Cascade Delete deve estar ativo no BD)
     */
    async deleteOrder(id) {
        const { error } = await window.supabaseClient
            .from('orders')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao excluir pedido:', error);
            throw error;
        }
        return true;
    }
};

window.orderService = orderService;
