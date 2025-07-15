// 1. Get DOM elements
const productGrid = document.getElementById('product-grid');
const noProductsMessage = document.getElementById('no-products-message');
const displayedProductCount = document.getElementById('displayed-product-count');
const categoryFiltersDiv = document.getElementById('category-filters');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyPriceFilterBtn = document.getElementById('apply-price-filter');
const sortBySelect = document.getElementById('sort-by');
const resetFiltersBtn = document.getElementById('reset-filters');
const mainProductContent = document.querySelector('.product-content'); // For loading overlay

// Search Bar elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

// Header Navigation elements
const homeLink = document.querySelector('.header-nav a[data-nav="home"]');
const bestSellersLink = document.querySelector('.header-nav a[data-nav="best-sellers"]');

// Global variables to store products
let allFetchedProducts = []; // Stores the original, untouched data from the API
let currentFilteredProducts = []; // Products after category/price/search filters, but before sort
let currentDisplayedProducts = []; // Products after ALL filters, search, and sorting

// Local Storage for Likes and Cart (managed directly here, and read by account.js)
let likedProductIds = new Set(JSON.parse(localStorage.getItem('corpMartLikedProducts') || '[]'));
let cartItems = JSON.parse(localStorage.getItem('corpMartCartItems') || '[]');

// Variable for debouncing price input and search input
let inputTimeout;

// --- Core Functions ---

// Function to toggle like status and update localStorage
function toggleLike(productId) {
    if (likedProductIds.has(productId)) {
        likedProductIds.delete(productId);
    } else {
        likedProductIds.add(productId);
    }
    localStorage.setItem('corpMartLikedProducts', JSON.stringify(Array.from(likedProductIds)));
    updateLikeButtons(); // Call this to refresh heart icons on all visible cards
}

// Function to update the visual state of like buttons
function updateLikeButtons() {
    document.querySelectorAll('.like-button').forEach(button => {
        const productCard = button.closest('.product-card');
        if (productCard) {
            const productId = productCard.dataset.productId;
            if (likedProductIds.has(productId)) {
                button.classList.add('liked');
                button.innerHTML = '<i class="fas fa-heart"></i>'; // Solid heart
            } else {
                button.classList.remove('liked');
                button.innerHTML = '<i class="far fa-heart"></i>'; // Outline heart
            }
        }
    });
}

// Function to add product to cart
function addToCart(productId) {
    const product = allFetchedProducts.find(p => p.id === productId);
    if (!product) return;

    const existingCartItem = cartItems.find(item => item.productId === productId);

    if (existingCartItem) {
        existingCartItem.quantity += 1;
    } else {
        cartItems.push({ productId: productId, quantity: 1 });
    }

    localStorage.setItem('corpMartCartItems', JSON.stringify(cartItems));
    alert(`"${product.name}" added to your cart!`); // Simple alert instead of toast
}

// Function to render products onto the page
function renderProducts(productsToDisplay) {
    productGrid.innerHTML = ''; // Clear existing products from the grid
    displayedProductCount.textContent = productsToDisplay.length; // Update the product count display

    if (productsToDisplay.length === 0) {
        noProductsMessage.style.display = 'block'; // Show "No products found" message
    } else {
        noProductsMessage.style.display = 'none'; // Hide "No products found" message
        productsToDisplay.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');
            productCard.dataset.productId = product.id; // Store product ID for modal lookup

            const brandName = product.category.charAt(0).toUpperCase() + product.category.slice(1) + ' Co.';

            productCard.innerHTML = `
                <div class="image-container">
                    <img src="${product.image}" alt="${product.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/200x200?text=Image+Not+Found';">
                    <div class="like-button"><i class="far fa-heart"></i></div>
                </div>
                <div class="product-details">
                    <p class="brand-name">${brandName}</p>
                    <h4>${product.name}</h4>
                    <p class="category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</p>
                    <p class="rating">${product.rating.toFixed(1)} <i class="fas fa-star"></i></p>
                    <p class="price">$${product.price.toFixed(2)}</p>
                    <p class="product-size" style="display: none;">Sizes: S, M, L, XL</p>
                </div>
                <button class="add-to-cart-btn" data-product-id="${product.id}"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
            `;
            productGrid.appendChild(productCard);
        });

        // Add event listeners to newly created "Add to Cart" buttons
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const productId = event.currentTarget.dataset.productId;
                addToCart(productId);
            });
        });

        // Add event listeners and set initial state to "Like" buttons
        updateLikeButtons(); // Ensure all rendered like buttons reflect current likedProductIds
        document.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const productCard = button.closest('.product-card');
                if (productCard) {
                    const productId = productCard.dataset.productId;
                    toggleLike(productId);
                }
            });
        });
    }
}

