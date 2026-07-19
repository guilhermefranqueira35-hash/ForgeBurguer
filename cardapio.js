// ==========================================
// 1. DECLARAÇÕES E VARIÁVEIS GLOBAIS (No topo!)
// ==========================================
let cart = [];
const whatsappNumber = "5511999999999"; 
let ultimoPedidoId = null; 

// Seleção de Elementos das Telas
const viewMenu = document.getElementById('view-menu');
const viewCart = document.getElementById('view-cart');

// Elementos da barra flutuante (Tela 1)
const cartFooter = document.getElementById('cart-footer');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');

// Elementos da Página da Sacola (Tela 2)
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const cartItemsList = document.getElementById('cart-items-list');
const cartPageTotalPrice = document.getElementById('cart-page-total-price');
const sendKitchenBtn = document.getElementById('send-kitchen-btn');
const cartObs = document.getElementById('cart-obs');
const ClientName = document.getElementById('client-name');

// 🌟 CORREÇÃO 1: Garante que o estado do botão comece correto ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    const pedidoSalvo = localStorage.getItem('ultimoPedidoId');
    const cancelBtn = document.getElementById('cancel-order-btn');
    
    if (pedidoSalvo && pedidoSalvo !== "null" && pedidoSalvo !== "undefined") {
        ultimoPedidoId = pedidoSalvo;
        if (cancelBtn) {
            cancelBtn.classList.remove('hidden');
            cancelBtn.style.display = 'block';
        }
    } else {
        if (cancelBtn) {
            cancelBtn.classList.add('hidden');
            cancelBtn.style.display = 'none'; // Força o sumiço direto no estilo inline
        }
    }
});

// ==========================================
// 2. EVENTOS DO CARRINHO & ADIÇÃO
// ==========================================
addToCartButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const name = event.target.getAttribute('data-name');
        const price = parseFloat(event.target.getAttribute('data-price'));
        addToCart(name, price);
    });
});

function addToCart(name, price) {
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name, price, quantity: 1 });
    }
    updateCartUI();
}

function updateCartUI() {
    if (cart.length === 0) {
        cartFooter.classList.add('hidden');
        return;
    }
    cartFooter.classList.remove('hidden');

    let totalItems = 0;
    let totalPrice = 0;

    cart.forEach(item => {
        totalItems += item.quantity;
        totalPrice += item.price * item.quantity;
    });

    cartCount.innerText = `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`;
    cartTotal.innerText = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
}

// ==========================================
// 3. NAVEGAÇÃO ENTRE TELAS (Menu <-> Sacola)
// ==========================================
checkoutBtn.addEventListener('click', () => {
    viewMenu.classList.add('hidden');    
    viewCart.classList.remove('hidden'); 
    viewCart.classList.add('animate-entrance');
    renderCartPage();                    
});

backToMenuBtn.addEventListener('click', () => {
    viewCart.classList.add('hidden');    
    viewCart.classList.remove('animate-entrance');
    viewMenu.classList.remove('hidden'); 
    updateCartUI();                      
});

// ==========================================
// 4. RENDERIZAÇÃO DA SACOLA (Layout Limpo com - Qtd +)
// ==========================================
function renderCartPage() {
    cartItemsList.innerHTML = ""; 
    let totalPrice = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;

        const itemRow = document.createElement('div');
        itemRow.classList.add('cart-item-row');
        
        itemRow.innerHTML = `
            <div class="item-details">
                <h4>${item.name}</h4>
                <span>Preço unitário: R$ ${item.price.toFixed(2).replace('.', ',')}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <button class="remove-one-btn" data-name="${item.name}">-</button>
                <span class="item-quantity-display">${item.quantity}</span>
                <button class="add-more-btn" data-name="${item.name}">+</button>
            </div>
        `;
        
        const removeOneBtn = itemRow.querySelector('.remove-one-btn');
        removeOneBtn.addEventListener('click', () => {
            removeFromCart(item.name);
        });

        const addMoreBtn = itemRow.querySelector('.add-more-btn');
        addMoreBtn.addEventListener('click', () => {
            addToCart(item.name, item.price);
            renderCartPage();
        });
        
        cartItemsList.appendChild(itemRow);
    });

    cartPageTotalPrice.innerText = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
}

// ==========================================
// 5. REMOVER ITENS DA SACOLA
// ==========================================
function removeFromCart(name) {
    const existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        existingItem.quantity -= 1;

        if (existingItem.quantity === 0) {
            cart = cart.filter(item => item.name !== name);
        }
    }
    
    renderCartPage();
    updateCartUI();
    
    if (cart.length === 0) {
        viewCart.classList.add('hidden');
        viewMenu.classList.remove('hidden');
    }
}

