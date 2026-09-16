import {randomBytes,scryptSync} from 'node:crypto';
import {openDb,getSettings} from './db.mjs';
export function fixture(){
 const db=openDb(':memory:');
 for(const row of db.prepare('SELECT * FROM products').all()){const p=JSON.parse(row.data);p.variants=p.variants.map(v=>({...v,stock:10}));Object.assign(p,{ingredients:'Test ingredients',brewing:'Test brewing',storage:'Test storage',shelfLife:'Test shelf life'});db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);}
 const settings={...getSettings(db),shippingConfigured:true,businessName:'Test Store',businessAddress:'Test address',supportEmail:'owner@example.com',supportHours:'Test hours',deliverySummary:'Test delivery',shippingPolicy:'Test shipping policy',returnsPolicy:'Test returns policy',privacyPolicy:'Test privacy policy',termsPolicy:'Test terms policy',policiesReviewed:true,coverageReviewed:true,allIndia:false,deliveryPincodes:['576101'],codPincodes:['576101'],codFee:2000};
 db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify(settings));
 const salt=randomBytes(32).toString('hex'),hash=scryptSync('fixture-password-123',salt,64).toString('hex');db.prepare('INSERT INTO admin VALUES (1,?,?,?)').run('owner@example.com',salt,hash);
 return db;
}
export const customer={name:'Test Customer',phone:'9876543210',email:'customer@example.com',address:'12 Example Road',city:'Udupi',state:'Karnataka',pincode:'576101',notes:''};
export const items=[{productId:'ginger',size:'150',qty:1}];
