/**
 * AdService — Serviço de Propagandas
 * Propagandas são globais (establishment_id IS NULL), gerenciadas pelo admin.
 */
const adService = {

    /**
     * Busca propagandas globais ativas (gerenciadas pelo gestor do app)
     */
    async getActiveAds() {
        const { data, error } = await window.supabaseClient
            .from('ads')
            .select('*')
            .is('establishment_id', null)
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar anúncios:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Exibe modal de propaganda após pedido confirmado
     * Seleciona aleatoriamente dentre os anúncios globais ativos
     */
    async showPostOrderAd(onDismiss) {
        const ads = await this.getActiveAds();
        if (!ads || ads.length === 0) {
            if (onDismiss) onDismiss();
            return;
        }

        const ad = ads[Math.floor(Math.random() * ads.length)];
        const adDuration = 8000;

        const overlay = document.createElement('div');
        overlay.id = 'ad-modal-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            padding: 20px; animation: fadeIn 0.3s ease;
        `;

        const progressId = `ad-progress-${Date.now()}`;

        overlay.innerHTML = `
            <style>
                @keyframes fadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
                @keyframes shrink { from { width:100%; } to { width:0%; } }
                #${progressId} { animation: shrink ${adDuration}ms linear forwards; }
            </style>
            <div style="background:#1c1c1e; border-radius:24px; overflow:hidden; width:100%; max-width:400px; color:white; box-shadow:0 25px 60px rgba(0,0,0,0.5);">
                ${ad.image_url ? `<img src="${ad.image_url}" style="width:100%;height:200px;object-fit:cover;" onerror="this.style.display='none'" />` : ''}
                <div style="padding:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <span style="background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;">📢 PUBLICIDADE</span>
                        <span id="ad-countdown" style="font-size:12px;opacity:0.6;">Fechando em 8s</span>
                    </div>
                    <h3 style="font-size:20px;font-weight:800;margin-bottom:8px;">${ad.title}</h3>
                    ${ad.description ? `<p style="font-size:14px;opacity:0.75;margin-bottom:16px;line-height:1.5;">${ad.description}</p>` : ''}
                    <div style="display:flex;gap:10px;">
                        ${ad.cta_url ? `<a href="${ad.cta_url}" target="_blank" style="flex:1;background:#6C63FF;color:white;border:none;padding:14px;border-radius:14px;font-weight:700;font-size:15px;text-align:center;text-decoration:none;">${ad.cta_text || 'Saiba mais'}</a>` : ''}
                        <button id="ad-close-btn" style="background:rgba(255,255,255,0.1);color:white;border:none;padding:14px 18px;border-radius:14px;font-weight:600;cursor:pointer;font-size:15px;">✕</button>
                    </div>
                    <div style="margin-top:12px;height:3px;background:rgba(255,255,255,0.1);border-radius:10px;overflow:hidden;">
                        <div id="${progressId}" style="height:100%;background:#6C63FF;border-radius:10px;"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const dismiss = () => {
            overlay.remove();
            if (onDismiss) onDismiss();
        };

        document.getElementById('ad-close-btn').onclick = dismiss;

        // Countdown
        let remaining = adDuration / 1000;
        const countdown = document.getElementById('ad-countdown');
        const timer = setInterval(() => {
            remaining--;
            if (countdown) countdown.textContent = `Fechando em ${remaining}s`;
            if (remaining <= 0) { clearInterval(timer); dismiss(); }
        }, 1000);
    }
};

window.adService = adService;
