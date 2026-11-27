# Sidebar icon theme

A single-material icon layer for the left sidebar of DeepSeek Harness: **21** clay folders for
Workspaces (a 3 × 7 grid) and **28** clay objects for Sessions (a 4 × 7 grid). Both use one
Claymorphism 3D recipe — one light source, one shadow height, one rounding rule — so the sidebar reads
as one set. Any single row's icon can be set from that row's `⋯` menu.

## What changed, row by row

**Workspace (project) rows.** A clay folder: rounded body with a tab on the upper left, a cream page
peeking out of it, the same inner shadow / top light / rim light as every other icon. Expanding a
group swaps in a deeper body with a lighter front flap, so the fold line drops and the folder reads as
open.

**Session rows.** A soft-clay 3D object with no frame or plate behind it — the object itself is the
icon. 128 × 128 canvas, body occupying 70–78% of it, every edge rounded (roughly 18–20% of the body
width), one light source at 45° from the upper left.

**Titles.** Project titles rise to 600 and Session titles stay at 400.

## How clay is built

Every icon — folder or object — is the same five-layer stack, so the set shares one light direction
and one shadow height:

| Layer | Implementation |
| --- | --- |
| ground shadow | ellipse at `cy 114`, `rx 36 · ry 8`, dark tone at 25%, `feGaussianBlur 7` |
| body | silhouette filled with a three-stop gradient along `(26,18) → (104,112)`: light → main at 35% → dark |
| inner shadow | the same silhouette translated `(0 6)` in the dark tone at 38%, masked to the shape |
| top light | white radial (`40% → 12% → 0`) centred at `(42,34)` (folders `(42,38)`), masked |
| rim light | the silhouette stroked 3 wide in the light tone at 45%, masked, so only the inner edge shows |
| accent | cream `#FFFDF8 → #EFE7D6` for one secondary part (window, page, lens) — never a new hue |

Sessions draw their three tones from the six families below. Folders draw theirs from the Workspace
kind's own hue, so all 21 project colours stay distinct: `main` is the base hex, `light` is L 70 /
S 62 of that hue, `dark` is L 42 / S 78 of it.

Six families, and every icon belongs to exactly one:

| Family | Members | main / light / dark |
| --- | --- | --- |
| dev | Code, API, Git, Terminal, Deploy | `#5B8CFF` / `#7FA3FF` / `#3A5FD9` |
| smart | AI, Research, Lab, Study | `#A06BFF` / `#B78CFF` / `#7A45E0` |
| quality | Test, Security, Perf | `#3DDC97` / `#63E7AE` / `#1FAF72` |
| alert | Bug | `#FF6B7A` / `#FF8A96` / `#D94456` |
| create | Design, Media, Blog, Docs, Note | `#FF7EB6` / `#FF9BC7` / `#E0518C` |
| ops | Business, Plan, Data, Infra, Sync | `#FFB347` / `#FFC46B` / `#E8862A` |
| sky | Web, Mobile, Game, Chat, Other | `#43CFF2` / `#6FDCF7` / `#1FA5CC` |

Other uses the neutral `#B9C2D0` grey-blue. The light stop is one step deeper than a pure pastel on
purpose: at 16–26px a pale top half washes out and the object stops reading as a coloured thing.

## The kind table

每个 kind 只声明一个**色相**（`BASE` 里的 `seed(度数)` 或 `seed(度数, 饱和度)`）；明度、饱和上限、
亮部/暗部由 `clayTone()` 从这一行色相推出来，所以加一个图标 = 加一行色相 + 一段路径（会话）。
色相按 18–30° 铺满色相环，`PROJECT_KINDS` / `SESSION_KINDS` 的顺序刻意交替冷暖，选图面板不会出现
一整排相近色。

| Kind | 色相 | 范围 | Matched words (excerpt) |
| --- | --- | --- | --- |
| code | 225 蓝 | 项目 + 会话 | code, src, sdk, plugin, 插件, build, fix, 工程, dsh, core |
| deploy | 26 橙 | 项目 + 会话 | 部署, 发布, release, 构建, build, 打包, 上线 |
| test | 148 绿 | 项目 + 会话 | test, qa, 测试, 用例, e2e, 回归 |
| paper | 280 紫 | 项目 + 会话 | paper, 论文, 研究, course, 课程, exam, lab, learn, 学习 |
| biz | 82 黄绿 | 项目 + 会话 | 商业, 财务, 记账, 营销, 运营, 电商, 订单 |
| docs | 212 靛蓝 | 项目 + 会话 | doc, note, 笔记, readme, wiki, 文档 |
| bug | 356 红 | 项目 + 会话 | bug, 报错, 异常, 修复, fix, crash, traceback |
| game | 105 草绿 | 项目 + 会话 | game, 游戏, unity, godot, 像素, 关卡 |
| ai | 262 靛紫 | 项目 + 会话 | ai, llm, model, agent, 模型, prompt, 推理 |
| plan | 40 琥珀 | 项目 + 会话 | 计划, 规划, 待办, todo, 架构, 方案, 里程碑 |
| web | 205 天蓝 | 项目 + 会话 | web, site, 前端, html, react, app, 网站 |
| media | 320 品红 | 项目 + 会话 | 图片, 视频, 音频, 剪辑, 素材, 海报, photo, video |
| tool | 62 黄 | 项目 | tool, 工具, auto, bot, script, 脚本, mcp, cli, dev |
| data | 172 青 | 项目 + 会话 | data, db, sql, 分析, 统计, dataset, 报表 |
| design | 338 玫红 | 项目 + 会话 | design, theme, 图标, 主题, 配色, 排版, ui, ux |
| api | 190 青蓝 | 项目 + 会话 | api, 接口, 后端, 服务端, server, backend, grpc |
| blog | 300 紫红 | 项目 + 会话 | blog, 博客, 公众号, 专栏, 推文 |
| generic | 210 灰 | 项目 + 会话 | anything else |
| infra | 196 钢青 | 仅会话 | 运维, 服务器, docker, k8s, nginx, 集群, 环境配置 |
| terminal | 222 石墨 | 仅会话 | 终端, shell, bash, 命令行, cli, 脚本, powershell |
| chat | 120 青绿 | 仅会话 | 讨论, 聊聊, 咨询, 建议, 评估, 对比, 选型 |
| search | 250 蓝紫 | 仅会话 | 搜索, 调研, 查找, 资料, 检索, 搜集 |
| git | 12 朱红 | 仅会话 | git, commit, 分支, branch, merge, rebase, 回滚 |
| security | 240 蓝 | 仅会话 | 安全, 密钥, 权限, 漏洞, 加密, auth, 鉴权, 隐私 |
| perf | 68 柠檬 | 仅会话 | 性能, 加速, 内存, 卡顿, 缓存, 调优, benchmark |

