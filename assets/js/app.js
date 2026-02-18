document.addEventListener('DOMContentLoaded', async () => {
    // Identificar a página atual
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    // Proteção de Rotas: Se não estiver em login.html, verificar Auth
    if (page !== 'login.html' && window.supabaseClient) {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
    } else if (page === 'login.html' && window.supabaseClient) {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            window.location.href = 'index.html';
            return;
        }
    }

    // Inicializar Dark Mode
    if (localStorage.getItem('apple-theme') === 'dark' ||
        (!localStorage.getItem('apple-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Verificar se as chaves foram preenchidas
    if (typeof SUPABASE_URL !== 'undefined' && (SUPABASE_URL === 'SUA_SUPABASE_URL_AQUI' || SUPABASE_ANON_KEY === 'SUA_SUPABASE_ANON_KEY_AQUI')) {
        console.warn('Supabase não configurado. Por favor, preencha as chaves em assets/js/supabaseConfig.js');
        showConfigAlert();
    }

    // Inicializar dados conforme a página
    window.initPage = () => {
        if (page === 'index.html') {
            initDashboard();
        } else if (page === 'products.html' && window.productService) {
            initProductsPage();
        } else if (page === 'customers.html' && window.customerService) {
            initCustomersPage();
        } else if (page === 'orders.html' && window.orderService) {
            initOrdersPage();
        } else if (page === 'order-details.html' && window.orderService) {
            initOrderDetailsPage();
        } else if (page === 'add-edit-product.html' && window.productService) {
            initAddEditProductPage();
        } else if (page === 'add-edit-customer.html' && window.customerService) {
            initAddEditCustomerPage();
        } else if (page === 'checkout.html' && window.orderService) {
            initCheckoutPage();
        }
    };

    // Chamada inicial
    window.initPage();

    // Toggle Theme
    window.toggleTheme = () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('apple-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('apple-theme', 'dark');
        }
    };

    // Global Delete Product handler
    window.deleteProduct = async (id) => {
        const service = window.productService;
        if (!service) {
            console.error('Serviço de produtos não carregado.');
            return;
        }
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                const success = await service.deleteProduct(id);
                if (success) {
                    // Recarregar conforme a página
                    if (typeof initProductsPage === 'function' && page === 'products.html') {
                        initProductsPage();
                    } else {
                        window.location.reload();
                    }
                }
            } catch (error) {
                console.error('Erro ao excluir:', error);
                alert('Erro ao excluir produto. Verifique se ele não possui pedidos vinculados ou itens no histórico.');
            }
        }
    };

    // Global Delete Order handler
    window.app_deleteOrder = async (id) => {
        if (!window.orderService) return;
        if (confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
            try {
                await window.orderService.deleteOrder(id);
                // Recarregar a página para atualizar as listas
                window.location.reload();
            } catch (error) {
                console.error('Erro ao excluir pedido:', error);
                alert('Erro ao excluir pedido. Pode haver itens vinculados ou erro de permissão.');
            }
        }
    };
});

/**
 * Lógica do Dashboard (Home)
 */
async function initDashboard() {
    const salesTodayEl = document.getElementById('sales-today');
    const openOrdersEl = document.getElementById('open-orders');
    const customersTodayEl = document.getElementById('customers-today');
    const recentOrdersContainer = document.querySelector('section:nth-of-type(3) .grid');
    const greetingNameEl = document.getElementById('user-greeting-name');

    try {
        // Obter usuário atual para saudação personalizada
        const user = await window.authService.getCurrentUser();
        if (user && greetingNameEl) {
            const name = user.user_metadata?.full_name || user.email.split('@')[0];
            greetingNameEl.textContent = `${name}!`;
        }
        // Carregar pedidos reais do Supabase
        const orders = await window.orderService.getOrders();

        // 1. Total de Vendas hoje
        const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
        if (salesTodayEl) salesTodayEl.textContent = `R$ ${totalSales.toFixed(2)}`;

        // 2. Pedidos Abertos (Status != 'Finalizado')
        const openOrders = orders.filter(o => o.status !== 'Finalizado').length;
        if (openOrdersEl) openOrdersEl.textContent = openOrders;

        // 3. Clientes Atendidos (IDs únicos de clientes nos pedidos)
        const uniqueCustomers = new Set(orders.map(o => o.customer_id).filter(id => !!id)).size;
        if (customersTodayEl) customersTodayEl.textContent = uniqueCustomers;

        // Atualizar Barra de Progresso (Meta: 35)
        const progressPercent = Math.min((uniqueCustomers / 35) * 100, 100);
        const progressBar = document.getElementById('customers-progress');
        if (progressBar) progressBar.style.width = `${progressPercent}%`;

        // 4. Pedidos Recentes e Avatares
        const pendingAvatars = document.querySelector('.flex.-space-x-2.mb-2');
        const pendingText = document.querySelector('.text-xs.text-gray-400');

        if (orders.length === 0) {
            if (pendingAvatars) pendingAvatars.innerHTML = '';
            if (pendingText) pendingText.textContent = 'Nenhum pedido pendente.';
            if (recentOrdersContainer) recentOrdersContainer.innerHTML = '<p class="text-center opacity-50 py-4">Sem pedidos recentes.</p>';
        } else {
            if (recentOrdersContainer) {
                recentOrdersContainer.innerHTML = orders.slice(0, 4).map(order => `
                    <div class="bg-card-light dark:bg-card-dark rounded-2xl p-4 flex items-center shadow-soft cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onclick="window.location.href='order-details.html?id=${order.id}'">
                        <div class="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-bold text-gray-500 mr-4">
                            #${order.id.substring(0, 2).toUpperCase()}
                        </div>
                        <div class="flex-1">
                            <h4 class="font-semibold text-text-primary-light dark:text-text-primary-dark">${order.customers?.name || 'Cliente'}</h4>
                            <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark truncate">${(order.items || []).map(i => i.name).join(', ')}</p>
                        </div>
                        <div class="flex flex-col items-end">
                            <span class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">R$ ${parseFloat(order.total).toFixed(2)}</span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 mt-1">
                                ${order.status}
                            </span>
                        </div>
                    </div>
                `).join('');
            }
        }

    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
    }
}

