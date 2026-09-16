const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const publicPages=['index.html','menu.html','about.html','contacts.html','policies.html'];
export function discoveryResponse(req,res,path,origin){
 if(!['GET','HEAD'].includes(req.method))return false;
 if(!['/robots.txt','/sitemap.xml'].includes(path))return false;
 const content=path==='/robots.txt'?`User-agent: *\nDisallow: /admin\nDisallow: /checkout\nDisallow: /order\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPages.map(p=>`<url><loc>${esc(origin+'/'+(p==='index.html'?'':p))}</loc></url>`).join('')}</urlset>`;
 res.writeHead(200,{'Content-Type':path==='/robots.txt'?'text/plain; charset=utf-8':'application/xml; charset=utf-8'});res.end(req.method==='HEAD'?undefined:content);return true;
}
export function pageMetadata(html,page,origin,settings){
 if(!publicPages.includes(page))return html.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
 const canonical=origin+'/'+(page==='index.html'?'':page),title=html.match(/<title>(.*?)<\/title>/)?.[1]||'Zaman Tea',description=html.match(/name="description" content="([^"]*)"/)?.[1]||'Explore the Zaman Tea collection.';
 return html.replace('</head>',`<link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Zaman Tea"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(origin)}/img/zaman/social-preview.jpg"><meta property="og:image:alt" content="The Zaman Tea collection"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="img/zaman/favicon.png" type="image/png"></head>`);
}
