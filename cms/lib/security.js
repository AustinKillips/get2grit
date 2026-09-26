import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
export function seal(data,key){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);return Buffer.concat([iv,c.update(JSON.stringify(data)),c.final(),c.getAuthTag()]).toString('base64url')}
export function unseal(value,key){try{const b=Buffer.from(value,'base64url'),d=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),b.subarray(0,12));d.setAuthTag(b.subarray(-16));const v=JSON.parse(Buffer.concat([d.update(b.subarray(12,-16)),d.final()]));if(v.exp<Date.now())return null;return v}catch{return null}}
export function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split(/=(.*)/s)).filter(a=>a[0]))}
export function cookie(name,value,age=28800){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`}
export function validate(data){
 if(!data||!Array.isArray(data.schedule)||!data.raffle||!Array.isArray(data.raffle.prizes)||!Array.isArray(data.rides)||!data.copy||typeof data.copy.pages!=='object'||typeof data.copy.coaches!=='object')throw Error('Invalid editor content');
 if(data.schedule.length>14||data.raffle.prizes.length>500||data.rides.length>100)throw Error('Too many entries');
 for(const prize of data.raffle.prizes){if(!Array.isArray(prize.images))throw Error('Invalid prize images');for(const p of [...prize.images,prize.logo||''])if(p&&!/^assets\/[a-zA-Z0-9_./-]+$/.test(p)||p?.includes('..'))throw Error('Invalid asset path')}
 if(data.raffle.purchaseUrl&&!/^https:\/\//.test(data.raffle.purchaseUrl))throw Error('Use an HTTPS ticket link');
}