/**
 * Lógica da Página de Produtos
 */
async function initProductsPage() {
    const mainContainer = document.querySelector('main');
    const searchInput = document.getElementById('product-search');
    const filterButtons = document.querySelectorAll('.category-filter');
    if (!mainContainer) return;

    try {
        const allProducts = await window.productService.getProducts();
        let currentFilter = 'all';
        let searchQuery = '';

        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const cartFab = document.getElementById('cart-fab');
        const cartCount = document.getElementById('cart-count');

        let cart = JSON.parse(localStorage.getItem('cart') || '[]');

        const updateCartUI = () => {
            if (cartCount) cartCount.textContent = cart.reduce((acc, item) => acc + item.quantity, 0);
            if (mode === 'sale' && cartFab) {
                cartFab.classList.toggle('hidden', cart.length === 0);
            }
        };

        const addToCart = (product) => {
            const existing = cart.find(item => item.id === product.id);
            const currentQty = existing ? existing.quantity : 0;

            // Validação de estoque local
            if (currentQty + 1 > (product.stock || 0)) {
                alert(`Estoque esgotado para "${product.name}".`);
                return;
            }

            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ ...product, quantity: 1 });
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();

            // Feedback visual rápido
            const btn = document.querySelector(`[data-id="${product.id}"]`);
            if (btn) {
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<span class="material-icons-round text-success">check_circle</span>';
                setTimeout(() => { btn.innerHTML = originalContent; }, 1000);
            }
        };

        const render = () => {
            let filtered = allProducts;

            // Filtro por Categoria
            if (currentFilter !== 'all') {
                const categories = currentFilter.split(',');
                filtered = filtered.filter(p => categories.includes(p.category));
            }

            // Filtro por Busca
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(p =>
                    p.name.toLowerCase().includes(query) ||
                    (p.description && p.description.toLowerCase().includes(query))
                );
            }

            const categoriesInFiltered = [...new Set(filtered.map(p => p.category))];

            if (filtered.length === 0) {
                mainContainer.innerHTML = '<p class="text-center opacity-50 py-10">Nenhum produto encontrado.</p>';
                return;
            }

            let html = '';
            if (mode === 'sale') {
                html += `
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl mb-6 border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-blue-800 dark:text-blue-300">Modo de Venda</h3>
                            <p class="text-xs text-blue-600 dark:text-blue-400">Clique nos produtos para adicionar à sacola</p>
                        </div>
                        <button onclick="window.location.href='products.html'" class="text-xs font-bold text-blue-700 dark:text-blue-300 underline">Sair</button>
                    </div>
                `;
            }

            categoriesInFiltered.forEach(cat => {
                const catProducts = filtered.filter(p => p.category === cat);
                html += `<h2 class="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mt-6 mb-2">${cat}</h2>`;
                html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;

                catProducts.forEach(product => {
                    const clickAction = mode === 'sale'
                        ? `window.app_addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})`
                        : `window.location.href='add-edit-product.html?id=${product.id}'`;

                    html += `
                        <div class="bg-card-light dark:bg-card-dark rounded-2xl p-4 shadow-soft flex items-center space-x-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 group relative">
                            <div class="h-20 w-20 flex-shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative" onclick="${clickAction}">
                                <img alt="${product.name}" class="h-full w-full object-cover" src="${product.image_url || 'https://via.placeholder.com/80'}" />
                            </div>
                            <div class="flex-1 min-w-0 py-1">
                                <div class="flex justify-between items-start">
                                    <div class="cursor-pointer" onclick="${clickAction}">
                                        <span class="inline-block px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold tracking-wide uppercase mb-1">${product.category}</span>
                                        <h3 class="text-base font-semibold text-text-primary-light dark:text-text-primary-dark truncate">${product.name}</h3>
                                    </div>
                                    ${mode === 'sale' ? `
                                        <button data-id="${product.id}" onclick="${clickAction}" class="bg-primary/10 text-primary p-2 rounded-full hover:bg-primary hover:text-white transition-all">
                                            <span class="material-icons-round">add_shopping_cart</span>
                                        </button>
                                    ` : `
                                        <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button class="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark"
                                                    onclick="window.location.href='add-edit-product.html?id=${product.id}'">
                                                <span class="material-icons-round text-base">edit</span>
                                            </button>
                                            <button class="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                                                    onclick="window.deleteProduct('${product.id}')">
                                                <span class="material-icons-round text-base">delete</span>
                                            </button>
                                        </div>
                                    `}
                                </div>
                                <div class="mt-1 flex items-baseline justify-between">
                                    <div>
                                        <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark line-clamp-1">${product.description || ''}</p>
                                        <p class="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-tight mt-0.5">
                                            Estoque: <span class="font-bold text-xs">${product.stock || 0} un.</span>
                                        </p>
                                    </div>
                                    <span class="text-success font-semibold whitespace-nowrap ml-2">R$ ${parseFloat(product.price).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
            });
            mainContainer.innerHTML = html;
        };

        // Expor para o escopo global para o onclick
        window.app_addToCart = addToCart;

        updateCartUI();
        render();

        // Event Listeners para Filtros
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.getAttribute('data-category');

                // Atualizar Estilo Visual do Botão Ativo
                filterButtons.forEach(b => {
                    b.classList.remove('bg-text-primary-light', 'dark:bg-white', 'text-white', 'dark:text-black');
                    b.classList.add('bg-white', 'dark:bg-card-dark', 'text-text-primary-light', 'dark:text-text-primary-dark', 'border', 'border-gray-200', 'dark:border-gray-700');
                });
                btn.classList.add('bg-text-primary-light', 'dark:bg-white', 'text-white', 'dark:text-black');
                btn.classList.remove('bg-white', 'dark:bg-card-dark', 'text-text-primary-light', 'dark:text-text-primary-dark', 'border', 'border-gray-200', 'dark:border-gray-700');

                render();
            });
        });

        // Event Listener para Busca
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                render();
            });
        }

        // Renderização Inicial
        render();

    } catch (error) {
        console.error('Erro ao inicializar produtos:', error);
    }
}

/**
 * Lógica da Página de Clientes
 */
async function initCustomersPage() {
    const mainContainer = document.querySelector('main .grid');
    const searchInput = document.getElementById('customer-search');
    const filterButtons = document.querySelectorAll('.customer-filter');
    if (!mainContainer) return;

    try {
        const allCustomers = await window.customerService.getCustomers();
        let currentFilter = 'all';
        let searchQuery = '';

        const render = () => {
            let filtered = allCustomers;

            // Filtro por Status
            if (currentFilter !== 'all') {
                filtered = filtered.filter(c => c.status === currentFilter);
            }

            // Filtro por Busca (Nome ou Telefone)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(c =>
                    c.name.toLowerCase().includes(query) ||
                    (c.phone && c.phone.toLowerCase().includes(query))
                );
            }

            const customerCountEl = document.querySelector('.py-8.text-center p');
            if (customerCountEl) {
                customerCountEl.textContent = `Mostrando ${filtered.length} de ${allCustomers.length} clientes`;
            }

            if (filtered.length === 0) {
                mainContainer.innerHTML = '<p class="text-center opacity-50 py-10 col-span-full">Nenhum cliente encontrado.</p>';
                return;
            }

            mainContainer.innerHTML = filtered.map(customer => {
                const initials = customer.initials || customer.name.substring(0, 2).toUpperCase();
                const hasOrder = customer.status === 'Active';

                return `
                    <div class="group bg-surface-light dark:bg-surface-dark p-5 rounded-apple-2xl shadow-apple-card hover:shadow-apple-hover transition-all duration-300 cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-gray-700 relative overflow-hidden"
                         onclick="window.location.href='customer-details.html?id=${customer.id}'">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <div class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-primary flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0">
                                    ${initials}
                                </div>
                                <div>
                                    <h3 class="font-bold text-lg text-text-light dark:text-white group-hover:text-primary transition-colors">${customer.name}</h3>
                                    <div class="flex items-center space-x-2 mt-0.5">
                                        <span class="material-icons-round text-xs text-secondary-text-light">phone</span>
                                        <p class="text-secondary-text-light dark:text-secondary-text-dark text-sm">${customer.phone || 'Sem telefone'}</p>
                                    </div>
                                </div>
                            </div>
                            <span class="material-icons-round text-gray-300 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                        </div>
                        <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            ${hasOrder ? `
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                    <span class="w-1.5 h-1.5 rounded-full bg-accent-orange mr-1.5 animate-pulse"></span>
                                    Pedido aberto
                                </span>
                            ` : `<span class="text-xs text-gray-400 dark:text-gray-500">Sem pedidos ativos</span>`}
                            <span class="text-xs text-gray-400">${customer.status === 'New' ? 'Novo' : ''}</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        // Event Listeners para Filtros
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.getAttribute('data-status');

                // Estilo Visual dos Botões
                filterButtons.forEach(b => {
                    b.classList.remove('bg-text-light', 'dark:bg-white', 'text-white', 'dark:text-black');
                    b.classList.add('bg-surface-light', 'dark:bg-surface-dark', 'border', 'border-gray-200', 'dark:border-gray-700', 'text-secondary-text-light', 'dark:text-gray-300');
                });
                btn.classList.add('bg-text-light', 'dark:bg-white', 'text-white', 'dark:text-black');
                btn.classList.remove('bg-surface-light', 'dark:bg-surface-dark', 'border', 'border-gray-200', 'dark:border-gray-700', 'text-secondary-text-light', 'dark:text-gray-300');

                render();
            });
        });

        // Event Listener para Busca
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                render();
            });
        }

        render();
    } catch (error) {
        console.error('Erro ao inicializar clientes:', error);
    }
}

