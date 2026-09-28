import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, dirname, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Script } from 'node:vm';
import { parse } from 'parse5';
import { basePath } from '../config/paths.mjs';
export async function validate(directory='public') {
  const root=resolve(directory), base=basePath(), errors=[], htmlFiles=[], scripts=[], stylesheets=new Set();
  async function walk(dir) { for(const entry of await readdir(dir,{withFileTypes:true})) {const file=resolve(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.name.endsWith('.html'))htmlFiles.push(file);else if(entry.name.endsWith('.js')&&!relative(root,file).startsWith('_next/'))scripts.push(file);} }
  await walk(root);
  const exists=async file=>!!await stat(file).catch(()=>null);
  let references=0;
  for(const file of htmlFiles) {
    const source=await readFile(file,'utf8'),tree=parse(source),ids=new Set(),refs=[];
    function visit(node){const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
      if(attrs.id){if(ids.has(attrs.id))errors.push(`${relative(root,file)}: duplicate id ${attrs.id}`);ids.add(attrs.id);}
      for(const key of ['src','href','poster'])if(attrs[key])refs.push(attrs[key]);
      if(node.tagName==='script'&&!attrs.src&&(!attrs.type||attrs.type==='text/javascript')){try{new Script((node.childNodes||[]).map(n=>n.value||'').join(''));}catch(e){errors.push(`${relative(root,file)}: ${e.message}`);}}
      (node.childNodes||[]).forEach(visit);
    }visit(tree);
    for(const ref of refs) {
      if(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref))continue;
      references++;
      if(ref.startsWith('#')){if(ref.length>1&&!ids.has(decodeURIComponent(ref.slice(1))))errors.push(`${relative(root,file)}: missing anchor ${ref}`);continue;}
      const url=new URL(ref,'https://local.test'+base+'/'+relative(root,file));
      let pathname=decodeURIComponent(url.pathname);
      if(base&&!pathname.startsWith(base+'/')){errors.push(`${relative(root,file)}: base path missing in ${ref}`);continue;}
      pathname=pathname.slice(base.length);
      let target=resolve(root,'.'+pathname);
      if(pathname.endsWith('/'))target=resolve(target,'index.html');
      // public is generated before Next builds the hub.
      if(directory==='public'&&target===resolve(root,'index.html'))continue;
      if(!await exists(target))errors.push(`${relative(root,file)}: missing file ${ref}`);
      else if(extname(target)==='.css')stylesheets.add(target);
    }
    for(const match of source.matchAll(/(?:fetch|Papa\.parse)\(\s*['"](\.\/?[^'"]+)['"]/g)){
      if(!await exists(resolve(dirname(file),match[1])))errors.push(`${relative(root,file)}: missing data ${match[1]}`);
    }
  }
  for(const file of scripts){
    const source=await readFile(file,'utf8');
    try{new Script(source);}catch(e){errors.push(`${relative(root,file)}: ${e.message}`);}
    const projectRoot=file.includes('/static/')?file.split('/static/')[0]:dirname(file);
    for(const match of source.matchAll(/fetch\(\s*['"](\.\/?[^'"]+)['"]/g)) {
      if(!await exists(resolve(projectRoot,match[1])))errors.push(`${relative(root,file)}: missing data ${match[1]}`);
    }
  }
  for(const file of stylesheets) {
    const source=await readFile(file,'utf8');
    for(const match of source.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) {
      const ref=match[1];if(/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(ref))continue;
      const url=new URL(ref,pathToFileURL(file));const target=decodeURIComponent(url.pathname);
      references++;
      if(!await exists(target))errors.push(`${relative(root,file)}: missing CSS asset ${ref}`);
    }
  }
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(`Validated ${htmlFiles.length} HTML pages, ${references} local references, and ${scripts.length} project/shared scripts.`);
  return {pages:htmlFiles.length,references,scripts:scripts.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await validate(process.argv[2]||'public');
