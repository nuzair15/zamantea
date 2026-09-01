# Zaman Tea Storefront

Responsive static ecommerce storefront for Zaman Tea. The deployable website is in the `Template` directory.

## EC2 deployment with Nginx

```bash
sudo apt update
sudo apt install -y nginx git
sudo git clone https://github.com/nuzair15/zamantea.git /var/www/zamantea
sudo chown -R www-data:www-data /var/www/zamantea
```

Use this Nginx server block:

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/zamantea/Template;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Then validate and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The storefront uses browser local storage for the cart and sends completed order details to WhatsApp. No application server or database is required for the current ordering flow.