/**
 * Lógica da Página de Pedidos
 */
async function initOrdersPage() {
    const mainContainer = document.getElementById('orders-container');
    const searchInput = document.getElementById('order-search');
    const filterButtons = document.querySelectorAll('.order-filter');
    if (!mainContainer) return;

    try {
        const allOrders = await window.orderService.getOrders();
        let currentFilter = 'Aberto';
        let searchQuery = '';

        const render = () => {
            let filtered = allOrders;

            // Filtro por Status
            if (currentFilter !== 'all') {
                filtered = filtered.filter(o => o.status === currentFilter);
            }

            // Filtro por Busca (Nome do Cliente ou ID do Pedido)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(o =>
                    (o.customers?.name && o.customers.name.toLowerCase().includes(query)) ||
                    o.id.toLowerCase().includes(query)
                );
            }

            const headerHtml = `<h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark border-b border-gray-200 dark:border-gray-800 pb-2">
                ${currentFilter === 'all' ? 'Todos os Pedidos' : (currentFilter === 'Aberto' ? 'Pedidos Abertos' : 'Pedidos Fechados')}
            </h2>`;

            if (filtered.length === 0) {
                mainContainer.innerHTML = `
                    ${headerHtml}
                    <div class="py-20 text-center opacity-60">
                        <span class="material-icons-round text-5xl mb-2">inventory_2</span>
                        <p>Nenhum pedido encontrado.</p>
                    </div>
                `;
                return;
            }

            let ordersHtml = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">`;
            filtered.forEach(order => {
                const statusColor = order.status === 'Aberto' ? 'bg-accent-green' : (order.status === 'Fechado' ? 'bg-gray-400' : 'bg-accent-orange');
                const badgeColor = order.status === 'Aberto' ? 'bg-accent-green/10 text-accent-green' : (order.status === 'Fechado' ? 'bg-gray-100 text-gray-500' : 'bg-accent-orange/10 text-accent-orange');

                ordersHtml += `
                    <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-apple-card hover:shadow-lg transition-shadow duration-300 cursor-pointer border border-transparent dark:border-gray-800 group relative overflow-hidden"
                         onclick="window.location.href='order-details.html?id=${order.id}'">
                        <div class="absolute left-0 top-0 bottom-0 w-1.5 ${statusColor}"></div>
                        
                        <!-- Botão Excluir -->
                        <button onclick="event.stopPropagation(); window.app_deleteOrder('${order.id}')" 
                                class="absolute right-2 top-2 p-2 text-accent-red opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl z-20">
                            <span class="material-icons-round text-lg">delete_outline</span>
                        </button>

                        <div class="flex justify-between items-start mb-3 pl-2">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold">
                                    ${order.customers?.name?.substring(0, 2).toUpperCase() || '??'}
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold truncate">${order.customers?.name || 'Cliente Desconhecido'}</h3>
                                    <p class="text-xs opacity-60 font-medium">#PED-${order.id.substring(0, 4)} • ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeColor} uppercase tracking-wide">
                                ${order.status}
                            </span>
                        </div>
                        <div class="pl-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <span class="text-xs opacity-60">Valor Total</span>
                            <span class="text-lg font-bold">R$ ${parseFloat(order.total).toFixed(2)}</span>
                        </div>
                    </div>
                `;
            });
            ordersHtml += `</div>`;
            mainContainer.innerHTML = headerHtml + ordersHtml;
        };

        // Event Listeners para Filtros
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.getAttribute('data-status');

                // Atualizar Estilo Visual
                filterButtons.forEach(b => {
                    b.classList.remove('bg-white', 'dark:bg-surface-dark', 'shadow-sm', 'font-semibold', 'text-text-primary-light', 'dark:text-text-primary-dark');
                    b.classList.add('text-text-secondary-light', 'dark:text-text-secondary-dark', 'font-medium');
                });
                btn.classList.add('bg-white', 'dark:bg-surface-dark', 'shadow-sm', 'font-semibold', 'text-text-primary-light', 'dark:text-text-primary-dark');
                btn.classList.remove('text-text-secondary-light', 'dark:text-text-secondary-dark', 'font-medium');

                render();
            });
        });

        // Event Listener para Busca
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                render();
            });
        }

        render();
    } catch (error) {
        console.error('Erro ao inicializar pedidos:', error);
        mainContainer.innerHTML = `<p class="text-center text-red-500 py-10">Erro ao carregar pedidos: ${error.message}</p>`;
    }
}

