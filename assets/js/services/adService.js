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

        // Normalizar URL de imagem (converte Google Drive share para imagem direta)
        const normalizeImageUrl = (url) => {
            if (!url) return null;
            const driveMatch = url.match(/\/d\/([\w-]+)/);
            if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
            return url;
        };
        const normalizeCta = (url) => {
            if (!url) return null;
            return url.match(/^https?:\/\//) ? url : 'https://' + url;
        };

        const imageUrl = normalizeImageUrl(ad.image_url);
        const ctaUrl = normalizeCta(ad.cta_url);

        overlay.innerHTML = `
            <style>
                @keyframes fadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
                @keyframes shrink { from { width:100%; } to { width:0%; } }
                @keyframes shine { 0% { left:-100%; } 20% { left:100%; } 100% { left:100%; } }
                #${progressId} { animation: shrink ${adDuration}ms linear forwards; }
                .ad-cta-btn { position: relative; overflow: hidden; }
                .ad-cta-btn::after {
                    content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
                    background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent);
                    transform: skewX(-20deg); animation: shine 3s infinite;
                }
            </style>
            <div style="background:#1c1c1e; border-radius:28px; border: 1px solid rgba(255,255,255,0.1); overflow:hidden; width:90vw; max-width:500px; color:white; box-shadow:0 30px 60px rgba(0,0,0,0.6);">
                ${imageUrl
                ? (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(imageUrl)
                    ? `<video id="ad-video-element" src="${imageUrl}" style="width:100%;height:320px;object-fit:cover;display:block;" autoplay muted loop playsinline></video>`
                    : `<img src="${imageUrl}" style="width:100%;height:320px;object-fit:cover;display:block;" onerror="this.style.display='none'" />`)
                : `<div style="width:100%;height:140px;background:linear-gradient(135deg,#6C63FF,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:48px;">📢</div>`
            }
                <div style="padding:28px 24px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <span style="background:rgba(255,255,255,0.15);padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;color:#fff;">📢 PUBLICIDADE</span>
                        <span id="ad-countdown" style="font-size:13px;opacity:0.6;font-weight:500;">Fechando em ${adDuration / 1000}s</span>
                    </div>
                    <h3 style="font-size:24px;font-weight:900;margin-bottom:12px;line-height:1.2;">${ad.title}</h3>
                    ${ad.description ? `<p style="font-size:15px;opacity:0.8;margin-bottom:24px;line-height:1.6;">${ad.description}</p>` : ''}
                    <div style="display:flex;gap:12px;">
                        ${ctaUrl ? `<a href="${ctaUrl}" target="_blank" rel="noopener" class="ad-cta-btn" style="flex:1;background:linear-gradient(135deg,#6C63FF,#8b5cf6);color:white;border:none;padding:16px;border-radius:18px;font-weight:800;font-size:16px;text-align:center;text-decoration:none;display:flex;justify-content:center;align-items:center;gap:8px;">${ad.cta_text || 'Saiba mais'}</a>` : ''}
                        <button id="ad-close-btn" style="background:rgba(255,255,255,0.08);color:white;border:1px solid rgba(255,255,255,0.1);padding:16px 20px;border-radius:18px;font-weight:700;cursor:pointer;font-size:16px;">✕</button>
                    </div>
                </div>
                <div style="height:4px;background:rgba(255,255,255,0.05);width:100%;">
                    <div id="${progressId}" style="height:100%;background:#6C63FF;box-shadow: 0 0 10px #6C63FF;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Forçar play no vídeo caso o autoplay tenha falhado
        const videoEl = document.getElementById('ad-video-element');
        if (videoEl) {
            videoEl.play().catch(e => console.warn('Ad video play blocked:', e));
        }

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
