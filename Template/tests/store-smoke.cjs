const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("file:///C:/Users/GIGABYTE/Downloads/zman/Template/menu.html");
    await page.locator(".product-card").first().locator("select").selectOption("300");
    await page.locator(".product-card").first().locator(".add-to-cart").click();

    const count = await page.locator("[data-cart-count]").first().textContent();
    if (count !== "1") throw new Error(`Expected cart count 1, received ${count}`);

    await page.locator("[data-open-cart]").click();
    const cartText = await page.locator("#cartItems").textContent();
    if (!cartText.includes("Rich Ginger Tea") || !cartText.includes("300g") || !cartText.includes("399")) {
        throw new Error(`Cart contents incorrect: ${cartText}`);
    }

    await page.locator("#checkoutLink").click();
    await page.waitForLoadState("load");
    const checkoutText = await page.locator("#checkoutItems").textContent();
    const total = await page.locator("#checkoutTotal").textContent();
    if (!checkoutText.includes("Rich Ginger Tea") || !checkoutText.includes("300g") || !total.includes("399")) {
        throw new Error("Cart did not persist correctly to checkout");
    }

    await page.evaluate(() => {
        window.open = (url) => { window.__zamanOrderUrl = url; };
    });
    await page.fill("#checkout-name", "Test Customer");
    await page.fill("#checkout-phone", "9876543210");
    await page.fill("#checkout-address", "12 Tea Garden Road");
    await page.fill("#checkout-city", "Kolkata");
    await page.fill("#checkout-state", "West Bengal");
    await page.fill("#checkout-pincode", "700001");
    await page.click("#placeOrderButton");
    const orderUrl = await page.evaluate(() => window.__zamanOrderUrl || "");
    const decodedOrderUrl = decodeURIComponent(orderUrl);
    if (!decodedOrderUrl.includes("wa.me/9663401610") || !decodedOrderUrl.includes("Rich Ginger Tea") || !decodedOrderUrl.includes("₹399")) {
        throw new Error(`WhatsApp order handoff incorrect: ${decodedOrderUrl}`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("file:///C:/Users/GIGABYTE/Downloads/zman/Template/menu.html");
    const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
    }));
    if (dimensions.scrollWidth > dimensions.innerWidth) {
        throw new Error(`Mobile horizontal overflow: ${JSON.stringify(dimensions)}`);
    }
    if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);

    console.log("PASS: cart, ₹399 size pricing, checkout persistence, WhatsApp handoff and mobile overflow");
    await browser.close();
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
