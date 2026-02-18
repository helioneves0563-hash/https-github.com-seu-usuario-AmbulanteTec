// assets/js/components.js
document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.querySelector('nav');
    if (navContainer) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        navContainer.innerHTML = `
            <div class="flex justify-around items-center h-16 max-w-3xl mx-auto">
                <a class="flex flex-col items-center justify-center w-12 ${currentPage === 'index.html' ? 'text-primary' : 'text-secondary-text-light dark:text-secondary-text-dark'}" href="index.html">
                    <span class="material-icons-round text-2xl mb-1">home</span>
                    <span class="text-[10px] font-medium">Início</span>
                </a>
                <a class="flex flex-col items-center justify-center w-12 ${currentPage === 'products.html' || currentPage === 'product-list.html' ? 'text-primary' : 'text-secondary-text-light dark:text-secondary-text-dark'}" href="products.html">
                    <span class="material-icons-round text-2xl mb-1">lunch_dining</span>
                    <span class="text-[10px] font-medium">Produtos</span>
                </a>
                <div class="relative -top-6">
                    <button class="bg-primary text-white h-14 w-14 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transform hover:scale-105 transition-transform" 
                            onclick="window.location.href='${currentPage === 'orders.html' ? 'products.html?mode=sale' : 'add-edit-product.html'}'">
                        <span class="material-icons-round text-3xl">add</span>
                    </button>
                </div>
                <a class="flex flex-col items-center justify-center w-12 ${currentPage === 'customers.html' || currentPage === 'customer-directory.html' ? 'text-primary' : 'text-secondary-text-light dark:text-secondary-text-dark'}" href="customers.html">
                    <span class="material-icons-round text-2xl mb-1">people</span>
                    <span class="text-[10px] font-medium">Clientes</span>
                </a>
                <a class="flex flex-col items-center justify-center w-12 ${currentPage === 'orders.html' || currentPage === 'order-history.html' ? 'text-primary' : 'text-secondary-text-light dark:text-secondary-text-dark'}" href="orders.html">
                    <span class="material-icons-round text-2xl mb-1">receipt_long</span>
                    <span class="text-[10px] font-medium">Pedidos</span>
                </a>
                <button class="flex flex-col items-center justify-center w-12 text-secondary-text-light dark:text-secondary-text-dark hover:text-red-500 transition-colors" onclick="window.authService.signOut()">
                    <span class="material-icons-round text-2xl mb-1">logout</span>
                    <span class="text-[10px] font-medium">Sair</span>
                </a>
            </div>
            <div class="h-4 w-full"></div>
        `;
    }
});
