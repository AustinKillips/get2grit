import {cpSync,mkdirSync,existsSync} from 'node:fs';
mkdirSync('public',{recursive:true});
const source=existsSync('../dist/index.html')?'../dist':'..';
for(const file of ['index.html','welcome.html','lady-squirrel-hunter.html','template.css','template-guide.js','raffle.js','raffle-data.js','content-data.js','rides-data.js','site-copy.js','site-copy-data.js','assets'])cpSync(`${source}/${file}`,`public/${file}`,{recursive:true});
for(const file of ['admin.html','admin.js','admin-copy.js'])cpSync(`editor/${file}`,`public/${file}`);
