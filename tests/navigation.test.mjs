import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const script=await readFile(new URL('../shared/navigation/controller.js',import.meta.url),'utf8');
function navigation({wide=true,fine=true}={}) {
 let document,pending;
 class Element {
  constructor(){this.events={};this.attrs={};this.dataset={};this.hidden=false;const names=new Set();this.classList={add:n=>names.add(n),remove:n=>names.delete(n),contains:n=>names.has(n),toggle:(n,on)=>on?names.add(n):names.delete(n)};}
  addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
  emit(name,extra={}){for(const fn of this.events[name]??[])fn({pointerType:'mouse',preventDefault(){},...extra});}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
  focus(){document.activeElement=this;}contains(e){return e===this;}
 }
 const ids=Object.fromEntries(['navGlobal','globalMenuToggle','globalProjectMenu','globalMenuBackdrop','navLocal','mobileMenuToggle','navLinks','scrollTop'].map(id=>[id,new Element()]));
 const categories=['compression','adaptivity','context'].map(category=>Object.assign(new Element(),{dataset:{category}}));
 const groups=categories.map(e=>{const g=new Element();g.attrs['aria-labelledby']='global-category-'+e.dataset.category;return g;});
 const links=groups.map(()=>new Element()),home=new Element(),chapter=new Element();
 ids.navGlobal.querySelectorAll=()=>categories;ids.navGlobal.querySelector=()=>home;
 ids.globalProjectMenu.querySelectorAll=s=>s==='.sp-group'?groups:links.filter((_,i)=>!groups[i].hidden);
 ids.globalProjectMenu.querySelector=()=>links[groups.findIndex(g=>!g.hidden)];
 ids.globalProjectMenu.contains=e=>links.includes(e);ids.navLinks.querySelector=()=>chapter;
 document=new Element();document.body=new Element();document.activeElement=home;document.getElementById=id=>ids[id];
 const desktop=new Element();desktop.matches=wide;
 const window=new Element();window.scrollY=0;window.matchMedia=q=>q.includes('min-width')?desktop:{matches:fine};window.setTimeout=f=>{pending=f;return 1;};window.clearTimeout=()=>{pending=null;};
 vm.runInNewContext(script,{window,document});
 return {ids,categories,groups,links,home,chapter,document,window,desktop,flush:()=>pending?.(),pending:()=>!!pending};
}
test('desktop hover keeps focus, crosses the panel gap, switches categories and dismisses',()=>{
 const n=navigation();
 n.categories[0].emit('pointerenter');assert.equal(n.categories[0].attrs['aria-expanded'],'true');assert.equal(n.document.activeElement,n.home);assert(!n.document.body.classList.contains('global-menu-open'));
 n.categories[0].emit('pointerleave');assert(n.pending());n.ids.globalProjectMenu.emit('pointerenter');assert(!n.pending());
 n.categories[1].emit('pointerenter');assert.deepEqual(n.groups.map(g=>g.hidden),[true,false,true]);
 n.categories[1].emit('click');assert(!n.ids.globalProjectMenu.hidden);assert.equal(n.document.activeElement,n.links[1]);
 n.ids.globalProjectMenu.emit('pointerleave');n.flush();assert(n.ids.globalProjectMenu.hidden);assert.equal(n.document.activeElement,n.categories[1]);
});
test('scrolling replaces team navigation and keyboard opens the page contents',()=>{
 const n=navigation();n.categories[2].emit('keydown',{key:'ArrowDown'});assert.equal(n.document.activeElement,n.links[2]);
 n.window.scrollY=100;n.window.emit('scroll');assert(n.ids.globalProjectMenu.hidden);assert(n.ids.navGlobal.inert);assert(!n.ids.navLocal.inert);
 n.ids.mobileMenuToggle.emit('click');assert.equal(n.ids.mobileMenuToggle.attrs['aria-expanded'],'true');assert.equal(n.document.activeElement,n.chapter);
 n.document.emit('keydown',{key:'Escape'});assert.equal(n.ids.mobileMenuToggle.attrs['aria-expanded'],'false');assert.equal(n.document.activeElement,n.ids.mobileMenuToggle);
 n.window.scrollY=0;n.window.emit('scroll');assert(!n.ids.navGlobal.inert);assert(n.ids.navLocal.inert);
});
test('mobile stays click driven and restores focus and body scrolling on Escape',()=>{
 const n=navigation({wide:false,fine:false});n.categories[0].emit('pointerenter');assert.equal(n.ids.globalMenuToggle.attrs['aria-expanded'],undefined);
 n.ids.globalMenuToggle.emit('click');assert.deepEqual(n.groups.map(g=>g.hidden),[false,false,false]);assert(n.document.body.classList.contains('global-menu-open'));
 n.document.emit('keydown',{key:'Escape'});assert(n.ids.globalProjectMenu.hidden);assert(!n.document.body.classList.contains('global-menu-open'));assert.equal(n.document.activeElement,n.ids.globalMenuToggle);
});
