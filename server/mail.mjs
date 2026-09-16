import nodemailer from 'nodemailer';
export function mailWorker(db,env=process.env,transport){
 const configured=!!(env.SMTP_HOST&&env.MAIL_FROM);
 const sender=transport||(configured?nodemailer.createTransport({host:env.SMTP_HOST,port:Number(env.SMTP_PORT||587),secure:env.SMTP_SECURE==='1',requireTLS:env.SMTP_SECURE!=='1',auth:env.SMTP_USER?{user:env.SMTP_USER,pass:env.SMTP_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true}):null);
 let running=false,stopped=false;
 async function flush(){if(!sender||running||stopped)return;running=true;try{for(const row of db.prepare('SELECT * FROM mail_outbox WHERE sent_at IS NULL AND next_attempt<=? ORDER BY created_at LIMIT 10').all(Date.now())){if(stopped)break;try{const {order:o,event,audience,token,businessName}=JSON.parse(row.data),link=audience==='customer'?`${env.APP_ORIGIN}/order.html#${o.id}/${token}`:`${env.APP_ORIGIN}/admin.html`,money=v=>'INR '+(v/100).toFixed(2);
 const result=await sender.sendMail({from:env.MAIL_FROM,to:row.recipient,messageId:`<${Buffer.from(row.id).toString('hex')}@${new URL(env.APP_ORIGIN).hostname}>`,subject:`${businessName}: ${o.number} — ${o.status.replaceAll('_',' ')}`,text:[`${businessName} — order ${o.number}`,`Status: ${o.status.replaceAll('_',' ')}`,`Payment: ${o.paymentStatus.replaceAll('_',' ')}`, ...o.items.map(i=>`${i.name}, ${i.size}g x ${i.qty}: ${money(i.price*i.qty)}`),`Delivery: ${money(o.shipping)}`,`COD fee: ${money(o.codFee||0)}`,`Total: ${money(o.total)}`,o.refundedAmount?`Refunded: ${money(o.refundedAmount)}`:'',o.courier?`Tracking: ${o.courier} ${o.trackingNumber}`:'',o.trackingUrl||'',audience==='customer'?'Keep this private order link safe:':'Manage this order:',link].filter(Boolean).join('\n')});
 if(result.rejected?.length)throw new Error('Recipient rejected');
 db.prepare('UPDATE mail_outbox SET sent_at=?,last_error=NULL WHERE id=?').run(new Date().toISOString(),row.id);
 }catch{db.prepare('UPDATE mail_outbox SET attempts=attempts+1,next_attempt=?,last_error=? WHERE id=?').run(Date.now()+Math.min(3600000,60000*2**Math.min(row.attempts,6)),'Delivery failed; verify SMTP configuration and recipient.',row.id);}}}finally{running=false;}}
 const timer=setInterval(()=>void flush(),15000);timer.unref();
 return {flush,stop:async()=>{stopped=true;clearInterval(timer);while(running)await new Promise(r=>setTimeout(r,25));sender?.close?.();}};
}