// ==========================================
// 6. 🔄 ENVIAR O PEDIDO PARA O PYTHON (FastAPI)
// ==========================================
sendKitchenBtn.addEventListener('click', async (event) => {
    event.preventDefault(); 
    
    if (ClientName.value.trim() === "") {
        alert("Por favor, digite seu nome antes de enviar o pedido! 📝");
        ClientName.focus();
        return; 
    }

    if (cart.length === 0) {
        alert("Sua sacola está vazia!");
        return;
    }

    const observation = cartObs.value.trim();

    const dadosPedido = {
        nome_cliente: ClientName.value.trim(), 
        itens: cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        observacao: cartObs.value.trim() ? cartObs.value.trim() : null
    };

    try {
        const response = await fetch('https://forgeburguer-2.onrender.com/enviar-pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPedido)
        });

        const resultado = await response.json();

        if (response.ok) {
            alert(`🔥 ${resultado.mensagem}`);
            
            ultimoPedidoId = resultado.pedido_id;
            localStorage.setItem('ultimoPedidoId', ultimoPedidoId);

            const cancelBtn = document.getElementById('cancel-order-btn');
            if (cancelBtn) {
                cancelBtn.classList.remove('hidden');
                cancelBtn.style.display = 'block'; 
            }

            cart = [];
            if (cartObs) cartObs.value = "";
            viewCart.classList.add('hidden');
            viewMenu.classList.remove('hidden');
            updateCartUI();
        } else {
            alert("Erro ao enviar o pedido para a cozinha.");
        }
    } catch (error) {
        console.error("Erro na conexão:", error);
        alert("Erro na conexão com o servidor.");
    }
});

// ==========================================
// 7. ❌ FUNÇÃO PARA CANCELAR O PEDIDO
// ==========================================
async function dispararCancelamento() {
    const idParaCancelar = ultimoPedidoId || localStorage.getItem('ultimoPedidoId');

    if (!idParaCancelar) {
        alert("Você não possui nenhum pedido ativo para cancelar no momento.");
        return;
    }

    if (!confirm(`Tem certeza que deseja cancelar o Pedido #${idParaCancelar}?`)) {
        return;
    }

    try {
        const response = await fetch(`https://forgeburguer-2.onrender.com/cancelar-pedido/${idParaCancelar}`, {
            method: 'POST'
        });

        const resultado = await response.json();

        if (response.ok) {
            alert(`❌ ${resultado.mensagem}`);
            
            ultimoPedidoId = null; 
            localStorage.removeItem('ultimoPedidoId');

            const cancelBtn = document.getElementById('cancel-order-btn');
            if (cancelBtn) {
                cancelBtn.classList.add('hidden');
                cancelBtn.style.display = 'none';
            }
        } else {
            alert(resultado.detail || "Erro ao cancelar o pedido.");
        }
    } catch (error) {
        alert("Não foi possível conectar ao servidor para efetuar o cancelamento.");
    }
}

// ==========================================
// 8. INTERSECTION OBSERVER (Animação de Rolagem)
// ==========================================
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show'); 
            observer.unobserve(entry.target); 
        }
    });
}, {
    threshold: 0.1 
});

const products = document.querySelectorAll('.product-card');
products.forEach(product => observer.observe(product));

// ==========================================
// 9. LÓGICA DE TROCA DE CATEGORIAS
// ==========================================
const categoryButtons = document.querySelectorAll('.category-btn');
const burgerSection = document.getElementById('burgers');
const bebidasSection = document.getElementById('bebidas');

categoryButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        event.preventDefault(); 

        categoryButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const targetSection = button.getAttribute('href');

        if (targetSection === '#burgers') {
            burgerSection.classList.remove('hidden');
            bebidasSection.classList.add('hidden');
        } else if (targetSection === '#bebidas') {
            bebidasSection.classList.remove('hidden');
            burgerSection.classList.add('hidden');
        }
    });
});

// ==========================================
// 10. VÍNCULO DO BOTÃO DE CLIQUE (No final!)
// ==========================================
// 🌟 CORREÇÃO 2: Faz o botão escutar o clique e executar o cancelamento!
const cancelBtnElement = document.getElementById('cancel-order-btn');
if (cancelBtnElement) {
    cancelBtnElement.addEventListener('click', dispararCancelamento);
}

// =================================================
// 11. Função que checa se o pedido já saiu da chapa
// =================================================
            async function monitorarStatusPedido() {
                // Pega o ID do último pedido salvo no navegador do cliente
                const pedidoId = ultimoPedidoId || localStorage.getItem('ultimoPedidoId');
                const cancelBtn = document.getElementById('cancel-order-btn');

                // Se não tiver pedido ativo ou se o botão não estiver na tela, não precisa checar
                if (!pedidoId || !cancelBtn || cancelBtn.style.display === 'none') {
                    return;
                }

                try {
                    const response = await fetch(`https://forgeburguer-2.onrender.com/status-pedido/${pedidoId}`);
                    if (response.ok) {
                        const dados = await response.json();

                        // 🌟 Se o status no banco já for 'entregue', esconde o botão!
                        if (dados.status === 'entregue' || dados.status === 'inexistente') {
                            cancelBtn.classList.add('hidden');
                            cancelBtn.style.display = 'none';
                            
                            // Limpa o ID do localStorage para o cliente poder fazer novos pedidos sem o botão antigo reaparecer
                            localStorage.removeItem('ultimoPedidoId');
                            ultimoPedidoId = null;
                            
                            alert("Seu pedido já foi entregue! Bom apetite! 🍔🍟");
                        }
                    }
                } catch (error) {
                    console.error("Erro ao checar status do pedido:", error);
                }
            }
            setInterval(monitorarStatusPedido, 5000);
