import {createApp} from './app.mjs';
const {server,db}=createApp();
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`Zaman Tea listening on port ${process.env.PORT||3000}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>{db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
