/**
 * Serviço de Produtos - Integração Supabase
 */
const productService = {
    /**
     * Busca todos os produtos ativos do banco de dados
     */
    async getProducts() {
        const user = await window.authService.getCurrentUser();
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .eq('seller_id', user?.id)
            .order('name', { ascending: true });

        if (error) {
            console.error('Erro ao buscar produtos:', error);
            return [];
        }
        return data;
    },

    /**
     * Busca um produto pelo ID
     */
    async getProductById(id) {
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar produto:', error);
            return null;
        }
        return data;
    },

    /**
     * Cria ou atualiza um produto
     */
    async upsertProduct(product) {
        const user = await window.authService.getCurrentUser();
        const { data, error } = await window.supabaseClient
            .from('products')
            .upsert({ ...product, seller_id: user?.id })
            .select();

        if (error) {
            console.error('Erro ao salvar produto:', error);
            throw error;
        }
        return data[0];
    },

    /**
     * Remove um produto (soft delete ou hard delete conforme sua regra)
     */
    async deleteProduct(id) {
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao excluir produto:', error);
            throw error;
        }
        return true;
    },

    /**
     * Decrementa o estoque de um produto com validação
     */
    async decrementStock(productId, quantity) {
        // Primeiro busca o estoque atual para garantir que ainda há produto
        const product = await this.getProductById(productId);

        if (!product) {
            throw new Error('Produto não encontrado.');
        }

        const currentStock = product.stock || 0;

        if (currentStock < quantity) {
            throw new Error(`Estoque insuficiente para "${product.name}". Disponível: ${currentStock}`);
        }

        const newStock = currentStock - quantity;

        const { error } = await window.supabaseClient
            .from('products')
            .update({ stock: newStock })
            .eq('id', productId);

        if (error) {
            console.error('Erro ao baixar estoque:', error);
            throw error;
        }
    }
};

window.productService = productService;
