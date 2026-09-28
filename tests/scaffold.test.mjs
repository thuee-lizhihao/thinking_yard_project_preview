import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProject} from '../scripts/new-project.mjs';
test('new project command creates source files, registers once, and refuses overwrites',async()=>{
 const fixture=await mkdtemp(join(tmpdir(),'project-scaffold-'));
 try {
  await cp(new URL('../config',import.meta.url),join(fixture,'config'),{recursive:true});
  await createProject('sample','Sample','context',fixture);
  const registry=JSON.parse(await readFile(join(fixture,'config/projects.json'),'utf8'));
  assert.equal(registry.at(-1).slug,'sample');assert.equal(registry.at(-1).route,'03');
  await access(join(fixture,'projects/sample/content.html'));await access(join(fixture,'projects/sample/static/js/index.js'));
  await access(join(fixture,'projects/sample/citation.bib'));
  assert((await readFile(join(fixture,'projects/sample/content.html'),'utf8')).includes('{{citation}}'));
  await assert.rejects(createProject('sample','Sample','context',fixture),/already exists/);
  await assert.rejects(createProject('../escape','Escape','context',fixture),/Usage/);
 } finally {await rm(fixture,{recursive:true,force:true});}
});
