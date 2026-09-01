(function () {
    "use strict";

    const WHATSAPP_NUMBER = "9663401610";
    const CART_KEY = "zaman-tea-cart-v1";
    const PRICES = { "75": 99, "150": 179, "300": 399 };
    const PRODUCTS = {
        ginger: {
            name: "Rich Ginger Tea",
            image: "img/zaman/ginger-label.jpeg"
        },
        cardamom: {
            name: "Rich Cardamom Tea",
            image: "img/zaman/cardamom-label.jpeg"
        },
        darjeeling: {
            name: "Classic Darjeeling Tea",
            image: "img/zaman/darjeeling-label.jpeg"
        }
    };

    let memoryCart = [];
    let toastTimer;

    function readCart() {
        try {
            const stored = localStorage.getItem(CART_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return memoryCart;
        }
    }

    function saveCart(cart) {
        memoryCart = cart;
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
        } catch (error) {
            // The in-memory cart keeps the store usable in restricted browsers.
        }
    }

    function money(value) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(value);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function cartTotal(cart) {
        return cart.reduce((total, item) => total + item.price * item.qty, 0);
    }

    function cartQuantity(cart) {
        return cart.reduce((total, item) => total + item.qty, 0);
    }

    function showToast(message) {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add("show");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
    }

    function openCart() {
        document.body.classList.remove("menu-open");
        document.body.classList.add("cart-open");
        const drawer = document.getElementById("cartDrawer");
        if (drawer) drawer.setAttribute("aria-hidden", "false");
    }

    function closeCart() {
        document.body.classList.remove("cart-open");
        const drawer = document.getElementById("cartDrawer");
        if (drawer) drawer.setAttribute("aria-hidden", "true");
    }

    function addItem(productId, size, quantity) {
        const product = PRODUCTS[productId];
        if (!product || !PRICES[size]) return;

        const cart = readCart();
        const itemId = `${productId}-${size}`;
        const existing = cart.find((item) => item.id === itemId);

        if (existing) {
            existing.qty += quantity;
        } else {
            cart.push({
                id: itemId,
                productId,
                name: product.name,
                image: product.image,
                size: `${size}g`,
                price: PRICES[size],
                qty: quantity
            });
        }

        saveCart(cart);
        renderCart();
    }

    function changeQuantity(itemId, delta) {
        const cart = readCart();
        const item = cart.find((entry) => entry.id === itemId);
        if (!item) return;
        item.qty += delta;
        const nextCart = cart.filter((entry) => entry.qty > 0);
        saveCart(nextCart);
        renderCart();
        renderCheckout();
    }

    function removeItem(itemId) {
        const nextCart = readCart().filter((entry) => entry.id !== itemId);
        saveCart(nextCart);
        renderCart();
        renderCheckout();
        showToast("Item removed");
    }

    function renderCart() {
        const cart = readCart();
        const count = cartQuantity(cart);
        document.querySelectorAll("[data-cart-count]").forEach((node) => {
            node.textContent = count;
        });

        const cartItems = document.getElementById("cartItems");
        const subtotal = document.getElementById("cartSubtotal");
        const checkoutLink = document.getElementById("checkoutLink");
        if (subtotal) subtotal.textContent = money(cartTotal(cart));
        if (checkoutLink) {
            checkoutLink.setAttribute("aria-disabled", cart.length ? "false" : "true");
            checkoutLink.style.pointerEvents = cart.length ? "auto" : "none";
            checkoutLink.style.opacity = cart.length ? "1" : ".5";
        }
        if (!cartItems) return;

        if (!cart.length) {
            cartItems.innerHTML = `
                <div class="empty-state">
                    <h3>Your cart is waiting</h3>
                    <p>Choose a flavour and size to begin your tea ritual.</p>
                    <a class="button button-dark" href="menu.html">Explore teas</a>
                </div>`;
            return;
        }

        cartItems.innerHTML = cart.map((item) => `
            <article class="cart-item">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
                <div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${escapeHtml(item.size)} · ${money(item.price)}</p>
                    <div class="quantity-controls" aria-label="Quantity for ${escapeHtml(item.name)}">
                        <button type="button" data-quantity="-1" data-item-id="${escapeHtml(item.id)}" aria-label="Decrease quantity">−</button>
                        <span>${item.qty}</span>
                        <button type="button" data-quantity="1" data-item-id="${escapeHtml(item.id)}" aria-label="Increase quantity">+</button>
                    </div>
                </div>
                <div class="cart-item-end">
                    <strong>${money(item.price * item.qty)}</strong>
                    <button class="remove-item" type="button" data-remove-item="${escapeHtml(item.id)}">Remove</button>
                </div>
            </article>`).join("");
    }

    function renderCheckout() {
        const list = document.getElementById("checkoutItems");
        const total = document.getElementById("checkoutTotal");
        const submit = document.getElementById("placeOrderButton");
        if (!list || !total) return;

        const cart = readCart();
        total.textContent = money(cartTotal(cart));
        if (submit) submit.disabled = !cart.length;

        if (!cart.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <h3>Your cart is empty</h3>
                    <p>Add a tea before continuing to checkout.</p>
                    <a class="button button-dark" href="menu.html">Shop tea</a>
                </div>`;
            return;
        }

        list.innerHTML = cart.map((item) => `
            <article class="checkout-item">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
                <div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${escapeHtml(item.size)} × ${item.qty}</p>
                </div>
                <span class="checkout-price">${money(item.price * item.qty)}</span>
            </article>`).join("");
    }

    function setupProductCards() {
        document.querySelectorAll(".product-card").forEach((card) => {
            const select = card.querySelector(".product-size");
            const price = card.querySelector(".product-price");
            if (select && price) {
                select.addEventListener("change", () => {
                    price.textContent = money(PRICES[select.value]);
                });
            }
        });

        document.querySelectorAll(".add-to-cart").forEach((button) => {
            button.addEventListener("click", () => {
                const card = button.closest(".product-card");
                const select = card && card.querySelector(".product-size");
                if (!card || !select) return;
                addItem(card.dataset.flavour, select.value, 1);
                button.classList.add("added");
                const original = button.textContent;
                button.textContent = "Added ✓";
                showToast(`${PRODUCTS[card.dataset.flavour].name} added`);
                window.setTimeout(() => {
                    button.classList.remove("added");
                    button.textContent = original;
                }, 1300);
            });
        });

        document.querySelectorAll("[data-add-bundle]").forEach((button) => {
            button.addEventListener("click", () => {
                Object.keys(PRODUCTS).forEach((productId) => addItem(productId, "150", 1));
                showToast("150g tasting set added to cart");
                openCart();
            });
        });
    }

    function setupCart() {
        document.querySelectorAll("[data-open-cart]").forEach((button) => {
            button.addEventListener("click", openCart);
        });
        document.querySelectorAll("[data-close-cart]").forEach((button) => {
            button.addEventListener("click", closeCart);
        });

        document.addEventListener("click", (event) => {
            const quantityButton = event.target.closest("[data-quantity]");
            const removeButton = event.target.closest("[data-remove-item]");
            if (quantityButton) {
                changeQuantity(quantityButton.dataset.itemId, Number(quantityButton.dataset.quantity));
            }
            if (removeButton) removeItem(removeButton.dataset.removeItem);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeCart();
                document.body.classList.remove("menu-open");
            }
        });
    }

    function setupMenu() {
        const trigger = document.getElementById("menuButton");
        if (!trigger) return;
        trigger.addEventListener("click", () => {
            const isOpen = document.body.classList.toggle("menu-open");
            document.body.classList.remove("cart-open");
            trigger.setAttribute("aria-expanded", String(isOpen));
        });
        document.querySelectorAll(".main-nav a").forEach((link) => {
            link.addEventListener("click", () => document.body.classList.remove("menu-open"));
        });
    }

    function setupCheckout() {
        const form = document.getElementById("checkoutForm");
        if (!form) return;
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const cart = readCart();
            if (!cart.length) {
                showToast("Your cart is empty");
                return;
            }
            if (!form.reportValidity()) return;

            const data = new FormData(form);
            const itemLines = cart.map((item) =>
                `• ${item.name} — ${item.size} × ${item.qty} — ${money(item.price * item.qty)}`
            ).join("\n");
            const message = [
                "Hello Zaman Tea! I would like to place an order.",
                "",
                "ORDER",
                itemLines,
                `Subtotal: ${money(cartTotal(cart))}`,
                "Delivery: Across India — charge and timing to be confirmed",
                "",
                "CUSTOMER",
                `Name: ${data.get("name")}`,
                `Phone: ${data.get("phone")}`,
                `Email: ${data.get("email") || "Not provided"}`,
                `Address: ${data.get("address")}, ${data.get("city")}, ${data.get("state")} - ${data.get("pincode")}`,
                `Payment preference: ${data.get("payment")}`,
                `Order notes: ${data.get("notes") || "None"}`
            ].join("\n");

            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
            const status = document.getElementById("orderStatus");
            if (status) status.textContent = "Your order details have opened in WhatsApp. Send the message there to confirm your order.";
        });
    }

    function setupContactForm() {
        const form = document.getElementById("contactForm");
        if (!form) return;
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            const data = new FormData(form);
            const message = [
                "Hello Zaman Tea!",
                `Name: ${data.get("name")}`,
                `Phone: ${data.get("phone")}`,
                `Email: ${data.get("email") || "Not provided"}`,
                `Message: ${data.get("message")}`
            ].join("\n");
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("[data-year]").forEach((node) => {
            node.textContent = new Date().getFullYear();
        });
        setupMenu();
        setupCart();
        setupProductCards();
        setupCheckout();
        setupContactForm();
        renderCart();
        renderCheckout();
    });
})();
