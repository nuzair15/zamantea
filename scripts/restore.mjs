import {readFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
export async function restoreBackup(source,destination){
 source=resolve(source);destination=resolve(destination);
 try{await stat(destination);throw Error('Restore destination must not exist. Restore to a new directory first.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const manifest=JSON.parse(await readFile(resolve(source,'manifest.json'),'utf8'));if(manifest.version!==1||!manifest.files?.['zaman.sqlite'])throw Error('Invalid backup manifest.');
 for(const [name,hash] of Object.entries(manifest.files)){const file=resolve(source,name);if(!file.startsWith(source+sep)||!(name==='zaman.sqlite'||/^images\/[a-zA-Z0-9_.-]+$/.test(name)))throw Error('Invalid backup path.');if(createHash('sha256').update(await readFile(file)).digest('hex')!==hash)throw Error('Backup checksum mismatch: '+name);}
 const db=new DatabaseSync(resolve(source,'zaman.sqlite'),{readOnly:true});try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Database integrity check failed.');db.prepare('SELECT count(*) FROM orders').get();}finally{db.close();}
 await mkdir(destination,{recursive:true,mode:0o700});
 for(const name of Object.keys(manifest.files)){const target=resolve(destination,name);await mkdir(dirname(target),{recursive:true,mode:0o700});await copyFile(resolve(source,name),target,1);}
 return destination;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(!process.argv[2]||!process.argv[3])throw Error('Usage: node scripts/restore.mjs BACKUP_DIRECTORY NEW_RESTORE_DIRECTORY');console.log('Backup verified and restored to '+await restoreBackup(process.argv[2],process.argv[3])+'. Stop the application before replacing its database or images.');}
