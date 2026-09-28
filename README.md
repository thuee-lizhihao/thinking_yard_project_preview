# Thinking Yard · Project Pages

NICS-EFC 的研究主页与五个项目页面，一套共享导航，一个构建入口。

- 仓库：<https://github.com/fuvty/thinking_yard_project_page>
- 站点：<https://fuvty.github.io/thinking_yard_project_page/>
- 项目：C2C、TaH、R2R、FrameFusion、MoA

## 开始使用

需要 Node.js 22.13+ 与 npm。

```sh
npm ci
npm run dev
```

打开 <http://127.0.0.1:3000/>。其他端口：`npm run dev -- --port 3003`。
主页支持热更新；修改项目 HTML/CSS/JS、共享导航或配置后，生成器会自动更新项目页面，刷新浏览器即可看到效果。

```sh
npm run check     # 类型检查、导航/新增项目/数据与链接测试
npm run build     # 生成整个静态站点到 out/，并检查最终输出
npm run preview   # 在 http://127.0.0.1:3002/ 检查构建结果
```

开发预览和生产构建共用生成目录，运行生产构建前先停止 `npm run dev`。

## 文件结构

```text
config/
  projects.json        项目清单：名称、分类、说明、logo、研究路线
  categories.json      三个研究分类
  section-groups.json  本页目录的共用分组名称
  site.json            站点名、线上地址前缀、主页目录
app/                   现有 Next.js 主页的薄入口与元数据
hub/
  ScalingPaths.tsx      交互式 Scaling Paths 主页
  curve-math.ts         曲线计算
  styles.css            主页专属样式
  assets/               主页图标和分享图片
projects/
  c2c/                 每个项目使用相同目录格式
    page.json           标题、摘要、本页目录、共享主题
    head.html           项目自己的样式和运行时依赖
    content.html        正文与项目专属演示代码
    citation.bib        原始引用；正文用 {{citation}} 引入共享卡片
    static/             本项目图片、视频、CSV、CSS、JS
  tah/ r2r/ framefusion/ moa/
shared/
  navigation/
    render.mjs          唯一的导航 HTML 渲染器，主页和所有项目共用
    controller.js       唯一的悬停、点击、键盘、滚动状态实现
    styles.css          唯一的导航布局、字号和动画
  ui/
    render.mjs          回到顶部按钮与引用卡片的唯一模板
    controller.js       滚动、复制、成功/失败反馈
    styles.css          回到顶部、复制、论文按钮和作者标签
  styles/
    tokens.css          颜色、字号、容器宽度等设计变量
    components.css      所有项目的通用组件样式
    research.css        C2C / TaH / R2R 和新项目的研究页面主题
  assets/               本地项目 logo
scripts/                生成、开发、构建检查、预览、新增项目
tests/                 回归测试
docs/                  设计规范、迁移记录与资源来源
.github/workflows/      检查与 GitHub Pages 自动发布
public/                 自动生成，勿编辑、不提交
out/                    最终静态网站，勿编辑、不提交
```

## 日常修改去哪里

| 要修改的内容 | 修改位置 |
| --- | --- |
| 顶栏、菜单、hover、手机交互 | `shared/navigation/`，所有页面同时更新 |
| 回到顶部、复制引用、论文按钮、作者标签 | `shared/ui/` |
| 引用内容 | `projects/<slug>/citation.bib` |
| 项目名称、介绍、logo 或分类 | `config/projects.json`，导航和主页卡片同时更新 |
| 某个项目的章节目录 | `projects/<slug>/page.json` 中的 `sections` |
| 项目的研究正文、图表、作者 | `projects/<slug>/content.html` |
| 项目素材与特有交互 | `projects/<slug>/static/` |
| 通用颜色和尺寸 | `shared/styles/tokens.css` |
| 部署网址、路径前缀 | `config/site.json` |

