import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderNavigation} from '../shared/navigation/render.mjs';
import {validate} from '../scripts/validate.mjs';
const projects=JSON.parse(await readFile(new URL('../config/projects.json',import.meta.url)));
const categories=JSON.parse(await readFile(new URL('../config/categories.json',import.meta.url)));
test('generated pages retain valid local media, scripts, data, and section links',async()=>{await validate('public');});
test('one registry drives every project, category and active state under a Pages base path',()=>{
 for(const current of projects){
  const html=renderNavigation({projects,categories,current:current.slug,name:current.name,sections:[],base:'/proj_page_one'});
  for(const project of projects){assert(html.includes(`href="/proj_page_one/projects/${project.slug}/"`));assert(html.includes(`src="/proj_page_one/${project.logo}"`));}
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
  assert(html.includes(`href="/proj_page_one/projects/${current.slug}/" class="active" aria-current="page"`));
  assert.equal((html.match(/class="sp-category"/g)||[]).length,3);
  assert(!html.includes('github.io'));
 }
});
test('navigation escapes names and descriptions as text',()=>{
 const html=renderNavigation({projects:[{...projects[0],name:'<b>unsafe</b>'}],categories,name:'"Page"',sections:[]});
 assert(html.includes('&lt;b&gt;unsafe&lt;/b&gt;'));assert(!html.includes('<b>unsafe</b>'));
});

test('every research page uses the same section taxonomy and includes team and citation',async()=>{
 for(const project of projects){
  const meta=JSON.parse(await readFile(new URL(`../projects/${project.slug}/page.json`,import.meta.url)));
  assert.deepEqual([...new Set(meta.sections.map(s=>s.group))],['research','evaluation','resources']);
  assert(meta.sections.some(s=>s.label==='Team'&&s.group==='resources'));
  assert(meta.sections.some(s=>s.label==='Citation'&&s.group==='resources'));
  assert(meta.sections.every(s=>s.description?.length));
  const html=renderNavigation({projects,categories,sections:meta.sections});
  assert.equal((html.match(/class="sp-contents-group"/g)||[]).length,3);
  for(const s of meta.sections) assert(html.includes(`href="#${s.id}"`));
 }
 assert.throws(()=>renderNavigation({projects,categories,sections:[{id:'x',label:'X',group:'typo'}]}),/Unknown section group/);
});
