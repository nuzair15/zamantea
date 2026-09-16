import {randomUUID} from 'node:crypto';
import {getProducts,getSettings,getOrder} from './db.mjs';
import {fail,textValue} from './commerce.mjs';

export const businessFields=['businessName','businessAddress','supportEmail','supportHours','deliverySummary','shippingPolicy','returnsPolicy','privacyPolicy','termsPolicy'];
export const productFields=[]; // Product information is optional until the owner supplies approved copy.
export function readiness(db){
 const s=getSettings(db),issues=[];
 for(const key of businessFields)if(!s[key]?.trim())issues.push(`Complete ${key}.`);
 if(!s.policiesReviewed)issues.push('Review and approve the customer policies.');
 if(!s.coverageReviewed)issues.push('Review delivery coverage.');
 if(!s.allIndia&&!s.deliveryPincodes?.length)issues.push('Enter supported delivery PIN codes or confirm all-India coverage.');
 if(!db.prepare('SELECT id FROM admin WHERE id=1').get())issues.push('Create the owner account.');
 const products=getProducts(db).filter(p=>p.active);
 if(!products.length)issues.push('Publish at least one product.');
 for(const p of products){for(const key of productFields)if(!p[key]?.trim())issues.push(`${p.name}: complete ${key}.`);for(const v of p.variants)if(!Number.isInteger(v.stock))issues.push(`${p.name} ${v.size}g: enter stock.`);}
 return issues;
}
export function settingsInput(b,previous){
 const s={...previous};
 for(const key of businessFields)s[key]=textValue(b[key]??previous[key]??'',key,0,key.endsWith('Policy')?15000:1000);
 if(s.supportEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.supportEmail))fail('Enter a valid support email.');
 for(const key of ['policiesReviewed','coverageReviewed','allIndia'])s[key]=b[key]===true;
 for(const key of ['deliveryPincodes','codPincodes']){const input=b[key]??[];if(!Array.isArray(input)||input.length>40000||input.some(p=>typeof p!=='string'||!(/^[1-9]\d{5}$/.test(p))))fail('Enter valid six-digit PIN codes.');s[key]=[...new Set(input)];}
 s.codFee=b.codFee??0;if(!Number.isInteger(s.codFee)||s.codFee<0||s.codFee>100000)fail('Enter a valid COD fee.');
 return s;
}
export function deliveryCheck(s,pincode,method){
 if(!s.coverageReviewed)fail('Delivery coverage is being confirmed. Please contact us.',503);
 if(!/^[1-9]\d{5}$/.test(pincode||''))fail('Enter your six-digit PIN code to check delivery.');
 if(!s.allIndia&&!s.deliveryPincodes?.includes(pincode))fail('Delivery is not available for this PIN code. Please contact us.',400);
 if(method==='cod'&&(!s.codEnabled||(s.codPincodes?.length&&!s.codPincodes.includes(pincode))))fail('Cash on delivery is not available for this PIN code. Choose another payment method.');
}
export function changeStock(db,items,direction){
 for(const i of items){const row=db.prepare('SELECT data FROM products WHERE id=?').get(i.productId);if(!row)fail('Product no longer exists.');const p=JSON.parse(row.data),v=p.variants.find(v=>v.size===i.size);if(!v||!Number.isInteger(v.stock))fail('Stock has not been configured.');if(direction<0&&v.stock<i.qty)fail(`${p.name} ${i.size}g has only ${v.stock} packs available.`,409);v.stock+=direction*i.qty;p.revision=randomUUID();db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);}
}
export function releaseStock(db,id){const row=db.prepare('SELECT data FROM orders WHERE id=?').get(id);const data=JSON.parse(row.data);if(data.stockReserved&&!data.stockRestored){changeStock(db,data.items,1);data.stockRestored=true;db.prepare('UPDATE orders SET data=? WHERE id=?').run(JSON.stringify(data),id);}}
export function applyRefund(db,r){
 if(!r||typeof r.id!=='string'||!/^rfnd_[a-zA-Z0-9]+$/.test(r.id)||!Number.isInteger(r.amount)||r.amount<=0||r.currency!=='INR'||!['pending','processed','failed'].includes(r.status))fail('Invalid refund details.');
 const row=db.prepare('SELECT id FROM orders WHERE razorpay_payment_id=?').get(r.payment_id);if(!row)return null;
 const o=getOrder(db,row.id);if(r.amount>o.total)fail('Refund amount exceeds order total.');
 const old=db.prepare('SELECT * FROM refunds WHERE id=?').get(r.id);if(old&&(old.order_id!==o.id||old.amount!==r.amount))fail('Refund details do not match.');
 if(old?.status==='processed'&&r.status!=='processed')return o.id;
 db.prepare('INSERT INTO refunds(id,order_id,amount,status) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status').run(r.id,o.id,r.amount,r.status);
 const refunded=db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM refunds WHERE order_id=? AND status='processed'").get(o.id).total;
 if(refunded>o.total)fail('Refund total exceeds order total.');
 const data=JSON.parse(db.prepare('SELECT data FROM orders WHERE id=?').get(o.id).data);data.refundedAmount=refunded;
 db.prepare('UPDATE orders SET data=?,payment_status=?,status=? WHERE id=?').run(JSON.stringify(data),refunded===o.total?'refunded':refunded?'partially_refunded':o.paymentStatus,refunded===o.total&&!['shipped','delivered'].includes(o.status)?'cancelled':o.status,o.id);
 return o.id;
}
export function queueOrderMail(db,id,event){
 const o=getOrder(db,id),s=getSettings(db),token=db.prepare('SELECT token FROM orders WHERE id=?').get(id).token;
 for(const audience of ['customer','owner']){const recipient=audience==='customer'?o.customer.email:s.supportEmail;if(!recipient)continue;
 db.prepare('INSERT OR IGNORE INTO mail_outbox(id,recipient,data,created_at) VALUES (?,?,?,?)').run(`${id}:${event}:${audience}`,recipient,JSON.stringify({order:o,event,audience,token,businessName:s.businessName||'Zaman Tea'}),new Date().toISOString());}
}
