import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,scryptSync} from 'node:crypto';
import {openDb,getSettings} from '../server/db.mjs';
const profile=JSON.parse(await readFile('config/store-profile.json','utf8')),db=openDb();
try{
 db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify({...getSettings(db),...profile,policyVersion:new Date().toISOString()}));
 if(!db.prepare('SELECT id FROM admin WHERE id=1').get()){
  const password=randomBytes(24).toString('base64url'),salt=randomBytes(32).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
  await writeFile('data/owner-credentials.txt',`Zaman Tea local owner login\nEmail: ${profile.supportEmail}\nPassword: ${password}\n\nKeep this file private. Store the password in your password manager, then remove this file.\nReset the password using npm run admin:setup. Never upload this file to the public website.\n`,{flag:'wx',mode:0o600});
  db.prepare('INSERT INTO admin VALUES (1,?,?,?)').run(profile.supportEmail,salt,hash);
  console.log('Owner account created. Login details are in data/owner-credentials.txt (not printed or committed).');
 }
 console.log('Business details and draft policies saved. Stock and launch settings still require review.');
}finally{db.close();}