Workspace kinds come from the directory name (or the renamed Workspace title). Session kinds come
from the Session title; an untitled Session falls back to its working-directory name. One to four
character Latin words must match on a word boundary, so `ui` does not match `build`. The first
matching rule wins, and the order is deliberate: a name containing both "course" and "test" reads as
a course, and "fix" outranks everything else.

## Custom icons from the row menu

Both `⋯` menus carry **自定义图标… / Custom icon…**: 28 tiles for a Session, 21 for a Workspace.
There is no "auto" tile — the panel opens with the icon the row is **already showing** selected, so
the first look answers "what is this row using?" instead of offering a choice between "auto" and a
list. Picking any tile applies at once and closes the panel.

Both grids are exactly seven columns wide, so the 21 Workspace kinds fill three rows and the 28
Session kinds fill four. The Workspace grid is pure swatches — no captions, the kind name only in the
hover tooltip — while the Session grid keeps a one-word English caption under each glyph.

The panel itself reads in English whatever the app language is: `Project icon` / `Session icon` as
the title, `Done`, `Close`, and `Use default` for the reset action. Only the `⋯` menu row stays in the
interface language.

When a row carries a custom choice, the footer offers **恢复默认 / Use default**, which drops the
override and returns that row to name matching. The choice is stored per Session id and per
Workspace id in this browser's `localStorage` (key `dsh-sidebar-icons:overrides`), survives reloads
and restarts, and never touches the Session log or the Workspace registry.

The Workspace entry sits above the separating line that precedes the destructive actions
(归档 / 删除). Its exact row depends on the other plugins installed that also contribute to that
menu, so the plugin asks for an order inside the identification group and lets the menu sort it.

## Default colors never repeat the previous project

A project's color comes from its directory name, but if the result equals the color of the
**Workspace row directly above it**, the decoration advances one step along `PROJECT_KINDS` until it
differs. Deterministic — no randomness, no stored state — so it recomputes identically on every load,
still works for the first project, after deletion, and when several projects arrive at once. A
project with a custom icon is exempt.

## Where it hooks in

The Session tile is an occupant of `sidebar.session.row.leading`; the picker panel is an occupant of
`shell.overlay`; both menu rows are `ctx.contextMenus.register()` contributions for the `session` and
`workspace` target families. Workspace rows expose no row-level Slot — the browser owns their
markup — so the folder mark is a client-side decoration anchored on the documented markers
(`data-row-key` rows inside `[data-sidebar-list-area]`). It only appends its own svg and attributes,
never edits official text or classes, keeps the shipped svg visible until its own mark is in place,
and removes every attribute, node, stylesheet and observer when the plugin is switched off.

## Limitations

- A Session row shows its icon only while that Session's own state is idle. A running Session, one
  awaiting an answer, or one with an unviewed completion shows the official status dot in the same
  cell instead. Archived rows keep the cell empty, as shipped.
- Search results draw no leading cell, so they carry no icon; grouped rows and the flat single-list
  view both do.
- At 16px the icon renders its **simplified tier**: no mask, no gaussian blur — just the gradient body,
  one inner rim and the cream accent. The full five-layer version only draws at 21px and above (the
  picker). This keeps row rendering cheap and is what DETAIL recommends for small sizes.
- The clay Session objects are authored for 48–128px. In the 16px row they collapse to their
  silhouette and family colour — recognisable as an object, not as a metaphor. The panel, where they
  render at 30–34px, is where the shape detail actually shows. If row-size legibility ever outweighs
  the clay look, the row can render a simplified variant of the same shape.
- Clay needs a light family stop one step deeper than a pure pastel; at small sizes the palest stop
  washes the object out.
- Custom icons live in this browser's `localStorage`. They do not travel with the Session and are
  not shared with another device or browser profile.
- The "no repeat" rule compares a project with the row directly above it; a third project further
  down may legitimately share that color again.
- The Workspace folder depends on the shipped row structure. If a future DSH release changes it, the
  decoration stops finding its anchor and leaves the official folder in place — invisible failure,
  not a broken row.