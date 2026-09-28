import sectionGroups from '../../config/section-groups.json' with { type: 'json' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const sitePath = (path = '', base = '') => `${base}/${path.replace(/^\/+/, '')}`;
const house = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
const grid = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.2"/><rect x="12" y="2.5" width="5.5" height="5.5" rx="1.2"/><rect x="2.5" y="12" width="5.5" height="5.5" rx="1.2"/><rect x="12" y="12" width="5.5" height="5.5" rx="1.2"/></svg>';
/**
 * One renderer for the React hub and every static research page.
 * @param {{projects: Array<{slug:string,name:string,category:string,logo:string}>, categories:Array<{id:string,label:string}>, current?:string, name?:string, sections?:Array<{id:string,label:string,group?:string,description?:string}>, base?:string}} options
 */
export function renderNavigation({projects, categories, current = 'home', name = 'Scaling Paths', sections = [], base = ''}) {
  const e = escape;
  for (const section of sections) {
    if (!sectionGroups.some(group => group.id === (section.group || 'research'))) {
      throw new Error(`Unknown section group: ${section.group}`);
    }
  }
  const contentsGroups = sectionGroups.map(group => ({...group, sections: sections.filter(s => (s.group || 'research') === group.id)})).filter(group => group.sections.length);
  return `<nav class="sp-global" id="navGlobal" aria-label="Team navigation">
    <div class="sp-bar">
      <a href="${e(sitePath('',base))}" class="sp-home" aria-label="Scaling Paths home">${house}<span>Home</span></a>
      <div class="sp-categories" aria-label="Project categories">${categories.map(c=>`<button type="button" class="sp-category" data-category="${e(c.id)}" aria-controls="globalProjectMenu" aria-expanded="false">${e(c.label)}</button>`).join('')}</div>
      <button type="button" class="sp-all" id="globalMenuToggle" aria-controls="globalProjectMenu" aria-expanded="false"><span>All projects</span>${grid}</button>
    </div>
    <button type="button" class="sp-backdrop" id="globalMenuBackdrop" aria-label="Dismiss projects menu" tabindex="-1" hidden></button>
    <div class="sp-projects" id="globalProjectMenu" hidden>${categories.map(c=>`<section class="sp-group" aria-labelledby="global-category-${e(c.id)}">
      <h2 id="global-category-${e(c.id)}">${e(c.label)}</h2>
      ${projects.filter(p=>p.category===c.id).map(p=>`<a href="${e(sitePath(`projects/${p.slug}/`,base))}"${p.slug===current?' class="active" aria-current="page"':''}><span class="sp-icon"><img src="${e(sitePath(p.logo,base))}" width="36" height="36" alt=""></span><span class="sp-description"><strong>${e(p.name)}</strong><small>${e(p.description)}</small></span></a>`).join('')}
    </section>`).join('')}</div>
  </nav>
  <nav class="sp-local" id="navLocal" aria-label="${e(name)} page navigation" inert>
    <div class="sp-bar"><span class="sp-title">${e(name)}</span>
      <button type="button" class="sp-contents-toggle" id="mobileMenuToggle" aria-controls="navLinks" aria-expanded="false"><span>On this page</span><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
      <div class="sp-contents" id="navLinks" inert aria-hidden="true" style="--sp-column-count:${Math.max(1, contentsGroups.length)}">${contentsGroups.map((group, index)=>`<section class="sp-contents-group" aria-labelledby="contents-${e(group.id)}" style="--sp-group-index:${index}">
        <h2 id="contents-${e(group.id)}">${e(group.label)}</h2>
        ${group.sections.map(s=>`<a href="#${e(s.id)}"><span class="sp-contents-label">${e(s.label)}</span>${s.description?`<span class="sp-contents-description">${e(s.description)}</span>`:''}</a>`).join('')}
      </section>`).join('')}</div>
    </div>
  </nav>`;
}