不要把导航复制到各项目。`head.html` 中保留本地 `./static/css/index.css` 引用：生成器会在它之前插入共享设计样式，之后插入独立的导航样式。

### 本页目录

`On this page` 在桌面支持悬停、点击和键盘，在手机上点击展开。所有论文页使用三个分组：`research`（背景、发现、方法）、`evaluation`（示例、演示、结果、总结）、`resources`（团队、引用）。每个章节写入 `page.json`：

```json
{"id":"method","label":"Method","group":"research","description":"Cache projection and fusion"}
```

`id` 必须对应正文中的真实锚点。标签统一使用 `Overview`、`Key insight`、`Method`、`Results`、`Team`、`Citation`；特有章节可保留 `Calibration`、`Examples` 等名称。不要为凑齐目录增加不存在的内容。共享渲染器自动生成分组与桌面/手机布局；新增项目模板也包含这些字段。

### 公共控件

所有页面（包括主页）共用 48px 的蓝色回到顶部按钮。按钮在滚动 500px 后出现，桌面距边缘 24px，手机 16px 并兼容安全区；目录展开时暂时隐藏。键盘返回顶部后会恢复 Home 焦点，减少动画偏好下立即返回。

引用卡片由 `{{citation}}` 和本项目的 `citation.bib` 构建；不要再单独编写复制按钮或复制脚本。所有页面使用相同的 Copy BibTeX → Copied 反馈，并处理剪贴板失败。论文/代码 CTA 与作者标签也统一在 `shared/ui/styles.css` 中，项目 CSS 不再重复定义这些组件。

## 新增一个项目

```sh
npm run new:project -- my-project "My Project" context
```

分类可用 `compression`、`adaptivity`、`context`。命令会：

1. 创建 `projects/my-project/`，包含正文骨架、元数据、CSS 和 JS。
2. 在 `config/projects.json` 登记项目。
3. 让项目自动出现在全站导航和主页项目卡片中。

然后填入研究内容、真实项目介绍、logo 与 `route`（`02` 或 `03`），运行 `npm run check` 和 `npm run build`。无需修改其他五个页面，也无需编辑发布工作流。

## 发布与路径

推送到 `main` 后，GitHub Actions 自动检查、构建并发布整个网站。PR 只检查与构建，不发布。

仓库保持私有；Pages 网站公开可访问。GitHub 已启用 `build_type: workflow`。

GitHub Pages 构建使用 `GITHUB_PAGES=true`，读取 `config/site.json` 的 `basePath`。本地默认不加前缀。完整模拟线上路径：

```sh
GITHUB_PAGES=true npm run build
GITHUB_PAGES=true npm run preview
# http://127.0.0.1:3002/thinking_yard_project_page/
```

若以后绑定自定义域名，修改 `origin` 并把 `basePath` 设为 `""`；不需要逐页改链接。也可临时使用 `SITE_ORIGIN`、`SITE_BASE_PATH` 覆盖配置。

| 页面 | 站内路径 |
| --- | --- |
| 总览 | `/` |
| C2C | `/projects/c2c/` |
| TaH | `/projects/tah/` |
| R2R | `/projects/r2r/` |
| FrameFusion | `/projects/framefusion/` |
| MoA | `/projects/moa/` |

## 迁移说明

这次把现有工作区的最新页面（包括已确认的本地改动）整合为一个新仓库。旧项目仓库及其线上网址未改动，仍可访问。迁移的是网站源文件和静态素材；旧仓库的 Git 历史、论文 LaTeX 工作区、缓存和本地工具配置不随站点打包。原始仓库、来源 commit 和 logo 地址记录在 `docs/`。

当前复用的是完整导航、项目清单、设计变量及通用页面样式。各论文的异构演示、公式、图表和 CSV 逻辑保留在项目目录，避免把特有逻辑强行塞进通用模板。总览沿用 Next.js/React；论文页继续输出普通 HTML/CSS/JS，无需浏览器运行 React 来显示论文内容。
