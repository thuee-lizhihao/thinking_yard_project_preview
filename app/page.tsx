import Script from 'next/script';
import ScalingPaths from '../hub/ScalingPaths';
import projects from '../config/projects.json';
import categories from '../config/categories.json';
import site from '../config/site.json';
import {basePath} from '../config/paths.mjs';
import {renderNavigation} from '../shared/navigation/render.mjs';
import {renderBackToTop, renderFooter} from '../shared/ui/render.mjs';
export default function Page() {
  const base = basePath();
  return <>
    <div dangerouslySetInnerHTML={{__html: renderNavigation({projects,categories,name:site.name,sections:site.hubSections,base})}} />
    <ScalingPaths />
    <div dangerouslySetInnerHTML={{__html: renderFooter({base,name:site.name,team:site.team})}} />
    <div dangerouslySetInnerHTML={{__html: renderBackToTop()}} />
    <Script src={`${base}/shared/navigation/controller.js`} strategy="afterInteractive" />
    <Script src={`${base}/shared/ui/controller.js`} strategy="afterInteractive" />
  </>;
}
