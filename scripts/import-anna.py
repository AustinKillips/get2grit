from pathlib import Path
from PIL import Image, ImageOps
from concurrent.futures import ThreadPoolExecutor
import hashlib,json
root=Path(__file__).resolve().parents[1]
files=sorted(p for name in ['grit','grit 2','grit 3','grit 4','grit 5'] for p in (Path('/Users/austin/Downloads')/name).rglob('*.jpg'))
seen=set();unique=[]
for p in files:
 h=hashlib.sha256(p.read_bytes()).hexdigest()
 if h not in seen: unique.append(p);seen.add(h)
out=root/'assets/photos/anna-guyton';out.mkdir(parents=True,exist_ok=True)
def convert(pair):
 i,p=pair;key=f'{i:03}'
 with Image.open(p) as source:
  im=ImageOps.exif_transpose(source).convert('RGB');im.thumbnail((1800,1800));w,h=im.size
  im.save(out/f'{key}.webp',quality=82,method=4)
  im.thumbnail((640,640));im.save(out/f'{key}-640.webp',quality=76,method=4)
 return dict(id='anna-guyton-'+key,type='image',src=f'assets/photos/anna-guyton/{key}.webp',thumbnail=f'assets/photos/anna-guyton/{key}-640.webp',width=w,height=h,alt=f'GRIT FEST 2026, photograph {i} by Anna Guyton',credit='Anna Guyton',challenge='',caption='')
with ThreadPoolExecutor(max_workers=3) as pool: items=list(pool.map(convert,enumerate(unique,1)))
p=root/'gallery-data.json';data=json.loads(p.read_text())
group=next(g for g in data['groups'] if g['id']=='anna-guyton');group.update(items=items,creditConfirmed=True)
p.write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(dict(source_count=len(files),unique_count=len(unique),source_bytes=sum(p.stat().st_size for p in files),web_bytes=sum(p.stat().st_size for p in out.glob('*.webp')))),flush=True)
