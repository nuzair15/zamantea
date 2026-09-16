import {mailWorker} from './mail.mjs';
import {createApp} from './app.mjs';
const {server,db}=createApp();
const mail=mailWorker(db);void mail.flush();
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`Zaman Tea listening on port ${process.env.PORT||3000}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(async()=>{await mail.stop();db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