// Function to get unique categories and populate checkboxes in the sidebar
function populateCategoryFilters() {
    if (allFetchedProducts.length === 0) {
        categoryFiltersDiv.innerHTML = '<p style="color: var(--text-medium);">No categories available.</p>';
        return;
    }
    const categories = [...new Set(allFetchedProducts.map(product => product.category))];
    categoryFiltersDiv.innerHTML = ''; // Clear existing filters
    categories.forEach(category => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${category}" checked> ${category.charAt(0).toUpperCase() + category.slice(1)}
        `;
        categoryFiltersDiv.appendChild(label);
    });
}

// Main function to apply all filters (category, price, search) and then sort
function applyFiltersAndSort() {
    mainProductContent.classList.add('loading');

    setTimeout(() => { // Small delay for loading indicator
        const selectedCategoryCheckboxes = Array.from(document.querySelectorAll('#category-filters input[type="checkbox"]:checked'));
        const selectedCategories = selectedCategoryCheckboxes.map(cb => cb.value);

        const minPrice = parseFloat(minPriceInput.value);
        const maxPrice = parseFloat(maxPriceInput.value);
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filteredProducts = allFetchedProducts.filter(product => {
            const passesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
            const passesPrice = (isNaN(minPrice) || product.price >= minPrice) && (isNaN(maxPrice) || product.price <= maxPrice);

            const passesSearch = searchTerm === '' ||
                                 product.name.toLowerCase().includes(searchTerm) ||
                                 product.category.toLowerCase().includes(searchTerm) ||
                                 (product.description && product.description.toLowerCase().includes(searchTerm));

            return passesCategory && passesPrice && passesSearch;
        });

        currentFilteredProducts = [...filteredProducts];

        // Apply sorting
        filteredProducts.sort((a, b) => {
            if (sortBySelect.value === 'price-asc') {
                return a.price - b.price;
            } else if (sortBySelect.value === 'price-desc') {
                return b.price - a.price;
            } else if (sortBySelect.value === 'rating-desc') {
                return b.rating - a.rating;
            } else if (sortBySelect.value === 'name-asc') {
                return a.name.localeCompare(b.name);
            }
            return 0;
        });

        currentDisplayedProducts = filteredProducts;
        renderProducts(currentDisplayedProducts);
        mainProductContent.classList.remove('loading');
    }, 100);
}

// Function to reset all filters and sorting options
function resetAllFilters() {
    document.querySelectorAll('#category-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });

    minPriceInput.value = '';
    maxPriceInput.value = '';
    searchInput.value = '';
    sortBySelect.value = 'default';

    applyFiltersAndSort();
}

// Function to fetch product data from Fake Store API
async function fetchProducts() {
    mainProductContent.classList.add('loading');
    productGrid.innerHTML = '<p style="text-align: center; font-size: 1.2rem; color: var(--text-light);">Loading products...</p>';
    noProductsMessage.style.display = 'none';
    displayedProductCount.textContent = '...';

    try {
        // Fetch up to 30 products
        const response = await fetch('https://fakestoreapi.com/products?limit=30'); 
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();

        allFetchedProducts = data.map(item => ({
            id: item.id.toString(),
            name: item.title,
            category: item.category,
            price: item.price,
            rating: item.rating.rate,
            image: item.image,
            description: item.description
        }));

        populateCategoryFilters();
        applyFiltersAndSort();

    } catch (error) {
        console.error("Could not fetch products:", error);
        productGrid.innerHTML = '<p style="text-align: center; font-size: 1.2rem; color: #D35400;">Failed to load products. Please check your internet connection or try again later.</p>';
        displayedProductCount.textContent = '0';
        noProductsMessage.style.display = 'none';
    } finally {
        mainProductContent.classList.remove('loading');
    }
}


// 7. Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts(); // Start fetching data when the page loads
});

// Filter/Sort actions trigger applyFiltersAndSort
categoryFiltersDiv.addEventListener('change', applyFiltersAndSort);

// Debounce for price inputs
minPriceInput.addEventListener('input', () => {
    clearTimeout(inputTimeout);
    inputTimeout = setTimeout(applyFiltersAndSort, 500);
});
maxPriceInput.addEventListener('input', () => {
    clearTimeout(inputTimeout);
    inputTimeout = setTimeout(applyFiltersAndSort, 500);
});

applyPriceFilterBtn.addEventListener('click', () => {
    clearTimeout(inputTimeout);
    applyFiltersAndSort();
});

sortBySelect.addEventListener('change', applyFiltersAndSort);
resetFiltersBtn.addEventListener('click', resetAllFilters);

// Search functionality
searchInput.addEventListener('input', () => {
    clearTimeout(inputTimeout);
    inputTimeout = setTimeout(applyFiltersAndSort, 300);
});
searchButton.addEventListener('click', () => {
    clearTimeout(inputTimeout);
    applyFiltersAndSort();
});

// Event Listeners for Header Navigation Links
if (homeLink) {
    homeLink.addEventListener('click', (e) => {
        // No e.preventDefault() here, let it navigate
        // resetAllFilters(); // Can remove this, as navigation will re-initialize
    });
}

if (bestSellersLink) {
    bestSellersLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetAllFilters();
        sortBySelect.value = 'rating-desc';
        applyFiltersAndSort();
    });
}
