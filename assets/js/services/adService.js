/**
 * Serviço de Anúncios
 * Gerencia os anúncios exibidos para os clientes após confirmação de pedido
 */
const adService = {
    /**
     * Busca todos os anúncios ativos do estabelecimento
     */
    async getActiveAds(establishmentId) {
        const { data, error } = await window.supabaseClient
            .from('ads')
            .select('*')
            .eq('establishment_id', establishmentId)
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar anúncios:', error);
            return [];
        }
        return data;
    },

    /**
     * Retorna um anúncio aleatório ativo do estabelecimento
     */
    async getRandomAd(establishmentId) {
        const ads = await this.getActiveAds(establishmentId);
        if (ads.length === 0) return null;
        return ads[Math.floor(Math.random() * ads.length)];
    },

    /**
     * Cria ou atualiza um anúncio (uso interno do painel do estabelecimento)
     */
    async upsertAd(adData) {
        const estab = await window.establishmentService.getMyEstablishment();
        if (!estab) throw new Error('Estabelecimento não encontrado.');

        const { data, error } = await window.supabaseClient
            .from('ads')
            .upsert({ ...adData, establishment_id: estab.id })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Remove um anúncio
     */
    async deleteAd(id) {
        const { error } = await window.supabaseClient
            .from('ads')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Exibe o modal de propaganda (chamado após confirmação de pedido)
     * @param {string} establishmentId
     * @param {Function} onClose - callback ao fechar
     */
    async showAdModal(establishmentId, onClose) {
        const ad = await this.getRandomAd(establishmentId);

        // Remover modal anterior se existir
        const existing = document.getElementById('ad-modal-overlay');
        if (existing) existing.remove();

        // Criar overlay
        const overlay = document.createElement('div');
        overlay.id = 'ad-modal-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.7);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; padding: 1rem;
            animation: fadeIn 0.3s ease;
        `;

        if (!ad) {
            // Sem anúncios: exibir apenas mensagem de sucesso
            overlay.innerHTML = `
                <div style="background: white; border-radius: 1.5rem; padding: 2rem; text-align: center; max-width: 380px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,0.3);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                    <h2 style="font-size: 1.5rem; font-weight: 800; color: #1a1a2e; margin-bottom: 0.5rem;">Pedido Confirmado!</h2>
                    <p style="color: #666; margin-bottom: 1.5rem;">Seu pedido foi recebido com sucesso. Aguarde!</p>
                    <button id="ad-close-btn" style="background: #6C63FF; color: white; border: none; border-radius: 0.75rem; padding: 0.75rem 2rem; font-size: 1rem; font-weight: 700; cursor: pointer; width: 100%;">Fechar</button>
                </div>
            `;
        } else {
            overlay.innerHTML = `
                <div style="background: white; border-radius: 1.5rem; overflow: hidden; max-width: 380px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,0.3); position: relative;">
                    <div style="background: linear-gradient(135deg, #6C63FF, #3ec6e0); padding: 1rem 1rem 0.5rem; text-align: center;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.65rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">✨ Anúncio Patrocinado</span>
                    </div>
                    ${ad.image_url ? `<img src="${ad.image_url}" style="width: 100%; height: 180px; object-fit: cover;" alt="${ad.title}" />` : ''}
                    <div style="padding: 1.5rem; text-align: center;">
                        <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎉</div>
                        <h3 style="font-size: 1.2rem; font-weight: 800; color: #1a1a2e; margin-bottom: 0.5rem;">${ad.title}</h3>
                        ${ad.description ? `<p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">${ad.description}</p>` : ''}
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            ${ad.cta_url ? `
                            <a href="${ad.cta_url}" target="_blank" style="flex: 1; background: #6C63FF; color: white; border: none; border-radius: 0.75rem; padding: 0.75rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center;">
                                ${ad.cta_text || 'Saiba mais'}
                            </a>` : ''}
                            <button id="ad-close-btn" style="flex: 1; background: #f0f0f0; color: #333; border: none; border-radius: 0.75rem; padding: 0.75rem; font-size: 0.9rem; font-weight: 600; cursor: pointer;">
                                Fechar
                            </button>
                        </div>
                    </div>
                    <div id="ad-timer-bar" style="height: 3px; background: #6C63FF; width: 100%; transition: width linear;"></div>
                </div>
            `;
        }

        document.body.appendChild(overlay);

        // Auto-fechar em 8 segundos com barra de progresso
        const DURATION = 8000;
        const timerBar = document.getElementById('ad-timer-bar');
        if (timerBar) {
            timerBar.style.transition = `width ${DURATION}ms linear`;
            setTimeout(() => { timerBar.style.width = '0%'; }, 50);
        }

        const autoClose = setTimeout(() => { overlay.remove(); if (onClose) onClose(); }, DURATION);

        const closeBtn = document.getElementById('ad-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(autoClose);
                overlay.remove();
                if (onClose) onClose();
            });
        }

        // Adicionar estilo de animação
        if (!document.getElementById('ad-modal-style')) {
            const style = document.createElement('style');
            style.id = 'ad-modal-style';
            style.textContent = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
            document.head.appendChild(style);
        }
    }
};

window.adService = adService;
