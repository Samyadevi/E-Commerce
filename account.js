document.addEventListener('DOMContentLoaded', () => {
    const likedProductsGrid = document.getElementById('liked-products-grid');
    const likedCountSpan = document.getElementById('liked-count');
    const emptyLikesMessage = document.getElementById('empty-likes-message');

    const cartItemsList = document.getElementById('cart-items-list');
    const cartCountDisplay = document.getElementById('cart-count-display');
    const cartTotalSpan = document.getElementById('cart-total');
    const cartSummaryDiv = document.getElementById('cart-summary');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const logoutBtn = document.getElementById('logout-btn');

    let allProducts = []; // To store all products fetched from API

    async function fetchProductsForAccount() {
        try {
            // Fetch all products (or a sufficiently large number) to match liked/cart IDs
            const response = await fetch('https://fakestoreapi.com/products');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            allProducts = data.map(item => ({
                id: item.id.toString(),
                name: item.title,
                category: item.category,
                price: item.price,
                rating: item.rating.rate,
                image: item.image,
                description: item.description
            }));
            renderAccountContent();
        } catch (error) {
            console.error("Could not fetch products for account page:", error);
            likedProductsGrid.innerHTML = '<p class="error-message">Failed to load liked products.</p>';
            cartItemsList.innerHTML = '<p class="error-message">Failed to load cart items.</p>';
        }
    }

    function renderAccountContent() {
        renderLikedProducts();
        renderCartItems();
    }

    function renderLikedProducts() {
        const likedProductIds = new Set(JSON.parse(localStorage.getItem('corpMartLikedProducts') || '[]'));
        const likedProducts = allProducts.filter(p => likedProductIds.has(p.id));

        likedProductsGrid.innerHTML = ''; // Clear previous content
        likedCountSpan.textContent = likedProducts.length;

        if (likedProducts.length === 0) {
            emptyLikesMessage.style.display = 'block';
        } else {
            emptyLikesMessage.style.display = 'none';
            likedProducts.forEach(product => {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');
                productCard.dataset.productId = product.id;

                const brandName = product.category.charAt(0).toUpperCase() + product.category.slice(1) + ' Co.';

                productCard.innerHTML = `
                    <div class="image-container">
                        <img src="${product.image}" alt="${product.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/150x150?text=Image+Not+Found';">
                        <div class="like-button liked" data-product-id="${product.id}"><i class="fas fa-heart"></i></div>
                    </div>
                    <div class="product-details">
                        <p class="brand-name">${brandName}</p>
                        <h4>${product.name}</h4>
                        <p class="price">$${product.price.toFixed(2)}</p>
                    </div>
                `;
                likedProductsGrid.appendChild(productCard);
            });

            // Add event listeners to like buttons on account page
            document.querySelectorAll('#liked-products-grid .like-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    const productId = event.currentTarget.dataset.productId;
                    toggleLike(productId); // This will update localStorage and re-render
                });
            });
        }
    }

    function renderCartItems() {
        let currentCartItems = JSON.parse(localStorage.getItem('corpMartCartItems') || '[]');
        cartItemsList.innerHTML = ''; // Clear previous content
        let totalCartPrice = 0;
        let totalCartItemsCount = 0;

        if (currentCartItems.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartSummaryDiv.style.display = 'none';
        } else {
            emptyCartMessage.style.display = 'none';
            currentCartItems.forEach(item => {
                const product = allProducts.find(p => p.id === item.productId);
                if (product) {
                    const cartItemDiv = document.createElement('div');
                    cartItemDiv.classList.add('cart-item');
                    cartItemDiv.dataset.productId = product.id;

                    cartItemDiv.innerHTML = `
                        <img src="${product.image}" alt="${product.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/80x80?text=Image+Not+Found';">
                        <div class="item-details">
                            <h4>${product.name}</h4>
                            <p>Price: $${product.price.toFixed(2)}</p>
                            <div class="quantity-controls">
                                <button class="quantity-btn remove-one-btn" data-product-id="${product.id}">-</button>
                                <span>Qty: ${item.quantity}</span>
                                <button class="quantity-btn add-one-btn" data-product-id="${product.id}">+</button>
                            </div>
                        </div>
                        <button class="remove-from-cart-btn" data-product-id="${product.id}"><i class="fas fa-trash"></i></button>
                    `;
                    cartItemsList.appendChild(cartItemDiv);

                    totalCartPrice += product.price * item.quantity;
                    totalCartItemsCount += item.quantity;
                }
            });
            cartSummaryDiv.style.display = 'block';
        }

        cartCountDisplay.textContent = totalCartItemsCount;
        cartTotalSpan.textContent = totalCartPrice.toFixed(2);

        // Add event listeners for cart item buttons
        document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const productId = event.currentTarget.dataset.productId;
                removeFromCart(productId);
            });
        });

        document.querySelectorAll('.add-one-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const productId = event.currentTarget.dataset.productId;
                addToCart(productId); // Reuse addToCart logic
            });
        });

        document.querySelectorAll('.remove-one-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const productId = event.currentTarget.dataset.productId;
                decrementCartItem(productId);
            });
        });

        // Event listener for Clear Cart button
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear your entire cart?')) {
                    clearCart();
                }
            });
        }
    }

    // Reuse toggleLike and addToCart functions from script.js logic for consistency
    // These functions directly modify localStorage and trigger re-renders on this page.
    function toggleLike(productId) {
        let likedProductIds = new Set(JSON.parse(localStorage.getItem('corpMartLikedProducts') || '[]'));
        if (likedProductIds.has(productId)) {
            likedProductIds.delete(productId);
        } else {
            likedProductIds.add(productId);
        }
        localStorage.setItem('corpMartLikedProducts', JSON.stringify(Array.from(likedProductIds)));
        renderLikedProducts(); // Re-render liked products section on this page
    }

    function addToCart(productId) {
        let currentCartItems = JSON.parse(localStorage.getItem('corpMartCartItems') || '[]');
        const existingCartItem = currentCartItems.find(item => item.productId === productId);

        if (existingCartItem) {
            existingCartItem.quantity += 1;
        } else {
            currentCartItems.push({ productId: productId, quantity: 1 });
        }
        localStorage.setItem('corpMartCartItems', JSON.stringify(currentCartItems));
        renderCartItems(); // Re-render cart items section on this page
    }

    function removeFromCart(productId) {
        let currentCartItems = JSON.parse(localStorage.getItem('corpMartCartItems') || '[]');
        currentCartItems = currentCartItems.filter(item => item.productId !== productId);
        localStorage.setItem('corpMartCartItems', JSON.stringify(currentCartItems));
        renderCartItems(); // Re-render cart items section on this page
    }

    function decrementCartItem(productId) {
        let currentCartItems = JSON.parse(localStorage.getItem('corpMartCartItems') || '[]');
        const existingCartItem = currentCartItems.find(item => item.productId === productId);

        if (existingCartItem) {
            existingCartItem.quantity -= 1;
            if (existingCartItem.quantity <= 0) {
                currentCartItems = currentCartItems.filter(item => item.productId !== productId);
            }
        }
        localStorage.setItem('corpMartCartItems', JSON.stringify(currentCartItems));
        renderCartItems(); // Re-render cart items section on this page
    }

    function clearCart() {
        localStorage.removeItem('corpMartCartItems');
        renderCartItems(); // Re-render cart items section on this page
        alert('Your cart has been cleared.');
    }

    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        // In a real app, you'd clear user session data on the server
        localStorage.removeItem('corpMartLikedProducts');
        localStorage.removeItem('corpMartCartItems');
        // Optionally, clear other user-specific data from localStorage
        alert('You have been logged out and your local data cleared.'); // Simple alert instead of toast
        window.location.href = 'index.html'; // Redirect to home page
    });

    // Initial fetch and render
    fetchProductsForAccount();
});
