import sharp from 'sharp';
import {stat} from 'node:fs/promises';
const root='Template/img/zaman/';
let before=0,after=0;
for(const name of ['ginger-pouch-v3','cardamom-pouch-v3','darjeeling-pouch-v3']){
 const input=root+name+'.png',output=root+name+'.webp';
 await sharp(input).resize({width:640,withoutEnlargement:true}).webp({quality:85}).toFile(output);
 before+=(await stat(input)).size;after+=(await stat(output)).size;
}
await sharp(root+'ginger-pouch-v3.png').resize(1200,630,{fit:'contain',background:'#f9de98'}).flatten({background:'#f9de98'}).jpeg({quality:85}).toFile(root+'social-preview.jpg');
await sharp(root+'zaman-logo-white-v2.png').trim().resize(64,64,{fit:'contain',background:'#30261f'}).png().toFile(root+'favicon.png');
console.log(`Main product images: ${before} → ${after} bytes (${Math.round(100*(1-after/before))}% smaller). Originals retained.`);
