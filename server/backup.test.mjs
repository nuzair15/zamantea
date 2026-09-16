import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDb} from './db.mjs';
import {createBackup} from '../scripts/backup.mjs';
import {restoreBackup} from '../scripts/restore.mjs';
test('backup includes committed WAL data and images; restore rejects corruption and existing destinations',async()=>{
 const root=await mkdtemp(join(tmpdir(),'zaman-backup-test-')),path=join(root,'source.sqlite'),db=openDb(path),images=join(root,'source-images');await mkdir(images);await writeFile(join(images,'tea.webp'),'test image');db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify({sentinel:'committed before backup'}));
 const backup=await createBackup(path,join(root,'backups'),images);const destination=await restoreBackup(backup,join(root,'restored'));const restored=openDb(join(destination,'zaman.sqlite'));assert.match(restored.prepare('SELECT data FROM settings').get().data,/committed before backup/);restored.close();assert.equal(await readFile(join(destination,'images','tea.webp'),'utf8'),'test image');await assert.rejects(restoreBackup(backup,destination),/must not exist/);await writeFile(join(backup,'images','tea.webp'),'corrupted');await assert.rejects(restoreBackup(backup,join(root,'corrupt-restore')),/checksum mismatch/);db.close();
});