/**
 * Lógica da Página de Detalhes do Pedido
 */
async function initOrderDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    const customerNameEl = document.getElementById('order-customer-name');
    const customerInitialsEl = document.getElementById('order-customer-initials');
    const statusBadge = document.getElementById('order-status-badge');
    const itemsContainer = document.getElementById('order-items-container');
    const totalEl = document.getElementById('order-total-value');
    const countEl = document.getElementById('order-items-count');
    const quickAddContainer = document.getElementById('quick-add-products');
    const closeOrderBtn = document.getElementById('close-order-btn');
    const cancelOrderBtn = document.getElementById('cancel-order-btn');
    const infoTextEl = document.getElementById('order-info-text');

    if (!orderId) {
        window.location.href = 'orders.html';
        return;
    }

    // 1. Carregar Dados do Pedido
    try {
        const order = await window.orderService.getOrderById(orderId);
        if (!order) {
            alert('Pedido não encontrado.');
            window.location.href = 'orders.html';
            return;
        }

        // Preencher cabeçalho
        const customerData = order.customers || order.customer;
        if (customerNameEl) customerNameEl.textContent = customerData?.name || 'Cliente';
        if (customerInitialsEl) customerInitialsEl.textContent = `PED #${order.id.split('-')[0].toUpperCase()}`;

        if (statusBadge) {
            statusBadge.textContent = order.status;
            statusBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'Aberto'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`;

            // Se já estiver fechado, desabilita botões de ação
            if (order.status === 'Fechado') {
                if (closeOrderBtn) closeOrderBtn.classList.add('hidden');
                if (cancelOrderBtn) cancelOrderBtn.classList.add('hidden');
            }
        }

        if (infoTextEl) infoTextEl.textContent = `Pedido criado em ${new Date(order.created_at).toLocaleString()}. Status atual: ${order.status}.`;

        // 2. Carregar Itens
        const items = await window.orderService.getOrderItems(orderId);
        renderOrderItems(items);

        // 3. Configurar Botão de Fechamento
        if (closeOrderBtn) {
            closeOrderBtn.onclick = () => {
                window.location.href = `checkout.html?orderId=${orderId}`;
            };
        }

    } catch (error) {
        console.error('Erro ao carregar detalhes do pedido:', error);
    }

    // 4. Carregar Sugestões de Produtos (Quick Add)
    if (!window.productService) return; // Segurança caso o serviço não carregue
    try {
        const products = await window.productService.getProducts();
        if (quickAddContainer && products.length > 0) {
            quickAddContainer.innerHTML = products.slice(0, 5).map(p => `
                <button onclick="window.app_quickAddItem('${orderId}', '${p.id}', ${p.price})"
                  class="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-apple active:scale-95 transition-transform duration-100 flex flex-col items-center justify-center text-center h-28 border border-transparent dark:border-gray-800">
                  <span class="text-2xl mb-2">${p.image_url && p.image_url.includes('http') ? `<img src="${p.image_url}" class="w-6 h-6 object-cover rounded-md">` : '📦'}</span>
                  <span class="text-xs font-medium leading-tight line-clamp-2">${p.name}</span>
                  <span class="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">R$ ${parseFloat(p.price).toFixed(2)}</span>
                </button>
            `).join('') + `
                <button onclick="window.location.href='products.html?mode=sale&orderId=${orderId}'"
                  class="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl shadow-none active:scale-95 transition-transform duration-100 flex flex-col items-center justify-center text-center h-28 border border-transparent dark:border-gray-700">
                  <span class="material-icons-round text-primary text-3xl mb-1">add</span>
                  <span class="text-xs font-medium text-primary">Mais</span>
                </button>
            `;
        }
    } catch (e) {
        console.error('Erro ao carregar sugestões:', e);
    }

    function renderOrderItems(items) {
        if (!itemsContainer) return;
        if (items.length === 0) {
            itemsContainer.innerHTML = '<p class="text-center py-10 opacity-50">Nenhum item adicionado.</p>';
            return;
        }

        itemsContainer.innerHTML = items.map(item => `
            <div class="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div class="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-bold text-lg mr-4">
                ${item.quantity}
              </div>
              <div class="flex-1">
                <h4 class="font-medium text-base">${item.product?.name || 'Produto'}</h4>
                <p class="text-xs text-text-secondary-light dark:text-text-secondary-dark">${item.product?.category || ''}</p>
              </div>
              <div class="text-right">
                <p class="font-semibold">R$ ${(item.quantity * item.unit_price).toFixed(2)}</p>
              </div>
            </div>
        `).join('');

        const total = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
        if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;
        if (countEl) countEl.textContent = `${items.length} item(s)`;
    }

    // Expor função de adicionar rápido com validação de estoque
    window.app_quickAddItem = async (oId, pId, price) => {
        try {
            // 1. Verificar estoque real no banco antes de adicionar
            const product = await window.productService.getProductById(pId);
            if (!product || (product.stock || 0) <= 0) {
                alert('Produto sem estoque disponível.');
                return;
            }

            const itemData = {
                order_id: oId,
                product_id: pId,
                quantity: 1,
                unit_price: price
            };

            // 2. Inserir item
            await window.supabaseClient.from('order_items').insert(itemData);

            // 3. Recarregar itens e renderizar
            const updated = await window.orderService.getOrderItems(oId);
            renderOrderItems(updated);
        } catch (e) {
            alert('Erro ao adicionar item.');
        }
    };
}

/**
 * Lógica da Página de Adição/Edição de Produto
 */
async function initAddEditProductPage() {
    const form = document.querySelector('form');
    const saveBtn = document.getElementById('save-product-btn');
    if (!form || !saveBtn) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    // Se tiver ID, carregar dados para edição
    if (productId) {
        try {
            const product = await window.productService.getProductById(productId);
            if (product) {
                document.getElementById('product-name').value = product.name;
                document.getElementById('price').value = parseFloat(product.price).toFixed(2).replace('.', ',');
                document.getElementById('category').value = product.category;
                document.getElementById('description').value = product.description || '';
                document.getElementById('stock-status').checked = product.available;
                document.getElementById('current-stock').value = product.stock || 0;
                document.querySelector('h2').textContent = 'Editar Produto';
            }
        } catch (error) {
            console.error('Erro ao carregar produto:', error);
        }
    }

    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';

        const name = document.getElementById('product-name').value;
        const priceStr = document.getElementById('price').value.replace(',', '.');
        const price = parseFloat(priceStr);
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        const available = document.getElementById('stock-status').checked;

        // Lógica de Estoque: Soma o que já tem com a nova entrada
        const currentStock = parseInt(document.getElementById('current-stock').value) || 0;
        const incomingStock = parseInt(document.getElementById('incoming-stock').value) || 0;
        const totalStock = currentStock + incomingStock;

        if (!name || isNaN(price) || !category) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salvar Produto';
            return;
        }

        const productData = {
            name,
            price,
            category,
            description,
            available,
            stock: totalStock
        };

        if (productId) productData.id = productId;

        try {
            await window.productService.upsertProduct(productData);
            window.location.href = 'products.html';
        } catch (error) {
            alert(`Erro ao salvar produto: ${error.message || 'Erro desconhecido'}`);
            console.error(error);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salvar Produto';
        }
    });
}

/**
 * Alerta de Configuração
 */
function showConfigAlert() {
    const alert = document.createElement('div');
    alert.id = 'config-alert';
    alert.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-orange-500 text-white px-6 py-3 rounded-full shadow-2xl font-medium flex items-center gap-2 animate-bounce';
    alert.innerHTML = `
        <span class="material-icons-round">warning</span>
        Supabase não configurado. Verifique os logs.
    `;
    document.body.appendChild(alert);
}

/**
 * Lógica da Página de Adição/Edição de Cliente
 */
async function initAddEditCustomerPage() {
    const form = document.getElementById('customer-form');
    const saveBtn = document.getElementById('save-customer-btn');
    const nameInput = document.getElementById('customer-name');
    const avatar = document.getElementById('customer-avatar');

    if (!form || !saveBtn) return;

    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('id');

    // Atualizar Avatar em tempo real
    if (nameInput && avatar) {
        nameInput.addEventListener('input', (e) => {
            const val = e.target.value;
            avatar.textContent = val ? val.substring(0, 2).toUpperCase() : '--';
        });
    }

    // Se tiver ID, carregar dados para edição
    if (customerId) {
        try {
            const customer = await window.customerService.getCustomerById(customerId);
            if (customer) {
                document.getElementById('customer-name').value = customer.name;
                document.getElementById('customer-phone').value = customer.phone || '';
                document.getElementById('customer-status').value = customer.status;
                if (avatar) avatar.textContent = customer.initials || customer.name.substring(0, 2).toUpperCase();

                const header = document.querySelector('h2');
                if (header) header.textContent = 'Editar Cliente';
            }
        } catch (error) {
            console.error('Erro ao carregar cliente:', error);
        }
    }

    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';

        const name = document.getElementById('customer-name').value;
        const phone = document.getElementById('customer-phone').value;
        const status = document.getElementById('customer-status').value;

        if (!name) {
            alert('Por favor, preencha o nome do cliente.');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salvar Cliente';
            return;
        }

        const customerData = {
            name,
            phone,
            status,
            initials: name.substring(0, 2).toUpperCase()
        };

        if (customerId) customerData.id = customerId;

        try {
            await window.customerService.upsertCustomer(customerData);
            window.location.href = 'customers.html';
        } catch (error) {
            alert(`Erro ao salvar cliente: ${error.message || 'Erro desconhecido'}`);
            console.error(error);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salvar Cliente';
        }
    });
}
/**
 * Lógica da Página de Checkout
 */
async function initCheckoutPage() {
    const itemsList = document.getElementById('checkout-items-list');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');
    const dateEl = document.getElementById('checkout-date');
    const idEl = document.getElementById('checkout-id');
    const confirmBtn = document.getElementById('confirm-order-btn');
    const selectCustomerBtn = document.getElementById('select-customer-btn');
    const customerModal = document.getElementById('customer-picker-modal');
    const customersListEl = document.getElementById('customers-list');
    const customerSearchInput = document.getElementById('customer-search-input');
    const customerNameEl = document.getElementById('checkout-customer-name');
    const customerAvatarEl = document.getElementById('customer-avatar');
    const customerIdInput = document.getElementById('selected-customer-id');

    if (!itemsList) return;

    let cart = [];
    let isClosingOrder = false;
    const urlParams = new URLSearchParams(window.location.search);
    const existingOrderId = urlParams.get('orderId');

    // 1. Carregar Dados do Checkout
    try {
        if (existingOrderId) {
            isClosingOrder = true;
            const order = await window.orderService.getOrderById(existingOrderId);
            const items = await window.orderService.getOrderItems(existingOrderId);

            if (idEl) idEl.textContent = order.id.split('-')[0].toUpperCase();
            if (customerNameEl) customerNameEl.textContent = order.customer?.name || 'Cliente';
            if (customerIdInput) customerIdInput.value = order.customer_id;
            if (customerAvatarEl) customerAvatarEl.textContent = order.customer?.name.substring(0, 2).toUpperCase();
            if (selectCustomerBtn) selectCustomerBtn.classList.add('hidden'); // Não muda cliente no fechamento

            cart = items.map(item => ({
                id: item.product_id,
                name: item.product?.name,
                price: item.unit_price,
                quantity: item.quantity,
                image_url: item.product?.image_url
            }));
        } else {
            cart = JSON.parse(localStorage.getItem('cart') || '[]');
        }
    } catch (e) {
        console.error('Erro ao preparar checkout:', e);
    }

    let allCustomers = [];

    // 1. Preencher Detalhes Básicos
    if (dateEl) dateEl.textContent = new Date().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    if (idEl) idEl.textContent = Math.random().toString(36).substring(2, 7).toUpperCase();

    // 2. Renderizar Itens
    const renderCart = () => {
        if (cart.length === 0) {
            itemsList.innerHTML = '<p class="text-center py-10 opacity-50">Carrinho vazio</p>';
            return;
        }

        itemsList.innerHTML = cart.map(item => `
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    <img src="${item.image_url || 'https://via.placeholder.com/48'}" class="w-full h-full object-cover rounded-xl" />
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start">
                        <h4 class="font-medium text-text-light dark:text-text-dark">${item.name}</h4>
                        <span class="font-semibold">R$ ${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <p class="text-xs text-secondary-text-light dark:text-secondary-text-dark mt-1">${item.quantity}x • R$ ${parseFloat(item.price).toFixed(2)} un.</p>
                </div>
            </div>
        `).join('');

        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        if (subtotalEl) subtotalEl.textContent = `R$ ${total.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;
    };

    // 3. Gerenciar Seleção de Cliente
    const openCustomerPicker = async () => {
        if (customerModal) customerModal.classList.remove('hidden');
        if (allCustomers.length === 0) {
            try {
                allCustomers = await window.customerService.getCustomers();
                renderCustomers(allCustomers);
            } catch (error) {
                console.error('Erro ao buscar clientes:', error);
            }
        }
    };

    const renderCustomers = (list) => {
        if (!customersListEl) return;
        if (list.length === 0) {
            customersListEl.innerHTML = '<p class="text-center py-4 text-sm opacity-50">Nenhum cliente encontrado</p>';
            return;
        }

        customersListEl.innerHTML = list.map(c => `
            <div class="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-colors" onclick="window.app_selectCustomer('${c.id}', '${c.name.replace(/'/g, "\\'")}', '${c.phone || ''}')">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    ${c.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <p class="font-semibold text-sm">${c.name}</p>
                    <p class="text-xs opacity-60">${c.phone || 'Sem telefone'}</p>
                </div>
            </div>
        `).join('');
    };

    const whatsappBtn = document.getElementById('whatsapp-btn');

    window.app_selectCustomer = (id, name, phone) => {
        if (customerIdInput) customerIdInput.value = id;
        if (customerNameEl) customerNameEl.textContent = name;
        if (customerAvatarEl) customerAvatarEl.textContent = name.substring(0, 2).toUpperCase();
        if (customerModal) customerModal.classList.add('hidden');
        // Armazenar telefone para o WhatsApp
        if (whatsappBtn) whatsappBtn.dataset.phone = phone || '';
    };

    if (selectCustomerBtn) selectCustomerBtn.addEventListener('click', openCustomerPicker);

    if (customerSearchInput) {
        customerSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allCustomers.filter(c => c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query)));
            renderCustomers(filtered);
        });
    }

    // 4. Finalizar Pedido
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const customerId = customerIdInput.value;
            if (!customerId) {
                alert('Por favor, selecione um cliente.');
                openCustomerPicker();
                return;
            }

            if (cart.length === 0) {
                alert('O carrinho está vazio.');
                window.location.href = 'products.html?mode=sale';
                return;
            }

            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Verificando estoque...';

            try {
                // --- VALIDAÇÃO FINAL DE ESTOQUE ---
                for (const item of cart) {
                    const product = await window.productService.getProductById(item.id);
                    const available = product ? (product.stock || 0) : 0;
                    if (available < item.quantity) {
                        alert(`Estoque insuficiente para "${item.name}". Disponível: ${available}. Por favor, ajuste seu pedido.`);
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = 'Confirmar Fechamento';
                        return;
                    }
                }

                confirmBtn.textContent = 'Processando...';
                const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'pix';

                if (isClosingOrder) {
                    // Atualizar pedido existente para Fechado
                    await window.supabaseClient
                        .from('orders')
                        .update({
                            status: 'Fechado',
                            total: total,
                            payment_method: paymentMethod
                        })
                        .eq('id', existingOrderId);
                } else {
                    // Criar novo pedido
                    const orderData = {
                        customer_id: customerId,
                        total: total,
                        status: 'Fechado', // Já fecha direto se for venda rápida
                        payment_method: paymentMethod
                    };
                    await window.orderService.createOrderWithItems(orderData, cart);
                }

                // --- BAIXA DE ESTOQUE ---
                for (const item of cart) {
                    try {
                        await window.productService.decrementStock(item.id, item.quantity);
                    } catch (e) {
                        console.error(`Erro ao baixar estoque do produto ${item.id}:`, e);
                    }
                }

                // Limpar Carrinho e Redirecionar
                if (!isClosingOrder) localStorage.removeItem('cart');
                window.location.href = 'orders.html';
            } catch (error) {
                alert(`Erro ao finalizar pedido: ${error.message}`);
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirmar Fechamento';
            }
        });
    }

    // 5. Configurar Botão WhatsApp
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            const customerName = customerNameEl.textContent;
            const phone = whatsappBtn.dataset.phone;
            const orderId = idEl.textContent;
            const total = totalEl.textContent;

            if (!customerName || customerName === 'Selecionar Cliente') {
                alert('Por favor, selecione um cliente primeiro.');
                return;
            }

            const paymentMethodEl = document.querySelector('input[name="payment"]:checked');
            const paymentName = paymentMethodEl ? paymentMethodEl.parentElement.querySelector('span:last-child').textContent : 'Pix';

            let itensStr = cart.map(item => `- ${item.name} (${item.quantity}x)`).join('\n');
            const message = `Olá ${customerName}! Segue o recibo do seu pedido #${orderId} no AmbulanteTec:\n\n*Itens:*\n${itensStr}\n\n*Forma de Pagamento:* ${paymentName}\n*Total:* ${total}\n\nObrigado pela preferência!`;

            const encodedMsg = encodeURIComponent(message);
            const waUrl = phone
                ? `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodedMsg}`
                : `https://wa.me/?text=${encodedMsg}`;

            window.open(waUrl, '_blank');
        });
    }

    renderCart();
}
