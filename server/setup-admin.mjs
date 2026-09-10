import {createInterface} from 'node:readline/promises';
import {randomBytes,scryptSync} from 'node:crypto';
import {openDb} from './db.mjs';
const rl=createInterface({input:process.stdin,output:process.stdout});
const email=(await rl.question('Admin email: ')).trim().toLowerCase();rl.close();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email.');
function secret(prompt){return new Promise(resolve=>{process.stdout.write(prompt);let value='';process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');function listener(chunk){for(const c of chunk){if(c==='\u0003')process.exit(1);if(c==='\r'||c==='\n'){process.stdin.off('data',listener);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(value);return;}if(c==='\u007f'){value=value.slice(0,-1);}else if(c>=' ')value+=c;}}process.stdin.on('data',listener);});}
if(!process.stdin.isTTY)throw new Error('Run this interactively in a terminal.');
const password=await secret('New password (at least 12 characters; hidden): ');
if(password.length<12||password.length>256)throw new Error('Use 12–256 characters.');
if(password!==await secret('Repeat password: '))throw new Error('Passwords do not match.');
const salt=randomBytes(32).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
const db=openDb();db.prepare('INSERT INTO admin VALUES (1,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,salt=excluded.salt,hash=excluded.hash').run(email,salt,hash);db.prepare('DELETE FROM sessions').run();db.close();console.log('Admin account saved. Previous sessions have been signed out.');
