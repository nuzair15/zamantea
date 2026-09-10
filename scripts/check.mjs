import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
const pages=['index','menu','checkout','about','contacts','order','admin'];let count=0;
for(const name of pages){const path=resolve('Template',name+'.html'),html=readFileSync(path,'utf8');for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const target=match[1];if(/^(#|https?:|mailto:|tel:)/.test(target))continue;const file=resolve(dirname(path),target.split(/[?#]/)[0]);if(!existsSync(file))throw new Error(`${name}: missing ${target}`);count++;}if(!html.includes('name="viewport"'))throw new Error('Missing viewport: '+name);}
for(const dir of ['server','scripts','Template/js'])for(const name of readdirSync(dir)){if(!name.endsWith('.mjs')&&!['store.js','admin.js'].includes(name))continue;execFileSync(process.execPath,['--check',resolve(dir,name)]);}
const css=readFileSync('Template/css/store.css','utf8');for(const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))if(!existsSync(resolve('Template/css',match[1])))throw new Error('Missing CSS asset: '+match[1]);
console.log(`Validated ${pages.length} page entrypoints, ${count} local references, CSS fonts and JavaScript syntax.`);
