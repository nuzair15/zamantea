import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
export function openDb(path=process.env.DB_PATH||'data/zaman.sqlite'){
 if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS admin(id INTEGER PRIMARY KEY CHECK(id=1),email TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,number TEXT NOT NULL UNIQUE,token TEXT NOT NULL,idem TEXT NOT NULL UNIQUE,fingerprint TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL,payment_status TEXT NOT NULL,payment_method TEXT NOT NULL,razorpay_order_id TEXT UNIQUE,razorpay_payment_id TEXT UNIQUE,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS refunds(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS mail_outbox(id TEXT PRIMARY KEY,recipient TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL,sent_at TEXT,attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,last_error TEXT);
 CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
 CREATE TABLE IF NOT EXISTS webhook_events(id TEXT PRIMARY KEY,created_at TEXT NOT NULL);
 `);
 const defaults=[
 {id:'ginger',name:'Rich Ginger Tea',description:'A lively, ginger-led cup with aromatic spice and a satisfyingly warm finish.',notes:'SPICY · WARMING · COMFORTING',color:'#f2c0a1',image:'img/zaman/ginger-pouch-v3.webp',shipping:4000,active:true},
 {id:'cardamom',name:'Rich Cardamom Tea',description:'Fragrant cardamom meets a smooth, warming cup. A little everyday indulgence.',notes:'AROMATIC · WARM · REFRESHING',color:'#dce2a7',image:'img/zaman/cardamom-pouch-v3.webp',shipping:4000,active:true},
 {id:'darjeeling',name:'Classic Darjeeling Tea',description:'Rich, smooth and familiar. An unhurried cup for those who love a classic.',notes:'RICH · SMOOTH · TIMELESS',color:'#c4dce6',image:'img/zaman/darjeeling-pouch-v3.webp',shipping:4000,active:true}
 ];
 const legacyImages={ginger:'img/zaman/ginger-label.jpeg',cardamom:'img/zaman/cardamom-label.jpeg',darjeeling:'img/zaman/darjeeling-label.jpeg'};
 for(const p of defaults){
  db.prepare('INSERT OR IGNORE INTO products VALUES (?,?)').run(p.id,JSON.stringify({...p,variants:[{size:'75',price:9900},{size:'150',price:17900},{size:'300',price:39900}]}));
  const row=db.prepare('SELECT data FROM products WHERE id=?').get(p.id),current=JSON.parse(row.data);
  if(current.image===legacyImages[p.id]||current.image==='img/zaman/'+p.id+'-pouch-v3.png'){current.image=p.image;db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(current),p.id);}
 }
 db.prepare('INSERT OR IGNORE INTO settings VALUES (1,?)').run(JSON.stringify({shippingConfigured:false,freeShippingThreshold:59900,codEnabled:true,whatsappNumber:'919663401610'}));
 return db;
}
export const getProducts=db=>db.prepare('SELECT data FROM products ORDER BY rowid').all().map(r=>JSON.parse(r.data));
export const getSettings=db=>JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get().data);
export function getOrder(db,id){const r=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!r)return null;return {...JSON.parse(r.data),id:r.id,number:r.number,createdAt:r.created_at,status:r.status,paymentStatus:r.payment_status,paymentMethod:r.payment_method,razorpayOrderId:r.razorpay_order_id,razorpayPaymentId:r.razorpay_payment_id};}
