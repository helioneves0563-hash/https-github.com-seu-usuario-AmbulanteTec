/**
 * Serviço de Pedidos — Integração Supabase
 * Filtrado por estabelecimento (todos os vendedores veem os mesmos pedidos)
 */
const orderService = {
    /**
     * Busca todos os pedidos do estabelecimento com nome dos clientes
     */
    async getOrders() {
        const estab = await window.establishmentService.getMyEstablishment();
        if (!estab) return [];

        const { data, error } = await window.supabaseClient
            .from('orders')
            .select('*, customers(name)')
            .eq('establishment_id', estab.id)
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
     * Cria um novo pedido com seus itens, vinculado ao estabelecimento
     */
    async createOrderWithItems(orderData, items) {
        const user = await window.authService.getCurrentUser();
        const estab = await window.establishmentService.getMyEstablishment();
        if (!estab) throw new Error('Estabelecimento não encontrado.');

        // 1. Criar pedido
        const { data: order, error: orderError } = await window.supabaseClient
            .from('orders')
            .insert({
                ...orderData,
                seller_id: user?.id,
                establishment_id: estab.id
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Criar itens vinculados
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
     * Busca os itens de um pedido com detalhes do produto
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
     * Remove um pedido e seus itens (Cascade Delete deve estar ativado no BD)
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
