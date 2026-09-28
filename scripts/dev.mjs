import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { generate, root } from './generate.mjs';
await generate({clean:true});
let timer, running=false, dirty=false;
async function rebuild() {
  if(running){dirty=true;return;}
  running=true;
  try { await generate(); } catch(error) {console.error(error);}
  running=false;
  if(dirty){dirty=false;await rebuild();}
}
const watchers=['projects','shared','config','hub/assets'].map(path=>watch(resolve(root,path),{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(rebuild,100);}));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1',...process.argv.slice(2)],{cwd:root,stdio:'inherit'});
const stop=signal=>{watchers.forEach(w=>w.close());child.kill(signal);};
process.on('SIGINT',()=>stop('SIGINT'));
process.on('SIGTERM',()=>stop('SIGTERM'));
child.on('exit',code=>{watchers.forEach(w=>w.close());process.exit(code??0);});
