import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const directory=resolve(process.argv[2]||'backups');mkdirSync(directory,{recursive:true,mode:0o700});
const output=resolve(directory,'zaman-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
const db=new DatabaseSync(process.env.DB_PATH||'data/zaman.sqlite');db.prepare('VACUUM INTO ?').run(output);db.close();console.log('Database backup created: '+output);
