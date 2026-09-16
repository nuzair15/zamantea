const origin=process.env.HEALTH_ORIGIN||'http://127.0.0.1:'+Number(process.env.PORT||3000);
try{const r=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(10000)});if(!r.ok||!(await r.json()).ok)throw Error('Unhealthy response');console.log('Store health check passed.');}catch{console.error('Store health check failed. Inspect zaman.service and application logs.');process.exitCode=1;}
