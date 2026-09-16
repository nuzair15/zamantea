import {DatabaseSync} from 'node:sqlite';
import {mkdir,cp,readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
export async function createBackup(dbPath,directory,imageDirectory=resolve('Template/img/zaman')){
 await stat(dbPath);
 const output=resolve(directory,'zaman-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8));
 await mkdir(output,{recursive:true,mode:0o700});
 const db=new DatabaseSync(dbPath,{readOnly:true});try{db.prepare('VACUUM INTO ?').run(join(output,'zaman.sqlite'));}finally{db.close();}
 await cp(imageDirectory,join(output,'images'),{recursive:true,errorOnExist:true,force:false});
 const files={};async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.isFile())files[relative(output,file).replaceAll('\\','/')]=createHash('sha256').update(await readFile(file)).digest('hex');else throw Error('Unsupported backup entry.');}}
 await walk(output);await writeFile(join(output,'manifest.json'),JSON.stringify({version:1,createdAt:new Date().toISOString(),files},null,2),{mode:0o600});return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const output=await createBackup(process.env.DB_PATH||'data/zaman.sqlite',process.argv[2]||'backups');console.log('Backup created: '+output);
 if(process.env.BACKUP_S3_URI){if(!/^s3:\/\/[a-z0-9.-]+(?:\/[a-zA-Z0-9_./-]*)?$/.test(process.env.BACKUP_S3_URI))throw Error('Use an s3://bucket/prefix backup destination.');await promisify(execFile)('aws',['s3','cp',output,process.env.BACKUP_S3_URI.replace(/\/$/,'')+'/'+output.split(/[\\/]/).at(-1)+'/', '--recursive','--sse','AES256'],{timeout:300000});console.log('Off-server backup uploaded.');}
 else console.log('Off-server backup not configured. Set BACKUP_S3_URI or arrange another remote backup destination.');
}
