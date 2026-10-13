import {cpSync,mkdirSync,existsSync} from 'node:fs';
mkdirSync('public',{recursive:true});
const source=existsSync('../dist/index.html')?'../dist':'..';
for(const file of ['index.html','welcome.html','lady-squirrel-hunter.html','template.css','template-guide.js','raffle.js','raffle-data.js','content-data.js','rides-data.js','site-copy.js','site-copy-data.js','assets','gallery.js','gallery-data.json'])cpSync(`${source}/${file}`,`public/${file}`,{recursive:true});
for(const file of ['admin.html','admin.js','admin-copy.js','submit.html','review.html','review.js','media-forms.css'])cpSync(`editor/${file}`,`public/${file}`);

const {build}=await import('esbuild');await build({entryPoints:['editor/submit-source.js'],bundle:true,outfile:'public/submit.js',platform:'browser',minify:true,target:'es2020'});
