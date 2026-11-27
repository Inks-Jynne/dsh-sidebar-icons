/**
 * dsh-sidebar-icons — 客户端半边
 *
 * 「Material Icon Theme」式的左侧栏图标主题 + 图标自定义。
 *
 * 三块能力：
 *   1. **项目行 / 会话行图标**：项目行换成双色玻璃文件夹（按目录名分类上色），
 *      会话行在 16px 前置格里画任务类型线条图标（按标题分类上色）。两层共用一张色表。
 *   2. **自定义图标**：会话行「…」菜单和项目行「…」菜单里各加一条「自定义图标…」，
 *      打开玻璃风格选图面板，为**单个**会话或项目改图标；选「自动」回到按名称匹配。
 *   3. **默认颜色不撞上一个**：新出现的项目如果算出来的色调和**上一行**项目相同，
 *      就沿固定色相环往前挪一格 —— 确定性规则，不随机，删掉项目或换顺序都会重算。
 *
 * 路线差别是刻意的：
 *   · 会话图标 + 选图面板 + 菜单项 = **正规扩展点**：
 *     `sidebar.session.row.leading` 席位、`shell.overlay` 浮层、`contextMenus.register`。
 *   · 项目文件夹图标 = **DOM 装饰**：Workspace 浏览器没有行级席位（`Slots.listSubTree` 确认），
 *     只能按稳定标记 `data-row-key^="workspace:"` 打标记、挂自己的 svg、CSS 隐掉官方 svg。
 *
 * 纪律：只做增量；fail-open；幂等；卸载时属性 / 节点 / 样式 / 观察器全部还原。
 */
window.__ModuleLoader__.load({
  id: 'dsh-sidebar-icons',
  factory: function (require) {
    var React = require('react')
    var h = React.createElement

    var SVG_NS = 'http://www.w3.org/2000/svg'
    var STYLE_MARKER = 'dsh-sidebar-icons'
    var ROW_KEY_ATTR = 'data-row-key'
    var KIND_ATTR = 'data-dsi-kind'
    var PROJ_ATTR = 'data-dsi-proj'
    var TITLE_ATTR = 'data-dsi-title'
    var FOLDER_ATTR = 'data-dsi-folder'
    var MARK_ATTR = 'data-dsi-mark'
    var STORE_KEY = 'dsh-sidebar-icons:overrides'
    var NS = 'dsh-sidebar-icons'

    /* ══════════════════════════ 色相表 ══════════════════════════
       一个 kind 只声明**色相**（0–360）和可选的基础饱和度：
       明度、黏土的亮部/暗部都由它按固定规则算出来，加一个 kind = 加一行色相。 */

    function hslToHex(hsl) {
      var hh = ((hsl[0] % 360) + 360) % 360
      var s = Math.min(100, Math.max(0, hsl[1])) / 100
      var l = Math.min(100, Math.max(0, hsl[2])) / 100
      var c = (1 - Math.abs(2 * l - 1)) * s
      var x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
      var m = l - c / 2
      var rgb = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x]
        : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x]
      var out = '#'
      for (var i = 0; i < 3; i++) {
        var v = Math.round((rgb[i] + m) * 255)
        out += (v < 16 ? '0' : '') + v.toString(16)
      }
      return out
    }

    /* 只给色相（+ 可选的基础饱和度、明度），得到一个基色。
       色相环快占满了，所以允许用「更暗/更淡」再拉开相邻色。 */
    function seed(hue, sat, light) {
      return hslToHex([hue, sat == null ? 72 : sat, light == null ? 55 : light])
    }

    var BASE = {
      /* ── 项目用到的 21 种 ── */
      code: seed(225),
      web: seed(205),
      api: seed(190),
      ai: seed(262),
      paper: seed(280),
      blog: seed(300),
      design: seed(338),
      bug: seed(356),
      deploy: seed(26),
      plan: seed(40),
      tool: seed(62),
      biz: seed(82),
      game: seed(105),
      lab: seed(130),
      test: seed(148),
      data: seed(172),
      docs: seed(212),
      media: seed(320),
      infra: seed(196, 46, 42),
      security: seed(240, 56, 40),
      mobile: seed(347, 78, 58),
      generic: seed(210, 12),
      /* ── 只在会话里用到的 7 种 ── */
      chat: seed(120),
      search: seed(250),
      git: seed(12),
      perf: seed(68),
      note: seed(93),
      sync: seed(160),
      terminal: seed(222, 34),
    }

    /* ── 颜色工具：hex ⇄ hsl，只动明度，保住色相 ── */

    function hexToHsl(hex) {
      var r = parseInt(hex.slice(1, 3), 16) / 255
      var g = parseInt(hex.slice(3, 5), 16) / 255
      var b = parseInt(hex.slice(5, 7), 16) / 255
      var max = Math.max(r, g, b)
      var min = Math.min(r, g, b)
      var l = (max + min) / 2
      var d = max - min
      var hh = 0
      var s = 0
      if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1))
        if (max === r) hh = 60 * (((g - b) / d) % 6)
        else if (max === g) hh = 60 * ((b - r) / d + 2)
        else hh = 60 * ((r - g) / d + 4)
      }
      if (hh < 0) hh += 360
      return [hh, s * 100, l * 100]
    }


    /* 只保留色相、把明度钉在固定档位，再给饱和度封顶 —— 这样十几种色都落在
       同一条浅色带里，整列才像「一套」而不是撞色盘。 */
    function toneAt(base, lightness, satCap) {
      var hsl = hexToHsl(base)
      return hslToHex([hsl[0], Math.min(hsl[1], satCap), lightness])
    }

    /* 会话与项目都用黏土渲染（见 CLAY / CLAY_FOLDER / clayIcon），
       旧的磨砂玻璃前层、方片承载与错位常量已移除。 */

    /* ══════════════════════════ 会话字形 ══════════════════════════ */

    /* ══════════════════════════ 会话图标：Claymorphism ══════════════════════════
       128×128 画布，图标本身就是一块软胶/黏土物体（没有外层容器或底板）。
       每个图标 = 若干填充形体（可带描边段），统一走下面这套光影：
         ① 主体：左上→右下的同色系三段渐变
         ② 内阴影：轮廓内、整体下移 4 的暗色，做出底部厚度
         ③ 顶部亮面：左上 45° 的柔光斑（白 40%，径向羽化）
         ④ 边缘反光：轮廓内偏下 2 的浅色细线，糖果感
         ⑤ 外部投影：正下方椭圆投影（模糊 16、25% 不透明）
       辅助部件用奶油白，不引入新色相。 */

    /* 亮部按规范同色相压深一档：26px 下大面积浅色会被洗白，这是唯一偏离规范的地方。 */
    var CLAY_FAMILY = {
      dev: { main: '#5B8CFF', light: '#7FA3FF', dark: '#3A5FD9' },
      smart: { main: '#A06BFF', light: '#B78CFF', dark: '#7A45E0' },
      quality: { main: '#3DDC97', light: '#63E7AE', dark: '#1FAF72' },
      alert: { main: '#FF6B7A', light: '#FF8A96', dark: '#D94456' },
      create: { main: '#FF7EB6', light: '#FF9BC7', dark: '#E0518C' },
      ops: { main: '#FFB347', light: '#FFC46B', dark: '#E8862A' },
      sky: { main: '#43CFF2', light: '#6FDCF7', dark: '#1FA5CC' },
      neutral: { main: '#B9C2D0', light: '#C9D0DC', dark: '#8E98A8' },
    }

    /* 每个图标：fam = 色系；parts = 主体（{d, w} 有 w 就是描边段，否则填充）；
       accent = 奶油白辅助件。坐标都在 128 格里，主体约占 70–78%。 */
    var CLAY = {
      code: {
        fam: 'dev',
        parts: [
          { d: 'M50 44 28 64 50 84', w: 18 },
          { d: 'M78 44 100 64 78 84', w: 18 },
        ],
      },
      deploy: {
        fam: 'dev',
        parts: [
          { d: 'M64 22c13 0 23 12 23 27v27c0 11-10 18-23 18s-23-7-23-18V49c0-15 10-27 23-27z' },
          { d: 'M41 76c-7 3-11 9-11 16 6 0 12-3 16-9z' },
          { d: 'M87 76c7 3 11 9 11 16-6 0-12-3-16-9z' },
        ],
        accent: [{ d: 'M64 40a11 11 0 1 0 0 22 11 11 0 1 0 0-22z' }],
      },
      test: {
        fam: 'quality',
        parts: [
          { d: 'M54 26h20v22l20 32c6 10-1 22-13 22H45c-12 0-19-12-13-22l20-32z' },
        ],
        accent: [{ d: 'M52 78l9 10 20-22', w: 11 }],
      },
      ai: {
        fam: 'smart',
        parts: [
          {
            d: 'M64 18c4 0 6 3 7 7l6 22 22 6c4 1 7 3 7 7s-3 6-7 7l-22 6-6 22c-1 4-3 7-7 7s-6-3-7-7l-6-22-22-6c-4-1-7-3-7-7s3-6 7-7l22-6 6-22c1-4 3-7 7-7z',
          },
          { d: 'M104 26a6 6 0 1 0 0 12 6 6 0 1 0 0-12z' },
          { d: 'M28 92a5 5 0 1 0 0 10 5 5 0 1 0 0-10z' },
        ],
      },
      biz: {
        fam: 'ops',
        parts: [
          { d: 'M28 46h72c6 0 10 4 10 10v34c0 6-4 10-10 10H28c-6 0-10-4-10-10V56c0-6 4-10 10-10z' },
          { d: 'M52 46v-8c0-5 4-8 9-8h6c5 0 9 3 9 8v8h-8v-7h-8v7z' },
        ],
        accent: [{ d: 'M74 64h26v10H28V64h26v6c0 3 2 5 5 5h10c3 0 5-2 5-5z' }],
      },
      search: {
        fam: 'smart',
        parts: [
          { d: 'M56 16a36 36 0 1 0 0 72 36 36 0 1 0 0-72z' },
          { d: 'M82 82l18 18c5 5 5 12 0 17s-12 5-17 0l-18-18z' },
        ],
        accent: [{ d: 'M56 28a24 24 0 1 0 0 48 24 24 0 1 0 0-48z' }],
        accentOpacity: 0.62,
      },
      sync: {
        fam: 'ops',
        parts: [
          { d: 'M96 52a34 34 0 0 0-58-20', w: 16 },
          { d: 'M36 76a34 34 0 0 0 58 20', w: 16 },
          { d: 'M74 24l16-4 4 16z' },
          { d: 'M54 104 38 108l-4-16z' },
        ],
      },
      design: {
        fam: 'create',
        parts: [
          { d: 'M64 18c26 0 46 20 46 46 0 12-4 20-12 24-6 3-10 1-12-4-3-6-8-9-15-9-14 0-25 9-25 21 0 8-6 14-16 14-14 0-20-14-20-30C10 44 34 18 64 18z' },
        ],
        accent: [
          { d: 'M42 44a8 8 0 1 0 0 16 8 8 0 1 0 0-16z' },
          { d: 'M62 36a8 8 0 1 0 0 16 8 8 0 1 0 0-16z' },
          { d: 'M82 44a8 8 0 1 0 0 16 8 8 0 1 0 0-16z' },
          { d: 'M40 68a7 7 0 1 0 0 14 7 7 0 1 0 0-14z' },
        ],
      },
      api: {
        fam: 'dev',
        parts: [
          { d: 'M46 34a28 28 0 1 0 0 56 28 28 0 1 0 0-56z' },
          { d: 'M82 40a26 26 0 1 0 0 52 26 26 0 1 0 0-52z' },
        ],
        accent: [{ d: 'M46 50a12 12 0 1 0 0 24 12 12 0 1 0 0-24z' }],
      },
      plan: {
        fam: 'ops',
        parts: [
          { d: 'M34 22h60c7 0 12 5 12 12v62c0 7-5 12-12 12H34c-7 0-12-5-12-12V34c0-7 5-12 12-12z' },
          { d: 'M52 14h24c4 0 7 3 7 7v10c0 4-3 7-7 7H52c-4 0-7-3-7-7V21c0-4 3-7 7-7z' },
        ],
        accent: [{ d: 'M40 56l7 8 15-16', w: 9 }, { d: 'M74 60h18', w: 8 }, { d: 'M40 84l7 8 15-16', w: 9 }, { d: 'M74 88h18', w: 8 }],
      },
      paper: {
        fam: 'smart',
        parts: [
          { d: 'M22 34c14-6 28-6 42 2v60c-14-8-28-8-42-2z' },
          { d: 'M106 34c-14-6-28-6-42 2v60c14-8 28-8 42-2z' },
        ],
        accent: [{ d: 'M60 34h8v64h-8z' }],
      },
      game: {
        fam: 'sky',
        parts: [
          { d: 'M46 46h36c14 0 24 12 24 24 0 14-8 24-19 24-8 0-12-6-16-12H57c-4 6-8 12-16 12-11 0-19-10-19-24 0-12 10-24 24-24z' },
        ],
        accent: [
          { d: 'M40 58h14v8H40z' },
          { d: 'M43 51h8v22h-8z' },
          { d: 'M82 60a6 6 0 1 0 0 12 6 6 0 1 0 0-12z' },
          { d: 'M92 72a5 5 0 1 0 0 10 5 5 0 1 0 0-10z' },
        ],
      },
      docs: {
        fam: 'create',
        parts: [
          { d: 'M32 22h44l24 24v58c0 7-5 12-12 12H32c-7 0-12-5-12-12V34c0-7 5-12 12-12z' },
        ],
        accent: [{ d: 'M76 22l24 24h-16c-4 0-8-4-8-8z' }, { d: 'M38 66h52', w: 8 }, { d: 'M38 84h42', w: 8 }],
      },
      bug: {
        fam: 'alert',
        parts: [
          { d: 'M64 34c20 0 34 14 34 34S84 104 64 104 30 88 30 68s14-34 34-34z' },
        ],
        accent: [
          { d: 'M64 34a15 15 0 1 0 0 30 15 15 0 1 0 0-30z' },
          { d: 'M63 62h4v42h-4z' },
          { d: 'M46 66a6 6 0 1 0 0 12 6 6 0 1 0 0-12z' },
          { d: 'M76 66a6 6 0 1 0 0 12 6 6 0 1 0 0-12z' },
        ],
      },
      data: {
        fam: 'ops',
        parts: [
          { d: 'M30 62h20v42H30z' },
          { d: 'M54 44h20v60H54z' },
          { d: 'M78 72h20v32H78z' },
        ],
        accent: [
          { d: 'M30 56a10 6 0 1 0 20 0 10 6 0 1 0-20 0z' },
          { d: 'M54 38a10 6 0 1 0 20 0 10 6 0 1 0-20 0z' },
          { d: 'M78 66a10 6 0 1 0 20 0 10 6 0 1 0-20 0z' },
        ],
      },
      media: {
        fam: 'create',
        parts: [
          { d: 'M46 26c4-2 8 0 8 5v62c0 5-4 7-8 5L26 78c-4-2-6-5-6-10V52c0-5 2-8 6-10z' },
          { d: 'M46 26l52 24c6 3 6 12 0 15L46 90z' },
        ],
      },
      infra: {
        fam: 'ops',
        parts: [
          { d: 'M30 22h68c5 0 8 3 8 8v12c0 5-3 8-8 8H30c-5 0-8-3-8-8V30c0-5 3-8 8-8z' },
          { d: 'M30 52h68c5 0 8 3 8 8v12c0 5-3 8-8 8H30c-5 0-8-3-8-8V60c0-5 3-8 8-8z' },
          { d: 'M30 82h68c5 0 8 3 8 8v12c0 5-3 8-8 8H30c-5 0-8-3-8-8V90c0-5 3-8 8-8z' },
        ],
        accent: [
          { d: 'M34 32h10v6H34z' },
          { d: 'M34 62h10v6H34z' },
          { d: 'M34 92h10v6H34z' },
        ],
      },
      perf: {
        fam: 'quality',
        parts: [
          { d: 'M64 20a44 44 0 0 1 44 44 44 44 0 0 1-88 0 44 44 0 0 1 44-44zm0 16a28 28 0 0 0-28 28 28 28 0 0 0 56 0 28 28 0 0 0-28-28z' },
          { d: 'M62 56l24-18c4-3 8 1 6 5L70 70z' },
        ],
        accent: [{ d: 'M64 58a10 10 0 1 0 0 20 10 10 0 1 0 0-20z' }],
      },
      security: {
        fam: 'quality',
        parts: [
          { d: 'M64 16c4 0 34 16 34 16v34c0 22-16 38-34 46-18-8-34-24-34-46V32s30-16 34-16z' },
        ],
        accent: [{ d: 'M64 48a11 15 0 0 1 6 28v12c0 4-3 7-6 7s-6-3-6-7V76a15 15 0 0 1 6-28z' }],
      },
      blog: {
        fam: 'create',
        parts: [
          { d: 'M34 24h52c7 0 12 5 12 12v56c0 7-5 12-12 12H34c-7 0-12-5-12-12V36c0-7 5-12 12-12z' },
          { d: 'M66 20l30 26-10 12-30-26z' },
        ],
        accent: [{ d: 'M40 62h44', w: 8 }, { d: 'M40 80h34', w: 8 }, { d: 'M92 54l8 8-8 8-8-8z' }],
      },
      git: {
        fam: 'dev',
        parts: [
          { d: 'M48 36v56', w: 16 },
          { d: 'M48 58c0 14 10 22 22 22', w: 16 },
        ],
        accent: [
          { d: 'M48 16a18 18 0 1 0 0 36 18 18 0 1 0 0-36z' },
          { d: 'M48 78a18 18 0 1 0 0 36 18 18 0 1 0 0-36z' },
          { d: 'M88 60a18 18 0 1 0 0 36 18 18 0 1 0 0-36z' },
        ],
      },
      web: {
        fam: 'sky',
        parts: [{ d: 'M64 16a48 48 0 1 0 0 96 48 48 0 1 0 0-96z' }],
        accent: [
          { d: 'M64 16c-18 12-28 30-28 48s10 36 28 48', w: 8 },
          { d: 'M64 16c18 12 28 30 28 48s-10 36-28 48', w: 8 },
          { d: 'M18 64h92', w: 8 },
        ],
      },
      lab: {
        fam: 'smart',
        parts: [
          { d: 'M52 24h24v22l20 34c6 10-1 22-13 22H45c-12 0-19-12-13-22l20-34z' },
        ],
        accent: [
          { d: 'M40 82c-4 8 1 18 11 18h26c10 0 15-10 11-18z' },
          { d: 'M58 58a5 5 0 1 0 0 10 5 5 0 1 0 0-10z' },
        ],
      },
      mobile: {
        fam: 'sky',
        parts: [
          { d: 'M46 16h36c9 0 16 7 16 16v64c0 9-7 16-16 16H46c-9 0-16-7-16-16V32c0-9 7-16 16-16z' },
        ],
        accent: [
          { d: 'M50 38h28v44H50z' },
          { d: 'M64 88a6 6 0 1 0 0 12 6 6 0 1 0 0-12z' },
        ],
      },
      note: {
        fam: 'create',
        parts: [
          { d: 'M30 24h50l28 28v52c0 6-4 10-10 10H30c-6 0-10-4-10-10V34c0-6 4-10 10-10z' },
          { d: 'M80 24c12 8 22 18 28 28 0-10-4-18-10-22z' },
        ],
        accent: [{ d: 'M40 62h38', w: 8 }, { d: 'M40 80h26', w: 8 }],
      },
      terminal: {
        fam: 'dev',
        parts: [
          { d: 'M28 26h72c8 0 14 6 14 14v48c0 8-6 14-14 14H28c-8 0-14-6-14-14V40c0-8 6-14 14-14z' },
        ],
        accent: [
          { d: 'M38 50l14 14-14 14', w: 9 },
          { d: 'M60 78h22', w: 9 },
        ],
      },
      chat: {
        fam: 'sky',
        parts: [
          { d: 'M64 20c26 0 46 16 46 36S90 92 64 92c-6 0-12-1-17-3l-21 10 5-18c-8-6-13-15-13-25 0-20 20-36 46-36z' },
        ],
        accent: [
          { d: 'M46 50a7 7 0 1 0 0 14 7 7 0 1 0 0-14z' },
          { d: 'M64 50a7 7 0 1 0 0 14 7 7 0 1 0 0-14z' },
          { d: 'M82 50a7 7 0 1 0 0 14 7 7 0 1 0 0-14z' },
        ],
      },
      generic: {
        fam: 'neutral',
        parts: [
          { d: 'M36 40a20 20 0 1 0 0 40 20 20 0 1 0 0-40z' },
          { d: 'M70 34a24 24 0 1 0 0 48 24 24 0 1 0 0-48z' },
          { d: 'M96 48a18 18 0 1 0 0 36 18 18 0 1 0 0-36z' },
        ],
      },
    }

/* ══════════════════════════ 会话图标渲染 ══════════════════════════ */

/* ══════════════════════════ 图标渲染 ══════════════════════════
       两个优化点都在这里：

       ① **id 稳定**：以前每次渲染都 claySeq += 1，同一个图标每画一次就长出一组新的
          渐变/滤镜/遮罩 id，React 只好把整棵 <defs> 拆了重建。现在 id 只由 kind 派生，
          内容相同，重渲染时 DOM 原地不动。
       ② **尺寸分档**：≤20px（侧栏行里）走简化档 —— 去掉 mask 和 feGaussianBlur，
          只保留渐变主体 + 一圈浅色内缘 + 奶油白配片；这两样在 16px 下几乎看不出来，
          却是 SVG 里最贵的。≥21px（选图面板）才走完整五层。

       渲染结果按 kind@size 缓存：同一个元素可以安全地复用在不同位置。 */

    var PAINT = { body: 'body', cream: 'cream', dark: 'dark' }
    var renderCache = {}

    /* id 必须「每次创建实例唯一」：同一 kind 可能出现两次（两个项目同为 paper），
       共用 id 会让 url(#…) 指向被移除或别处的 <defs>，整块图标变空白。 */
    var clayUid = 0

    function clayIds(key) {
      clayUid += 1
      var base = 'dsi-cl-' + key + '-' + clayUid
      return {
        body: base + '-b',
        cream: base + '-w',
        shine: base + '-h',
        blur: base + '-f',
        mask: base + '-m',
      }
    }

    function clayPaint(token, ids) {
      if (token === PAINT.body) return 'url(#' + ids.body + ')'
      if (token === PAINT.cream) return 'url(#' + ids.cream + ')'
      return null
    }

    /* 一份 defs：小档只要两条渐变，大档再加径向亮面和投影模糊 */
    function clayDefs(tone, ids, big, silhouette) {
      var kids = [
        h(
          'linearGradient',
          { key: 'g', id: ids.body, gradientUnits: 'userSpaceOnUse', x1: '26', y1: '18', x2: '104', y2: '112' },
          h('stop', { offset: '0', stopColor: tone.light }),
          h('stop', { offset: '0.35', stopColor: tone.main }),
          h('stop', { offset: '1', stopColor: tone.dark }),
        ),
        h(
          'linearGradient',
          { key: 'w', id: ids.cream, gradientUnits: 'userSpaceOnUse', x1: '26', y1: '18', x2: '104', y2: '112' },
          h('stop', { offset: '0', stopColor: '#FFFDF8' }),
          h('stop', { offset: '1', stopColor: '#EFE7D6' }),
        ),
      ]
      if (!big) return h('defs', null, kids)
      kids.push(h(
        'radialGradient',
        { key: 'h', id: ids.shine, cx: '0.42', cy: '0.4', r: '0.62' },
        h('stop', { offset: '0', stopColor: '#ffffff', stopOpacity: '0.45' }),
        h('stop', { offset: '0.55', stopColor: '#ffffff', stopOpacity: '0.16' }),
        h('stop', { offset: '1', stopColor: '#ffffff', stopOpacity: '0' }),
      ))
      kids.push(h('filter', { key: 'f', id: ids.blur, x: '-40%', y: '-60%', width: '180%', height: '220%' },
        h('feGaussianBlur', { stdDeviation: '7' })))
      if (silhouette) {
        kids.push(h('mask', { key: 'm', id: ids.mask }, h('g', null, silhouette)))
      }
      return h('defs', null, kids)
    }

    /* 主体物件：part.paint 决定用哪条渐变，part.w 有值就画描边 */
    function clayParts(parts, tone, ids) {
      return parts.map(function (part, i) {
        var paint = clayPaint(part.paint, ids) || tone.dark
        if (part.w != null) {
          return h('path', {
            key: 'p' + i,
            d: part.d,
            fill: 'none',
            stroke: paint,
            strokeWidth: part.w,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          })
        }
        return h('path', { key: 'p' + i, d: part.d, fill: paint })
      })
    }

    /* 小档的内缘反光：同一条轮廓再描一遍，只留一点点亮边 */
    function clayRim(parts, tone, ids) {
      return parts.map(function (part, i) {
        if (part.paint !== PAINT.body) return null
        return h('path', {
          key: 'r' + i,
          d: part.d,
          fill: 'none',
          stroke: tone.light,
          strokeWidth: part.w != null ? part.w + 2 : 2.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        })
      })
    }

    /* 轮廓（白色）——只给大档的 mask 用 */
    function claySilhouette(parts) {
      return parts.map(function (part, i) {
        if (part.w != null) {
          return h('path', {
            key: 's' + i,
            d: part.d,
            fill: 'none',
            stroke: '#ffffff',
            strokeWidth: part.w,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          })
        }
        return h('path', { key: 's' + i, d: part.d, fill: '#ffffff' })
      })
    }

    function claySvg(parts, tone, ids, size, big, accentOpacity) {
      var layers = [
        // 贴地投影：小档不要模糊滤镜，一条实心椭圆就够
        h('ellipse', {
          key: 'sh',
          cx: '64',
          cy: '114',
          rx: '36',
          ry: '8',
          fill: tone.dark,
          opacity: big ? '0.25' : '0.2',
          filter: big ? 'url(#' + ids.blur + ')' : null,
        }),
        h('g', { key: 'body' }, clayParts(parts, tone, ids)),
      ]

      if (big) {
        layers.push(h(
          'g',
          { key: 'vol', mask: 'url(#' + ids.mask + ')' },
          h('g', { opacity: '0.38', transform: 'translate(0 6)' }, clayParts(parts, tone, ids)),
          h('g', { opacity: '0.45' }, clayRim(parts, tone, ids)),
          h('ellipse', { cx: '42', cy: '34', rx: '27', ry: '21', fill: 'url(#' + ids.shine + ')' }),
        ))
      } else {
        layers.push(h('g', { key: 'rim', opacity: '0.3' }, clayRim(parts, tone, ids)))
      }

      return h(
        'svg',
        {
          viewBox: '0 0 128 128',
          width: size,
          height: size,
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block', pointerEvents: 'none' },
        },
        clayDefs(tone, ids, big, big ? claySilhouette(parts) : null),
        layers,
      )
    }

    /* ── 会话：CLAY 里的一件物体（主体 + 可选奶油白配片） ── */
    function sessionParts(kind) {
      var spec = CLAY[kind] || CLAY.generic
      var parts = []
      for (var i = 0; i < spec.parts.length; i++) {
        parts.push({ d: spec.parts[i].d, w: spec.parts[i].w, paint: PAINT.body })
      }
      if (spec.accent) {
        for (var j = 0; j < spec.accent.length; j++) {
          parts.push({ d: spec.accent[j].d, w: spec.accent[j].w, paint: PAINT.cream })
        }
      }
      return parts
    }

    function sessionTone(kind) {
      var spec = CLAY[kind] || CLAY.generic
      return CLAY_FAMILY[spec.fam] || CLAY_FAMILY.neutral
    }

/* ══════════════════════════ 16px 专用字形 ══════════════════════════
       侧栏行里只有 16px，128 画布的黏土物体缩到这里会糊成一块色点。所以 ≤20px 换成
       一套单独画的粗线字形：2–4 段路径、笔画 2.2、圆头圆角、占满 2–14 的 86% 画布。
       颜色用该 kind 落到的色系主色（明度居中，深浅主题都看得清）。
       面板里（≥21px）仍然渲染完整黏土物体。 */

    var SMALL_STROKE = 2.2

    var SMALL = {
      code: [{ d: 'M6.2 4.2 2.8 8l3.4 3.8' }, { d: 'M9.8 4.2 13.2 8l-3.4 3.8' }],
      deploy: [
        { d: 'M8 1.8c1.9 1.3 2.9 3.3 2.9 5.4v3.2c0 .7-.5 1.1-1.1 1.1H6.2c-.6 0-1.1-.4-1.1-1.1V7.2c0-2.1 1-4.1 2.9-5.4z' },
        { d: 'M8 6a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 1 0 8 6z', w: 1.5 },
      ],
      test: [
        { d: 'M6.3 2.4h3.4v3.1l2.3 5c.4.9-.2 1.9-1.2 1.9H5.2c-1 0-1.6-1-1.2-1.9l2.3-5z' },
        { d: 'M6.1 9.9 7.5 11.3 10.4 8.2' },
      ],
      ai: [{ d: 'M8 1.6l1.5 4.2 4.2 1.5-4.2 1.5L8 13l-1.5-4.2L2.3 7.3l4.2-1.5z', fill: true }],
      biz: [
        { d: 'M3.4 6.2h9.2c1 0 1.8.8 1.8 1.8v4.6c0 1-.8 1.8-1.8 1.8H3.4c-1 0-1.8-.8-1.8-1.8V8c0-1 .8-1.8 1.8-1.8z' },
        { d: 'M6 6.2V4.9c0-.9.7-1.6 1.6-1.6h.8c.9 0 1.6.7 1.6 1.6v1.3' },
      ],
      search: [
        { d: 'M7.1 2.3a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 1 0 0-9.6z' },
        { d: 'M10.7 10.7 13.7 13.7' },
      ],
      sync: [
        { d: 'M12.8 7.4A5 5 0 0 0 4.4 4.7' },
        { d: 'M11.7 2.1l1.2 3.4-3.4 1.1' },
        { d: 'M3.2 8.6a5 5 0 0 0 8.4 2.7' },
        { d: 'M4.3 13.9 3.1 10.5l3.4-1.1' },
      ],
      design: [
        { d: 'M8 2.1a5.9 5.9 0 1 0 0 11.8A5.9 5.9 0 1 0 8 2.1z' },
        { d: 'M5.7 6.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 1 0 0-2.2z', fill: true },
        { d: 'M8 4.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 1 0 0-2.2z', fill: true },
        { d: 'M10.3 6.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 1 0 0-2.2z', fill: true },
      ],
      api: [
        { d: 'M5.7 4.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 1 0 0-6.8z' },
        { d: 'M10.3 4.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 1 0 0-6.8z' },
      ],
      plan: [
        { d: 'M3.5 3.4h9c.9 0 1.6.7 1.6 1.6v7.6c0 .9-.7 1.6-1.6 1.6h-9c-.9 0-1.6-.7-1.6-1.6V5c0-.9.7-1.6 1.6-1.6z' },
        { d: 'M5.4 8.6 6.8 10 9.6 6.7' },
      ],
      paper: [
        { d: 'M2.6 4.3c1.9-.9 3.7-.9 5.4.2v7.3c-1.7-1.1-3.5-1.1-5.4-.2z' },
        { d: 'M13.4 4.3c-1.9-.9-3.7-.9-5.4.2v7.3c1.7-1.1 3.5-1.1 5.4-.2z' },
      ],
      game: [
        { d: 'M5.9 5.4h4.2c1.7 0 3.1 1.5 3.1 3.2 0 1.7-1 3-2.4 3-1 0-1.5-.7-2-1.4H6.3c-.5.7-1 1.4-2 1.4-1.4 0-2.4-1.3-2.4-3 0-1.7 1.4-3.2 3-3.2z' },
        { d: 'M5.2 7.4v2.2M4.1 8.5h2.2', w: 1.6 },
        { d: 'M10.9 8.4a.8.8 0 1 0 0 1.6.8.8 0 1 0 0-1.6z', fill: true },
      ],
      docs: [
        { d: 'M4.5 2.4h4.4l3.1 3.1v8.1c0 .6-.5 1.1-1.1 1.1H4.5c-.6 0-1.1-.5-1.1-1.1V3.5c0-.6.5-1.1 1.1-1.1z' },
        { d: 'M8.9 2.4v3.2h3.1', w: 1.6 },
      ],
      bug: [
        { d: 'M8 5.3c2 0 3.7 1.6 3.7 3.6S10 12.9 8 12.9 4.3 11.1 4.3 8.9 6 5.3 8 5.3z', fill: true },
        { d: 'M8 5.3V9.4', w: 1.4 },
        { d: 'M8 5.3a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 1 1 0 3.4z', fill: true },
      ],
      data: [
        { d: 'M3.1 9.2h2.7v4.4H3.1z', fill: true },
        { d: 'M6.7 6h2.7v7.6H6.7z', fill: true },
        { d: 'M10.3 3.2h2.7v10.4h-2.7z', fill: true },
      ],
      media: [{ d: 'M5.3 3.1 13 8l-7.7 4.9z', fill: true }],
      infra: [
        { d: 'M2.3 3.4h11.4v2.4H2.3z', fill: true },
        { d: 'M2.3 6.8h11.4v2.4H2.3z', fill: true },
        { d: 'M2.3 10.2h11.4v2.4H2.3z', fill: true },
      ],
      perf: [
        { d: 'M2.6 11.8a5.4 5.4 0 0 1 10.8 0' },
        { d: 'M8 11.8 11.1 7.6' },
        { d: 'M8 10.8a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 1 0 0-2.2z', fill: true },
      ],
      security: [
        { d: 'M8 1.8c.6 0 5 2.4 5 2.4v4.2c0 3-2.4 5.2-5 6.2-2.6-1-5-3.2-5-6.2V4.2s4.4-2.4 5-2.4z' },
        { d: 'M8 6.5a1.4 1.4 0 0 1 .7 2.6v2.3H7.3V9.1A1.4 1.4 0 0 1 8 6.5z', fill: true },
      ],
      blog: [
        { d: 'M3.9 2.6h6.2c.6 0 1.1.5 1.1 1.1v9.1c0 .6-.5 1.1-1.1 1.1H3.9c-.6 0-1.1-.5-1.1-1.1V3.7c0-.6.5-1.1 1.1-1.1z' },
        { d: 'M9.6 2.4 13 5.6' },
        { d: 'M5.6 10.6 11 5.2', w: 1.8 },
      ],
      git: [
        { d: 'M5.2 4v8.4' },
        { d: 'M5.2 7c0 1.9 1.3 3 3.1 3' },
        { d: 'M5.2 2.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2z', fill: true },
        { d: 'M5.2 11.8a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2z', fill: true },
        { d: 'M10.8 8.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2z', fill: true },
      ],
      web: [
        { d: 'M8 2.2a5.8 5.8 0 1 0 0 11.6A5.8 5.8 0 1 0 8 2.2z' },
        { d: 'M8 2.2c-2.4 1.6-3.6 3.6-3.6 5.8S5.6 12.2 8 13.8', w: 1.6 },
        { d: 'M2.4 8h11.2', w: 1.6 },
      ],
      lab: [
        { d: 'M6.2 2.4h3.6v3.4l2.2 4.7c.4.9-.2 1.9-1.2 1.9H5.2c-1 0-1.6-1-1.2-1.9l2.2-4.7z' },
        { d: 'M4.4 10.2h7.2c.4.6.5 1.1.4 1.6H4c-.1-.5 0-1 .4-1.6z', fill: true },
      ],
      mobile: [
        { d: 'M5.5 2.2h5c1 0 1.7.7 1.7 1.7v8.2c0 1-.7 1.7-1.7 1.7h-5c-1 0-1.7-.7-1.7-1.7V3.9c0-1 .7-1.7 1.7-1.7z' },
        { d: 'M7.2 11.5h1.6', w: 1.6 },
      ],
      note: [
        { d: 'M3.1 3.1h6.5l3.3 3.3v6.5H3.1z' },
        { d: 'M9.6 3.1v3.3h3.3', w: 1.6 },
        { d: 'M5.3 8.9h5.4', w: 1.6 },
      ],
      terminal: [
        { d: 'M2.9 3.6h10.2c1 0 1.7.7 1.7 1.7v5.4c0 1-.7 1.7-1.7 1.7H2.9c-1 0-1.7-.7-1.7-1.7V5.3c0-1 .7-1.7 1.7-1.7z' },
        { d: 'M4.8 6.6 6.8 8.4 4.8 10.2' },
        { d: 'M8.4 10.2h2.8' },
      ],
      chat: [
        { d: 'M8 2.5c3.2 0 5.7 1.9 5.7 4.4S11.2 11.3 8 11.3c-.8 0-1.6-.1-2.3-.4L2.9 12.6l.8-2.5c-1-1-1.5-2.1-1.5-3.2 0-2.5 2.5-4.4 5.8-4.4z' },
        { d: 'M5.9 6.9h.1M8 6.9h.1M10.1 6.9h.1', w: 1.8 },
      ],
      generic: [
        { d: 'M4.2 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 1 0 0-4.4z', fill: true },
        { d: 'M8 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 1 0 0-4.4z', fill: true },
        { d: 'M11.8 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 1 0 0-4.4z', fill: true },
      ],
    }

    function smallSessionIcon(kind, size) {
      var spec = SMALL[kind] || SMALL.generic
      var fam = sessionTone(kind)
      var px = size || 16
      var key = 'small:' + kind + '@' + px
      if (renderCache[key]) return renderCache[key]
      var node = h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: px,
          height: px,
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block', pointerEvents: 'none' },
        },
        spec.map(function (part, i) {
          if (part.fill) {
            return h('path', { key: 'p' + i, d: part.d, fill: fam.main })
          }
          return h('path', {
            key: 'p' + i,
            d: part.d,
            fill: 'none',
            stroke: fam.main,
            strokeWidth: part.w || SMALL_STROKE,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          })
        }),
      )
      renderCache[key] = node
      return node
    }

    var SHORT_SIDE = 20

    function sessionIcon(kind, size) {
      var px = size || 16
      /* ≤20px 走 16 画布的粗线字形（纯路径、没有 id，可以安全缓存） */
      if (px <= SHORT_SIDE) return smallSessionIcon(kind, px)
      /* 黏土物体带 <defs> id，不缓存：每个实例各自一组 id */
      return claySvg(sessionParts(kind), sessionTone(kind), clayIds('s-' + kind), px, true)
    }

/* ══════════════════════════ 项目：黏土文件夹 ══════════════════════════
       和会话同一套材质与光影，形状换成文件夹：大圆角本体 + 左上标签页，里面一张
       奶油白的纸，展开时前面压一片「翻板」。色相仍按 kind 走（21 种）。

       几何只写一份（CLAY_FOLDER + folderParts），DOM 版和 React 版都从它取；
       以前两版各写一遍光影参数，改一处漏一处。 */

    function clayTone(kind) {
      var base = BASE[kind] || BASE.generic
      return { main: base, light: toneAt(base, 70, 62), dark: toneAt(base, 42, 78) }
    }

    var CLAY_FOLDER = {
      body: 'M18 104V47c0-12 8-21 19-21h19c7 0 13 4 16 10l4 7h20c11 0 18 9 18 20v41c0 12-7 21-18 21H36c-11 0-18-9-18-21z',
      page: 'M42 60h50c7 0 12 5 12 12v20c0 7-5 12-12 12H42z',
      flap: 'M18 80h94v24c0 12-7 21-18 21H36c-11 0-18-9-18-21z',
    }

    /* 一份几何：展开时本体压暗、前面盖一片翻板 */
    function folderParts(open) {
      var parts = [{ d: CLAY_FOLDER.body, paint: open ? PAINT.dark : PAINT.body }]
      parts.push({ d: CLAY_FOLDER.page, paint: PAINT.cream })
      if (open) parts.push({ d: CLAY_FOLDER.flap, paint: PAINT.body })
      return parts
    }

    /* React 版（选图面板里 30/34px 预览） */
    function folderIconReact(kind, size) {
      var px = size || 30
      return claySvg(folderParts(false), clayTone(kind), clayIds('f-' + kind), px, px > SHORT_SIDE)
    }

    /* DOM 版（项目行是别的包渲染的，只能自己插节点；这里只用于 16px 行内，
       所以固定走简化档） */
    function buildFolderNode(kind, open) {
      var tone = clayTone(kind)
      var ids = clayIds('f-' + kind + (open ? '-open' : ''))
      var big = false

      function el(name, attrs) {
        var node = document.createElementNS(SVG_NS, name)
        for (var key in attrs) {
          var value = attrs[key]
          if (value != null) node.setAttribute(key, value)
        }
        return node
      }

      function appendParts(parent, parts, strokeMode) {
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i]
          var paint = clayPaint(part.paint, ids) || tone.dark
          if (part.w != null) {
            parent.appendChild(el('path', {
              d: part.d, fill: 'none', stroke: paint, 'stroke-width': part.w,
              'stroke-linecap': 'round', 'stroke-linejoin': 'round',
            }))
          } else {
            parent.appendChild(el('path', { d: part.d, fill: strokeMode ? 'none' : paint }))
          }
        }
      }

      function appendRim(parent, parts, opacity) {
        var g = el('g', { opacity: opacity })
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i]
          if (part.paint !== PAINT.body) continue
          g.appendChild(el('path', {
            d: part.d,
            fill: 'none',
            stroke: tone.light,
            'stroke-width': part.w != null ? part.w + 2 : 2.4,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          }))
        }
        parent.appendChild(g)
      }

      var parts = folderParts(open)
      var svg = el('svg', { viewBox: '0 0 128 128', width: '16', height: '16', 'aria-hidden': 'true', focusable: 'false' })
      svg.setAttribute(MARK_ATTR, kind + (open ? '-open' : '-closed'))
      svg.style.display = 'block'
      svg.style.pointerEvents = 'none'

      var defs = el('defs', {})
      var g1 = el('linearGradient', { id: ids.body, gradientUnits: 'userSpaceOnUse', x1: '26', y1: '18', x2: '104', y2: '112' })
      g1.appendChild(el('stop', { offset: '0', 'stop-color': tone.light }))
      g1.appendChild(el('stop', { offset: '0.35', 'stop-color': tone.main }))
      g1.appendChild(el('stop', { offset: '1', 'stop-color': tone.dark }))
      defs.appendChild(g1)

      var g2 = el('linearGradient', { id: ids.cream, gradientUnits: 'userSpaceOnUse', x1: '26', y1: '18', x2: '104', y2: '112' })
      g2.appendChild(el('stop', { offset: '0', 'stop-color': '#FFFDF8' }))
      g2.appendChild(el('stop', { offset: '1', 'stop-color': '#EFE7D6' }))
      defs.appendChild(g2)
      svg.appendChild(defs)

      svg.appendChild(el('ellipse', { cx: '64', cy: '114', rx: '36', ry: '8', fill: tone.dark, opacity: '0.2' }))
      appendParts(svg, parts, false)
      appendRim(svg, parts, '0.3')
      return svg
    }

    /* ══════════════════════════ 分类 ══════════════════════════ */

    function escapeRe(text) {
      return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    /* 规则是常量，正则也只在第一次用到时建一次 */
    var wordReCache = {}

    function wordRe(pattern) {
      var cached = wordReCache[pattern]
      if (cached) return cached
      var re = new RegExp('(?:^|[^a-z0-9])' + escapeRe(pattern) + '(?:[^a-z0-9]|$)')
      wordReCache[pattern] = re
      return re
    }

    function hits(text, pattern) {
      if (!pattern) return false
      if (/^[a-z0-9+#._-]{1,4}$/.test(pattern)) return wordRe(pattern).test(text)
      return text.indexOf(pattern) !== -1
    }

    function firstKind(text, rules, fallback) {
      for (var i = 0; i < rules.length; i++) {
        var words = rules[i][1]
        for (var j = 0; j < words.length; j++) {
          if (hits(text, words[j])) return rules[i][0]
        }
      }
      return fallback
    }

    var SESSION_RULES = [
      ['bug', ['bug', 'debug', '报错', '错误', '异常', '修复', 'fix', 'crash', 'error', 'traceback', '排查', '排错', '故障', '失败', '不工作']],
      ['paper', ['学习', '教程', '入门', '课程', '考试', '论文', 'paper', '研究', 'thesis', 'study', '复习', '读书', 'learn', '知识点']],
      ['test', ['test', '测试', 'spec', '用例', '回归', '验证', 'qa', '覆盖率']],
      ['data', ['数据', '分析', 'sql', 'chart', '图表', '统计', '报表', 'excel', 'csv', '指标', 'dataset', 'dashboard']],
      ['design', ['设计', '美化', '主题', 'theme', '图标', 'icon', '配色', '样式', '排版', '布局', 'ui', 'ux', '动效', '字体']],
      ['ai', ['模型', 'prompt', '提示词', 'llm', 'agent', '智能', '推理', '微调', 'embedding', 'rag', 'token']],
      ['web', ['web', '前端', '页面', '网站', 'css', 'html', 'react', 'vue', '浏览器', 'browser', 'dom', '路由']],
      ['terminal', ['终端', 'shell', 'bash', '命令行', 'cli', '脚本', 'script', 'powershell', '终端命令']],
      ['api', ['api', '接口', '后端', '服务端', 'server', 'backend', 'endpoint', '微服务', 'grpc']],
      ['infra', ['运维', '服务器', 'docker', 'k8s', 'nginx', '集群', '环境配置', '线上环境', '网络', '部署环境']],
      ['media', ['图片', '图像', '视频', '音频', '剪辑', '配音', '字幕', 'photo', 'video', '素材', '海报', '封面', 'ocr']],
      ['game', ['游戏', 'game', 'unity', 'godot', '像素', '关卡', '玩法']],
      ['biz', ['商业', '财务', '记账', '营销', '运营', '电商', '订单', '收入', '定价', '成本', '报表口径']],
      ['blog', ['博客', 'blog', '公众号', '图文', '推文', '发布文章', '专栏']],
      ['chat', ['讨论', '聊聊', '咨询', '建议', '评估', '对比', '选型', '怎么看', '为什么', '值得']],
      ['search', ['搜索', '调研', '查找', '资料', '检索', '搜集', '查找一下', '找一下']],
      ['git', ['git', 'commit', '分支', 'branch', 'merge', 'rebase', '合并', '版本控制', '回滚', '冲突']],
      ['security', ['安全', '密钥', '权限', '漏洞', '加密', 'auth', '鉴权', '敏感', '隐私', '越权']],
      ['perf', ['性能', '加速', '内存', '卡顿', '缓存', '调优', 'benchmark', '耗时', '优化速度']],
      ['lab', ['lab', '原型', 'prototype', '沙盒', 'sandbox', 'demo', '试验', 'playground', '试玩']],
      ['note', ['灵感', '备忘', '随手记', '想法', '速记', 'memo', 'idea']],
      ['sync', ['同步', '备份', '迁移', '导入', '导出', 'backup', 'sync', 'migrate', '还原']],
      ['mobile', ['mobile', '安卓', 'android', 'ios', '小程序', '鸿蒙', 'flutter', 'uniapp', '快应用']],
      ['plan', ['计划', '规划', '待办', 'todo', '路线', 'roadmap', '架构', 'architecture', '方案', '拆解', '排期', '里程碑']],
      ['docs', ['文档', 'doc', 'readme', '说明', '总结', '文章', '写作', 'write', '草稿', 'markdown', '日报', '周报', '翻译']],
      ['deploy', ['部署', '发布', 'release', 'deploy', '构建', 'build', '打包', 'publish', '上线', '安装']],
      ['code', ['代码', '实现', '插件', 'plugin', '函数', '重构', 'refactor', 'sdk', '组件', 'component', '编程', 'code', '项目']],
    ]

    var PROJECT_RULES = [
      ['paper', ['paper', '论文', '研究', 'research', 'thesis', 'course', '课程', '作业', 'homework', '考试', 'exam', 'school', '大学', 'learn', '学习', 'study', 'english', '单词']],
      ['test', ['test', 'tests', 'qa', '测试', '用例', 'e2e']],
      ['data', ['data', 'db', 'sql', '分析', '统计', 'dataset', 'csv', 'report']],
      ['design', ['design', 'theme', '图标', '主题', 'style', '美化', 'ui', 'ux', 'css', '样式', '视觉']],
      ['web', ['web', 'site', '前端', 'html', 'react', 'vue', 'app', '网站', 'page']],
      ['ai', ['ai', 'llm', 'gpt', 'model', 'agent', '智能', '模型', 'prompt']],
      ['api', ['api', '接口', '后端', '服务端', 'server', 'backend', '微服务', 'grpc']],
      ['infra', ['infra', '运维', '服务器', 'docker', 'k8s', 'nginx', '集群', '环境', '网络', 'deploy-env']],
      ['media', ['media', '图片', '图像', '视频', '音频', '剪辑', '素材', '海报', '封面', 'photo', 'video', 'asset']],
      ['game', ['game', '游戏', 'unity', 'godot', '像素', '关卡']],
      ['biz', ['biz', '商业', '财务', '记账', '营销', '运营', '电商', '店铺', '订单', '收入']],
      ['blog', ['blog', '博客', '公众号', '专栏', '推文', 'post']],
      ['security', ['security', '安全', '密钥', '权限', '漏洞', '加密', 'auth', '鉴权', '隐私']],
      ['mobile', ['mobile', '安卓', 'android', 'ios', '小程序', '鸿蒙', 'flutter', 'uniapp']],
      ['lab', ['lab', '原型', 'prototype', '沙盒', 'sandbox', 'demo', '试验', 'playground']],
      ['tool', ['tool', 'tools', '工具', 'auto', 'bot', 'script', '脚本', 'mcp', 'cli', 'dev']],
      ['docs', ['doc', 'docs', 'note', '笔记', 'readme', 'wiki', '文档']],
      ['code', ['code', 'src', 'sdk', 'plugin', '插件', 'build', 'fix', 'proj', '工程', 'dsh', 'harness', 'editor', 'core']],
      ['deploy', ['deploy', 'release', '发布', '上线', '部署', 'publish', '发版']],
    ]

    /* 项目可用色调（21 种；顺序即「撞色时往前挪」的色相环） */
    var PROJECT_KINDS = [
      'code', 'deploy', 'test', 'paper', 'biz', 'docs', 'bug', 'game', 'ai',
      'plan', 'web', 'media', 'tool', 'infra', 'mobile', 'data', 'security',
      'design', 'api', 'blog', 'generic',
    ]
    /* 会话可用图标（28 种） */
    var SESSION_KINDS = [
      'code', 'deploy', 'test', 'ai', 'biz', 'search', 'sync', 'design', 'api',
      'plan', 'paper', 'game', 'docs', 'bug', 'data', 'media', 'infra', 'perf',
      'security', 'blog', 'git', 'web', 'lab', 'mobile', 'note', 'terminal',
      'chat', 'generic',
    ]

    function sessionKindOf(summary) {
      if (!summary) return 'generic'
      var title = summary.displayTitle || summary.title || ''
      if (title) return firstKind(String(title).toLowerCase(), SESSION_RULES, 'code')
      var base = String(summary.cwd || '').split(/[\\/]/).filter(Boolean).pop() || ''
      return base ? firstKind(base.toLowerCase(), PROJECT_RULES, 'generic') : 'generic'
    }

    function projectKindOf(label) {
      return firstKind(String(label || '').toLowerCase(), PROJECT_RULES, 'generic')
    }

    function bumpKind(kind) {
      var i = PROJECT_KINDS.indexOf(kind)
      if (i < 0) return kind
      return PROJECT_KINDS[(i + 1) % PROJECT_KINDS.length]
    }

    /* 与上一行「颜色」比较（不是 kind），plan/tool 这类共享基色的也算撞色 */
    function avoidPrevColor(kind, prevKind) {
      if (!prevKind) return kind
      var prevHex = BASE[prevKind] || BASE.generic
      var next = kind
      for (var step = 0; step < PROJECT_KINDS.length; step++) {
        if ((BASE[next] || BASE.generic) !== prevHex) return next
        next = bumpKind(next)
        if (next === kind) return kind
      }
      return kind
    }

    /* ══════════════════════════ 自定义存储 ══════════════════════════ */

    function readStore() {
      try {
        var raw = window.localStorage.getItem(STORE_KEY)
        if (!raw) return { sessions: {}, workspaces: {} }
        var data = JSON.parse(raw)
        return {
          sessions: (data && data.sessions) || {},
          workspaces: (data && data.workspaces) || {},
        }
      } catch (error) {
        return { sessions: {}, workspaces: {} }
      }
    }

    var store = {
      data: readStore(),
      dialog: null,
      revision: 0,
      listeners: [],
      subscribe: function (listener) {
        store.listeners.push(listener)
        return function () {
          var i = store.listeners.indexOf(listener)
          if (i >= 0) store.listeners.splice(i, 1)
        }
      },
      publish: function () {
        store.revision += 1
        for (var i = 0; i < store.listeners.length; i++) {
          try {
            store.listeners[i]()
          } catch (error) {
            /* 单个订阅者出错不影响其它 */
          }
        }
      },
      override: function (type, id) {
        if (!id) return undefined
        var table = type === 'session' ? store.data.sessions : store.data.workspaces
        return table[id]
      },
      setOverride: function (type, id, kind) {
        if (!id) return
        var table = type === 'session' ? store.data.sessions : store.data.workspaces
        if (kind) table[id] = kind
        else delete table[id]
        try {
          window.localStorage.setItem(STORE_KEY, JSON.stringify(store.data))
        } catch (error) {
          /* 存不下只影响记忆，不影响本次渲染 */
        }
        store.publish()
      },
      open: function (dialog) {
        store.dialog = dialog
        store.publish()
      },
      close: function () {
        store.dialog = null
        store.publish()
      },
      /* 项目被删掉之后，它的覆盖项会一直留在 localStorage 里。项目行是「每个项目
         一直存在」，所以可以安全地按「现在还存在的 workspace id」清理。
         会话不能这么清：列表只渲染一部分，缺席不等于不存在。 */
      pruneWorkspaces: function (liveIds) {
        var table = store.data.workspaces
        var removed = false
        for (var id in table) {
          if (!Object.prototype.hasOwnProperty.call(table, id)) continue
          if (!liveIds[id]) {
            delete table[id]
            removed = true
          }
        }
        if (!removed) return
        try {
          window.localStorage.setItem(STORE_KEY, JSON.stringify(store.data))
        } catch (error) {
          /* 存不下只影响记忆 */
        }
        store.publish()
      },
      /* 别的窗口改了覆盖项 → 跟着刷新 */
      reload: function () {
        store.data = readStore()
        store.publish()
      },
    }

    /* 装饰层需要知道「覆盖项变了，重扫一次」 */
    var requestScan = null

    function useStoreRevision() {
      var pair = React.useState(store.revision)
      React.useEffect(function () {
        return store.subscribe(function () {
          pair[1](store.revision)
        })
      }, [])
      return pair[0]
    }

    /* ══════════════════════════ 文案 ══════════════════════════ */

    var WORDS = {
      /* 选图面板整体走英文（标题、完成、恢复默认、关闭），跟面板里的英文图标名一致；
         只有菜单里那一行保持在界面语言里。 */
      zh: {
        customIcon: '自定义图标…',
        sessionTitle: 'Session icon',
        projectTitle: 'Project icon',
        cancel: 'Close',
        done: 'Done',
        reset: 'Use default',
      },
      en: {
        customIcon: 'Custom icon…',
        sessionTitle: 'Session icon',
        projectTitle: 'Project icon',
        cancel: 'Close',
        done: 'Done',
        reset: 'Use default',
      },
    }

    var KIND_LABELS = {
      code: ['代码', 'Code'],
      bug: ['修复', 'Bug'],
      test: ['测试', 'Test'],
      docs: ['文档', 'Docs'],
      data: ['数据', 'Data'],
      web: ['前端', 'Web'],
      api: ['接口', 'API'],
      infra: ['运维', 'Infra'],
      terminal: ['终端', 'Terminal'],
      ai: ['AI', 'AI'],
      design: ['设计', 'Design'],
      plan: ['计划', 'Plan'],
      paper: ['学习', 'Study'],
      blog: ['博客', 'Blog'],
      media: ['媒体', 'Media'],
      game: ['游戏', 'Game'],
      biz: ['商业', 'Business'],
      chat: ['讨论', 'Chat'],
      search: ['调研', 'Research'],
      git: ['版本', 'Git'],
      security: ['安全', 'Security'],
      perf: ['性能', 'Perf'],
      lab: ['实验', 'Lab'],
      note: ['灵感', 'Note'],
      sync: ['同步', 'Sync'],
      mobile: ['移动', 'Mobile'],
      deploy: ['发布', 'Deploy'],
      tool: ['工具', 'Tool'],
      generic: ['其它', 'Other'],
    }

    var translate = null
    var translateFallback = function (key) {
      var zh = typeof document !== 'undefined' && /^zh/i.test(document.documentElement.lang || '')
      return WORDS[zh ? 'zh' : 'en'][key] || WORDS.zh[key] || key
    }

    function t(key) {
      if (translate) {
        try {
          var value = translate(key)
          if (value && value !== key) return value
        } catch (error) {
          /* 掉回内置文案 */
        }
      }
      return translateFallback(key)
    }

    /* 面板里的标签统一用英文（用户要求），中文只在 aria/内部提示里用 */
    function kindLabelEN(kind) {
      var pair = KIND_LABELS[kind] || [kind, kind]
      return pair[1] || kind
    }


    /* ══════════════════════════ 会话行图标（插槽） ══════════════════════════ */

    function SessionIcon(props) {
      var sessionId = props.sessionId
      var useSessions = props.useSessions
      useStoreRevision()
      var summary = typeof useSessions === 'function'
        ? useSessions(function (state) { return state.byId[sessionId] })
        : undefined
      var custom = store.override('session', sessionId)
      var kind = custom || sessionKindOf(summary)
      return h(
        'span',
        {
          'data-dsi-icon': kind,
          'aria-hidden': 'true',
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            flex: 'none',
            pointerEvents: 'none',
          },
        },
        sessionIcon(kind, 16),
      )
    }

    /* ══════════════════════════ 选图面板（玻璃浮层） ══════════════════════════ */

    function OptionTile(props) {
      var option = props.option
      var selected = props.selected
      var onPick = props.onPick
      var labelled = option.showLabel !== false
      // 会话用 CLAY 的色系；项目用该 kind 自己的色相（文件夹没有 CLAY 条目）。
      // 注意不能写 CLAY[kind] || CLAY.other —— other 已改名为 generic，取不到会直接抛错。
      var accent = option.session
        ? (CLAY_FAMILY[(CLAY[option.kind] || CLAY.generic).fam] || CLAY_FAMILY.neutral).main
        : clayTone(option.kind).main
      return h(
        'button',
        {
          type: 'button',
          className: 'dsi-tile' + (selected ? ' dsi-tile-on' : '') + (labelled ? '' : ' dsi-tile-plain'),
          onClick: onPick,
          'aria-pressed': selected ? 'true' : 'false',
          'aria-label': option.label,
          title: option.label,
          style: { '--clay-accent': accent },
        },
        h('span', { className: 'dsi-tile-art' }, option.art(labelled ? 30 : 34)),
        labelled ? h('span', { className: 'dsi-tile-label' }, option.label) : null,
      )
    }

    function PickerDialog(props) {
      useStoreRevision()
      var dialog = store.dialog
      var panelRef = React.useRef(null)
      var useSessions = props && props.useSessions
      var sessionId = dialog && dialog.type === 'session' ? dialog.id : undefined
      // 钩子必须在提前返回之前调用：选择器在没有会话时返回 undefined
      var summary = typeof useSessions === 'function'
        ? useSessions(function (state) {
          return sessionId ? state.byId[sessionId] : undefined
        })
        : undefined

      React.useEffect(function () {
        if (!dialog) return undefined

        /* 关掉面板后把焦点还给「打开它的那个菜单项/按钮」，否则焦点会掉到 body 上 */
        var opener = typeof document !== 'undefined' ? document.activeElement : null

        function ring() {
          var host = panelRef.current
          if (!host) return []
          return Array.prototype.slice.call(
            host.querySelectorAll('.dsi-tile, .dsi-close, .dsi-reset, .dsi-ghost'),
          )
        }

        function focusAt(index) {
          var list = ring()
          if (!list.length) return
          var item = list[Math.max(0, Math.min(list.length - 1, index))]
          if (item && typeof item.focus === 'function') item.focus()
        }

        function onKey(event) {
          if (event.key === 'Escape') {
            /* 捕获阶段先截住：别让宿主的 Esc 也一起响应 */
            event.preventDefault()
            event.stopPropagation()
            store.close()
            return
          }

          var list = ring()
          if (!list.length) return
          var activeIndex = list.indexOf(document.activeElement)

          if (event.key === 'Tab') {
            /* 焦点陷阱：Tab 在面板里首尾回环，不会跑到背景的侧栏上 */
            event.preventDefault()
            var step = event.shiftKey ? -1 : 1
            var from = activeIndex < 0 ? (step > 0 ? -1 : 0) : activeIndex
            focusAt((from + step + list.length) % list.length)
            return
          }

          /* 方向键在格子里移动：7 列，所以上下就是 ±7 */
          var next = activeIndex
          if (event.key === 'ArrowRight') next = activeIndex + 1
          else if (event.key === 'ArrowLeft') next = activeIndex - 1
          else if (event.key === 'ArrowDown') next = activeIndex + 7
          else if (event.key === 'ArrowUp') next = activeIndex - 7
          else if (event.key === 'Home') next = 0
          else if (event.key === 'End') next = list.length - 1
          else return
          event.preventDefault()
          focusAt(next)
        }

        window.addEventListener('keydown', onKey, true)

        var focusTimer = setTimeout(function () {
          var host = panelRef.current
          if (!host) return
          var target = host.querySelector('.dsi-tile-on') || host.querySelector('.dsi-tile')
          if (target && typeof target.focus === 'function') target.focus()
        }, 30)

        return function () {
          window.removeEventListener('keydown', onKey, true)
          clearTimeout(focusTimer)
          if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
            try {
              opener.focus()
            } catch (error) {
              /* 焦点回不去就算了 */
            }
          }
        }
      }, [dialog])

      if (!dialog) return null

      var isSession = dialog.type === 'session'
      var kinds = isSession ? SESSION_KINDS : PROJECT_KINDS
      var custom = store.override(dialog.type, dialog.id)
      // 首次打开时选中的是「当前生效的那个图标」：没自定义过就落在按名称匹配出来的那个，
      // 用户一眼就能看到现在是什么，点别的才改。
      var natural = dialog.kind || (isSession ? sessionKindOf(summary) : projectKindOf(dialog.label))
      var current = custom || natural

      // 项目面板 3 行 × 7 列、不显示文字（只留 hover 提示）；会话 4 行 × 7 列、显示英文名
      var options = kinds.map(function (kind) {
        return {
          kind: kind,
          session: isSession,
          label: kindLabelEN(kind),
          showLabel: isSession,
          art: function (size) {
            return isSession ? sessionIcon(kind, size) : folderIconReact(kind, size)
          },
        }
      })

      var pick = function (kind) {
        store.setOverride(dialog.type, dialog.id, kind)
        if (requestScan) requestScan()
        store.close()
      }

      return h(
        'div',
        {
          className: 'dsi-root',
          role: 'presentation',
          onMouseDown: function (event) {
            if (event.target === event.currentTarget) store.close()
          },
        },
        h(
          'div',
          {
            className: 'dsi-panel',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': isSession ? t('sessionTitle') : t('projectTitle'),
            ref: panelRef,
          },
          h(
            'div',
            { className: 'dsi-head' },
            h('span', { className: 'dsi-title' }, isSession ? t('sessionTitle') : t('projectTitle')),
            h('button', {
              type: 'button',
              className: 'dsi-close',
              'aria-label': t('cancel'),
              onClick: function () {
                store.close()
              },
            }, '\u2715'),
          ),
          h(
            'div',
            { className: 'dsi-grid' },
            options.map(function (option) {
              return h(OptionTile, {
                key: option.kind,
                option: option,
                selected: current === option.kind,
                onPick: function () {
                  pick(option.kind)
                },
              })
            }),
          ),
          h(
            'div',
            { className: 'dsi-foot' },
            custom
              ? h('button', {
                type: 'button',
                className: 'dsi-reset',
                onClick: function () {
                  store.setOverride(dialog.type, dialog.id, undefined)
                  if (requestScan) requestScan()
                },
              }, t('reset'))
              : null,
            h('button', {
              type: 'button',
              className: 'dsi-ghost',
              onClick: function () {
                store.close()
              },
            }, t('done')),
          ),
        ),
      )
    }

    /* ══════════════════════════ 项目行装饰 ══════════════════════════ */

    var structureWarned = false

    /* 宿主行结构一变，「按位置取标题」就会静默失效、图标退回官方还没人知道。
       所以取不到时在控制台说一次，并且先试一种结构无关的找法。 */
    function warnStructure() {
      if (structureWarned) return
      structureWarned = true
      try {
        console.warn('[dsh-sidebar-icons] 找不到项目行的标题节点，宿主行结构可能变了：'
          + '文件夹装饰已降级，图标退回官方。请更新插件或反馈。')
      } catch (error) {
        /* 控制台不可用就算了 */
      }
    }

    function rowTitleElement(row) {
      var kids = (row && row.children) || []
      /* 官方当前结构：slot.folder / slot.chevron / projectText>span.title / rowActions */
      var preferred = kids.length > 2 ? kids[2] : null
      var title = preferred && preferred.firstElementChild
      if (title && title.tagName === 'SPAN') return title
      /* 结构变了：退化成「第一个装着带文本 span、又不含按钮的 span」 */
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i]
        if (!el || el.tagName !== 'SPAN') continue
        if (el.querySelector('button')) continue
        var inner = el.firstElementChild
        if (inner && inner.tagName === 'SPAN' && (inner.textContent || '').trim()) return inner
      }
      warnStructure()
      return null
    }

    function workspaceIdOf(row) {
      var key = row.getAttribute(ROW_KEY_ATTR) || ''
      return key.indexOf('workspace:') === 0 ? key.slice('workspace:'.length) : ''
    }

    function decorateRow(row, prevKind) {
      var folder = row.firstElementChild
      var title = rowTitleElement(row)
      if (!folder || !title) return prevKind
      var label = (title.textContent || '').trim()
      if (!label) return prevKind

      var id = workspaceIdOf(row)
      var custom = store.override('workspace', id)
      var kind = custom || avoidPrevColor(projectKindOf(label), prevKind)

      var open = row.getAttribute('aria-expanded') === 'true'
      var stamp = kind + (open ? '/open' : '/closed')
      var mark = folder.querySelector('[' + MARK_ATTR + ']')
      if (row.getAttribute(KIND_ATTR) === stamp && mark !== null) return kind

      var node
      try {
        node = buildFolderNode(kind, open)
      } catch (error) {
        /* 画不出来就把官方图标放回去，别留一个空白格 */
        folder.removeAttribute(FOLDER_ATTR)
        if (mark !== null && mark.parentNode) mark.parentNode.removeChild(mark)
        return kind
      }
      if (mark !== null) mark.parentNode.removeChild(mark)
      folder.appendChild(node)
      folder.setAttribute(FOLDER_ATTR, '')
      row.setAttribute(KIND_ATTR, stamp)
      row.setAttribute(PROJ_ATTR, kind)
      if (!title.hasAttribute(TITLE_ATTR)) title.setAttribute(TITLE_ATTR, '')
      return kind
    }

    function scan() {
      if (typeof document === 'undefined') return
      var scope = document.querySelector('[data-sidebar-list-area]') || document
      var rows = scope.querySelectorAll('[' + ROW_KEY_ATTR + '^="workspace:"]')
      var live = {}
      var prev = null
      for (var i = 0; i < rows.length; i++) {
        try {
          var id = workspaceIdOf(rows[i])
          if (id) live[id] = true
          prev = decorateRow(rows[i], prev)
        } catch (error) {
          /* 单行失败不影响其它行 */
        }
      }
      /* 只有真的画出了项目行时才清孤儿，避免「侧栏还没渲染」时把覆盖项全删了 */
      if (rows.length > 0) store.pruneWorkspaces(live)
    }

    function restore() {
      if (typeof document === 'undefined') return
      var marks = document.querySelectorAll('[' + MARK_ATTR + ']')
      for (var i = 0; i < marks.length; i++) {
        if (marks[i].parentNode) marks[i].parentNode.removeChild(marks[i])
      }
      var tagged = document.querySelectorAll(
        '[' + FOLDER_ATTR + '],[' + TITLE_ATTR + '],[' + PROJ_ATTR + '],[' + KIND_ATTR + ']',
      )
      for (var j = 0; j < tagged.length; j++) {
        tagged[j].removeAttribute(FOLDER_ATTR)
        tagged[j].removeAttribute(TITLE_ATTR)
        tagged[j].removeAttribute(PROJ_ATTR)
        tagged[j].removeAttribute(KIND_ATTR)
      }
    }

    function startDecoration() {
      if (typeof document === 'undefined' || typeof MutationObserver !== 'function') {
        return function () {}
      }
      var AREA = '[data-sidebar-list-area]'
      var timer = 0
      var disposed = false
      var observer = null
      var watched = null
      var probe = 0
      var lastStyleCheck = 0

      function schedule() {
        if (disposed || timer) return
        timer = setTimeout(function () {
          timer = 0
          if (!disposed) scan()
        }, 140)
      }

      function area() {
        try {
          return document.querySelector(AREA)
        } catch (error) {
          return null
        }
      }

      function inArea(node) {
        if (!node) return false
        var el = node.nodeType === 1 ? node : node.parentElement
        if (!el || typeof el.closest !== 'function') return false
        try {
          return el.closest(AREA) !== null
        } catch (error) {
          return false
        }
      }

      /* 只在变更落在侧栏里时才重扫。聊天区流式输出每帧都在改 DOM，
         以前那种监听整个 body 的写法会被它带着跑满扫描。 */
      function onMutations(records) {
        for (var i = 0; i < records.length; i++) {
          var record = records[i]
          if (inArea(record.target)) {
            schedule()
            return
          }
          var added = record.addedNodes
          if (!added) continue
          for (var j = 0; j < added.length; j++) {
            var node = added[j]
            if (inArea(node)) {
              schedule()
              return
            }
            if (node && node.nodeType === 1 && typeof node.matches === 'function' && node.matches(AREA)) {
              schedule()
              return
            }
          }
        }
      }

      function watch() {
        var el = area()
        if (el === watched && observer) return
        if (observer) observer.disconnect()
        watched = el || document.body || document.documentElement
        observer = new MutationObserver(el
          ? onMutations
          : function () {
            /* 侧栏还没挂上：只在它出现那一刻再切换观察目标 */
            if (area()) {
              watch()
              schedule()
            }
          })
        observer.observe(watched, el
          ? {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            /* 只跟展开/折叠；不跟 class，否则鼠标划过每个行都会触发重扫 */
            attributeFilter: ['aria-expanded'],
          }
          : { childList: true, subtree: true })
      }

      requestScan = schedule
      scan()
      watch()

      /* 常驻心跳（800ms，只做几个小查询）：
         ① 侧栏容器被宿主整个换掉时重新挂观察器；
         ② 行被重渲染、我自己的节点被抹掉时补扫一次。
         冷启动时这两件事都会发生，只靠 MutationObserver 会漏。 */
      probe = setInterval(function () {
        if (disposed) {
          clearInterval(probe)
          return
        }
        try {
        /* 宿主的启动流程可能把整片 <head> 换成新的，我们的 <style> 就没了 ——
           这是"重启后样式失效、热重载后正常"的主因。发现没了就补回来；
           但不和宿主抢：最多每 3 秒补一次，且任何异常都吞掉，绝不让心跳把页面搞崩。 */
        var now = Date.now()
        if (now - lastStyleCheck > 3000) {
          lastStyleCheck = now
          try {
            if (!document.querySelector('style[data-plugin-css="' + STYLE_MARKER + '"]')) installStyles()
          } catch (error) {
            /* 拿不到文档就算了 */
          }
        }

        var el = area()
        if (!el) return
        if (el !== watched) {
          watch()
          schedule()
          return
        }
        var rows = el.querySelectorAll('[' + ROW_KEY_ATTR + '^="workspace:"]').length
        var marks = el.querySelectorAll('[' + MARK_ATTR + ']').length
        if (marks < rows) schedule()
        } catch (error) {
          /* 心跳里任何异常都吞掉：它只是兜底，不该影响页面 */
        }
      }, 800)

      return function () {
        disposed = true
        requestScan = null
        if (timer) clearTimeout(timer)
        if (probe) clearInterval(probe)
        if (observer) observer.disconnect()
        restore()
      }
    }

    /* ══════════════════════════ 样式 ══════════════════════════ */

    var CSS = [
      '/* ── 会话行前置图标：整片毛玻璃已经铺满 16 格，不再放大 ── */',
      '[data-dsi-icon] > svg { display: block; }',
      '',
      '/* ── 项目行：官方灰度文件夹隐掉，换成玻璃双色文件夹 ── */',
      /* 只有「我自己的 svg 确实在这一行里」时才隐藏官方文件夹。
         冷启动时宿主会重渲染行，可能抹掉我的节点却留下属性 —— 用 :has() 兜住，
         这种情况自动退回官方图标，而不是留一格空白。 */
      '[' + FOLDER_ATTR + ']:has(> svg[' + MARK_ATTR + ']) > svg:not([' + MARK_ATTR + ']) { display: none; }',
      '[' + FOLDER_ATTR + '] > svg[' + MARK_ATTR + '] { display: block; }',
      '',
      '/* ── 标题层级：项目标题 = 分组标题 ── */',
      /* 同样抬高优先级：宿主 .title 的字重是 (0,1,0)，会盖掉属性选择器 */
      '[' + TITLE_ATTR + '][' + TITLE_ATTR + '] { font-weight: 600; }',

'/* ── 层级：会话行相对所属项目右移一段（只动 session 行的左内距，项目行不动） ──',
      '   宿主本来就用 --dsh-workspace-indent 按嵌套层级加 12px，这里在它的公式后面',
      '   再追加 --dsi-session-indent，所以每一层嵌套仍然是「相对父级 +16」。',
      '   引导线画在行自己的 background-image 上（不能占 ::before/::after —— 那是宿主',
      '   的拖拽插入标记），因此拖拽、hover、选中都不受影响。 */',
      ':root { --dsi-session-indent: 16px; }',
      /* 选择器写成「属性 + 属性」把优先级抬到 (0,2,0)：宿主的 .sessionRow 是 (0,1,0)，
         而本工程的样式表运行时注入，冷启动时可能排在插件样式之后 —— 同优先级会盖掉缩进。
         !important 只作用于这一段 padding，不存在和宿主争样式的合理场景。 */
      '[data-row-key^="session:"][data-row-key] {',
      '  padding-inline-start: calc(',
      '    var(--dsh-sidebar-row-padding, 8px) - var(--dsh-sidebar-paint-inset, 1px)',
      '    + var(--dsh-workspace-indent, 0px) + var(--dsi-session-indent, 16px)',
      '  ) !important;',
      '  --dsi-guide-x: calc(',
      '    var(--dsh-sidebar-row-padding, 8px) - var(--dsh-sidebar-paint-inset, 1px)',
      '    + var(--dsh-workspace-indent, 0px) + 4px',
      '  );',
      '  position: relative;',
      '}',
      '/* 引导线：用 ::before 画在行的定位层里，选中/hover 的行也照样显示',
      '   （拖拽时宿主的 dropBefore::before 优先级更高，会给那一行让位）。 */',
      '[data-row-key^="session:"][data-row-key]::before {',
      '  content: "";',
      '  position: absolute;',
      '  inset-block: 0;',
      '  inset-inline-start: var(--dsi-guide-x);',
      '  width: 1px;',
      '  /* 用行自己的文字色 + 透明度：跟随主题，不依赖 color-mix 或额外的令牌链 */',
      '  background: currentColor;',
      '  opacity: 0.16;',
      '  border-radius: 1px;',
      '  pointer-events: none;',
      '}',
      '',
      '/* ── 收藏星标：整行不再显示（收藏入口在 ⋯ 菜单里）。',
      '   但 archive-manager 仍会给「已收藏」的行打 data-dsham-favorited 并把图标格',
      '   opacity:0，所以下面两条把图标压回不透明的规则必须留着。 */',
      '[data-row-key^="session:"] .dsham_starSlot { display: none !important; }',
      '[data-row-key^="session:"][data-dsham-favorited="true"]:not([data-dsham-has-status="true"])',
      '  > span:first-child:not(:has([data-state])) { opacity: 1 !important; }',
      '[data-row-key^="session:"]:hover > span:first-child:not(:has([data-state])) {',
      '  opacity: 1 !important;',
      '}',

      '/* ── 选图面板：清透玻璃 ── */',
      '.dsi-root {',
      '  position: fixed; inset: 0; z-index: 60; display: flex;',
      '  align-items: center; justify-content: center; padding: 24px;',
      '  background: color-mix(in srgb, #0b0f18 30%, transparent);',
      '  backdrop-filter: blur(3px);',
      '  -webkit-backdrop-filter: blur(3px);',
      '  animation: dsi-fade 140ms ease-out;',
      '}',
      '@keyframes dsi-fade { from { opacity: 0 } to { opacity: 1 } }',
      '.dsi-panel {',
      '  width: min(600px, 100%); max-height: min(86vh, 720px); display: flex; flex-direction: column;',
      '  border-radius: 22px; padding: 18px 18px 14px;',
      '  background: color-mix(in srgb, var(--dsw-alias-bg-overlay) 76%, transparent);',
      '  backdrop-filter: blur(30px) saturate(180%);',
      '  -webkit-backdrop-filter: blur(30px) saturate(180%);',
      '  border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 65%, transparent);',
      '  box-shadow: 0 30px 70px -28px rgba(16, 24, 40, 0.55), 0 2px 8px -2px rgba(16, 24, 40, 0.18),',
      '    inset 0 1px 0 color-mix(in srgb, #ffffff 55%, transparent);',
      '  color: var(--dsw-alias-label-primary);',
      '  animation: dsi-pop 160ms cubic-bezier(0.22, 1, 0.36, 1);',
      '}',
      '@keyframes dsi-pop { from { opacity: 0; transform: translateY(6px) scale(0.985) } to { opacity: 1; transform: none } }',
      '.dsi-head { display: flex; align-items: baseline; gap: 8px; padding: 0 2px 14px; }',
      '.dsi-title { font-size: 15px; font-weight: 600; letter-spacing: 0.01em; }',
      '.dsi-close { margin-left: auto; width: 26px; height: 26px; display: inline-flex; align-items: center;',
      '  justify-content: center; border: none; border-radius: 9px; background: transparent; cursor: pointer;',
      '  color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1; padding: 0; }',
      '.dsi-close:hover { background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 90%, transparent);',
      '  color: var(--dsw-alias-label-primary); }',
      '.dsi-grid { display: grid; gap: 8px; padding: 2px; overflow-y: auto;',
      '  grid-template-columns: repeat(7, minmax(0, 1fr)); align-content: start; }',
      '.dsi-tile { display: flex; flex-direction: column; align-items: center; gap: 10px;',
      '  padding: 10px 6px 8px; border: 2px solid transparent; border-radius: 16px;',
      '  background: var(--dsw-alias-bg-layer-1, #F4F6FB);',
      '  color: var(--dsw-alias-label-primary); cursor: pointer;',
      '  transition: background 140ms ease, border-color 140ms ease; }',
'.dsi-tile:hover { background: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #EEF1F8) 92%, transparent); }',
      '.dsi-tile:hover .dsi-tile-art { transform: translateY(-4px); }',
      '.dsi-tile:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent);',
      '  outline-offset: 2px; }',
      '.dsi-tile-on { border-color: var(--clay-accent, var(--dsw-alias-brand-primary));',
      '  background: color-mix(in srgb, var(--clay-accent, var(--dsw-alias-brand-primary)) 8%, var(--dsw-alias-bg-layer-1, #F4F6FB)); }',
      '.dsi-tile-on .dsi-tile-art { transform: scale(1.08); }',
      '.dsi-tile-on .dsi-tile-label { color: var(--clay-accent, var(--dsw-alias-brand-primary)); }',
      '.dsi-tile-art { display: inline-flex; align-items: center; justify-content: center; height: 26px;',
      '  transition: transform 160ms cubic-bezier(0.34, 1.4, 0.64, 1); }',
      '.dsi-tile-label { font-size: 13px; font-weight: 600; line-height: 1.2; letter-spacing: 0.005em;',
      '  opacity: 0.9; }',
      '.dsi-tile-plain { padding: 9px 4px; }',
      '.dsi-foot { display: flex; align-items: center; gap: 10px; padding: 12px 2px 0; }',
      '.dsi-reset { border: none; background: transparent; padding: 6px 10px; border-radius: 9px; cursor: pointer;',
      '  font-size: 12px; color: var(--dsw-alias-label-secondary); }',
      '.dsi-reset:hover { color: var(--dsw-alias-label-primary);',
      '  background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 90%, transparent); }',
      '.dsi-ghost { margin-left: auto; border: none; background: transparent; color: var(--dsw-alias-label-secondary);',
      '  font-size: 12px; padding: 6px 12px; border-radius: 9px; cursor: pointer; }',
      '.dsi-ghost:hover { background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 90%, transparent);',
      '  color: var(--dsw-alias-label-primary); }',
      '@media (prefers-reduced-motion: reduce) {',
      '  .dsi-root, .dsi-panel { animation: none; }',
      '  .dsi-tile { transition: none; }',
      '}',
    ].join('\n')

    function installStyles() {
      if (typeof document === 'undefined' || !document.head) return null
      var existing = document.querySelector('style[data-plugin-css="' + STYLE_MARKER + '"]')
      if (existing) {
        // 热重载时旧 <style> 可能还在：必须覆盖内容，否则改动看着像没生效
        if (existing.textContent !== CSS) existing.textContent = CSS
        return existing
      }
      var style = document.createElement('style')
      style.setAttribute('data-plugin-css', STYLE_MARKER)
      style.textContent = CSS
      document.head.appendChild(style)
      return style
    }

    /* ══════════════════════════ 接线 ══════════════════════════ */

    /* 反复热重载时，上一份实例的 fiber 不一定已经被销毁：两份装饰同时写同一批行
       会互相覆盖（就是「颜色对不上」那种怪现象）。所以 apply 一开始先主动收掉上一份。 */
    var RUNTIME_KEY = '__dshSidebarIconsRuntime'

    function own(ctx, factory) {
      var dispose = typeof ctx.effect === 'function' ? ctx.effect(factory) : factory()
      try {
        if (typeof window !== 'undefined') {
          var runtime = window[RUNTIME_KEY]
          if (runtime && runtime.active && typeof dispose === 'function') runtime.disposers.push(dispose)
        }
      } catch (error) {
        /* 记不上不影响功能，只是这轮不会被动收尾 */
      }
      return dispose
    }

    function adoptRuntime() {
      try {
        if (typeof window === 'undefined') return
        var previous = window[RUNTIME_KEY]
        if (previous && typeof previous.dispose === 'function') previous.dispose()
        window[RUNTIME_KEY] = {
          active: true,
          disposers: [],
          dispose: function () {
            var runtime = window && window[RUNTIME_KEY]
            if (!runtime || !runtime.active) return
            runtime.active = false
            for (var i = runtime.disposers.length - 1; i >= 0; i--) {
              try {
                runtime.disposers[i]()
              } catch (error) {
                /* 单项收尾失败不影响其它 */
              }
            }
            runtime.disposers.length = 0
          },
        }
      } catch (error) {
        /* 拿不到 window 就退化成普通生命周期 */
      }
    }

    function serviceOf(ctx, name) {
      try {
        var found = typeof ctx.get === 'function' ? ctx.get(name) : ctx[name]
        return found && typeof found === 'object' ? found : undefined
      } catch (error) {
        return undefined
      }
    }

    function registerLocale(ctx) {
      /* 冷启动时 locale 可能还没挂上：等依赖就绪再注册，别读一次就放弃 */
      if (typeof ctx.inject === 'function') {
        try {
          ctx.inject(['locale'], function (scoped) {
            var locale = serviceOf(scoped, 'locale')
            if (!locale) return
            own(scoped, function () {
              var disposers = []
              if (typeof locale.register === 'function') {
                disposers.push(locale.register(NS, 'zh', WORDS.zh))
                disposers.push(locale.register(NS, 'en', WORDS.en))
              }
              if (typeof locale.bind === 'function') translate = locale.bind(NS)
              return function () {
                translate = null
                for (var i = 0; i < disposers.length; i++) {
                  if (typeof disposers[i] === 'function') disposers[i]()
                }
              }
            })
          })
          return
        } catch (error) {
          /* 掉回同步路径 */
        }
      }
      var locale = serviceOf(ctx, 'locale')
      if (!locale) return
      try {
        own(ctx, function () {
          var disposers = []
          if (typeof locale.register === 'function') {
            disposers.push(locale.register(NS, 'zh', WORDS.zh))
            disposers.push(locale.register(NS, 'en', WORDS.en))
          }
          if (typeof locale.bind === 'function') translate = locale.bind(NS)
          return function () {
            translate = null
            for (var i = 0; i < disposers.length; i++) {
              if (typeof disposers[i] === 'function') disposers[i]()
            }
          }
        })
      } catch (error) {
        /* 文案掉回内置表 */
      }
    }

    function registerMenus(ctx) {
      /* 打开面板时把「这一行此刻真正在用的 kind」带过去，面板才能选中它。
         项目行有撞色顺延（avoidPrevColor），按名字重算会和行上显示的不一致，
         所以直接读装饰时写在行上的 data-dsi-proj。 */
      function effectiveKind(type, id, label) {
        if (type === 'workspace') {
          try {
            var row = document.querySelector('[data-row-key="workspace:' + id + '"]')
            var stamped = row && row.getAttribute(PROJ_ATTR)
            if (stamped) return stamped
          } catch (error) {
            /* 读不到就按名字算 */
          }
        }
        return type === 'session' ? undefined : projectKindOf(label)
      }

      function openPicker(type, id, label) {
        return function () {
          store.open({ type: type, id: id, label: label, kind: effectiveKind(type, id, label) })
        }
      }

      function attach(menus, scope) {
        if (!menus || typeof menus.register !== 'function') return undefined
        return own(scope, function () {
          var disposers = []
          try {
            disposers.push(menus.register({
              id: 'dsh-sidebar-icons:session-icon',
              target: 'session',
              order: 340,
              resolve: function (target) {
                var sessionId = target && target.sessionId
                if (!sessionId) return []
                return [{
                  id: 'custom-icon',
                  label: t('customIcon'),
                  icon: { key: 'dsh-sidebar-icons:palette' },
                  run: openPicker('session', sessionId, target.displayTitle || ''),
                }]
              },
            }))
          } catch (error) {
            /* 会话菜单项缺失不影响其它能力 */
          }
          try {
            disposers.push(menus.register({
              id: 'dsh-sidebar-icons:workspace-icon',
              target: 'workspace',
              order: 249,
              resolve: function (target) {
                var workspaceId = target && target.workspaceId
                if (!workspaceId) return []
                var label = target.displayTitle || ''
                return [{
                  id: 'custom-icon',
                  label: t('customIcon'),
                  icon: { key: 'dsh-sidebar-icons:palette' },
                  run: openPicker('workspace', workspaceId, label),
                }]
            },
          }))
        } catch (error) {
          /* 项目菜单项缺失不影响其它能力 */
        }
        return function () {
          for (var i = 0; i < disposers.length; i++) {
            if (typeof disposers[i] === 'function') disposers[i]()
          }
        }
      })
    }

      /* 冷启动时 contextMenus 可能还没挂上（HMR 时它早就在了，所以以前没暴露这个 bug）：
         先看服务是否已在（最快路径），不在就用 ctx.inject 等依赖就绪再注册。
         两条路都走 attachOnce，保证只注册一次。 */
      var settled = false
      function attachOnce(menus, scope) {
        if (settled || !menus || typeof menus.register !== 'function') return
        settled = true
        attach(menus, scope)
      }

      if (serviceOf(ctx, 'contextMenus')) {
        attachOnce(serviceOf(ctx, 'contextMenus'), ctx)
        return
      }
      if (typeof ctx.inject === 'function') {
        try {
          ctx.inject(['contextMenus'], function (scoped) {
            attachOnce(serviceOf(scoped, 'contextMenus'), scoped)
          })
          return
        } catch (error) {
          /* 掉回同步路径 */
        }
      }
      attachOnce(serviceOf(ctx, 'contextMenus'), ctx)
    }

    function PaletteGlyph() {
      // 菜单里那一行的小图标：三个圆点 = 调色
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': 'true', focusable: 'false' },
        h('circle', { cx: '5.4', cy: '6.4', r: '1.5', fill: BASE.design }),
        h('circle', { cx: '10.4', cy: '5.6', r: '1.5', fill: BASE.ai }),
        h('circle', { cx: '9.6', cy: '10.6', r: '1.5', fill: BASE.data }),
      )
    }

    return {
      inject: ['slots'],
      apply: function apply(ctx) {
        adoptRuntime()

        own(ctx, function () {
          installStyles()
          return function () {
            /* 按选择器移除：style 可能在运行中被重建过，原引用未必还在文档里 */
            var el = document.querySelector('style[data-plugin-css="' + STYLE_MARKER + '"]')
            if (el && el.parentNode) el.parentNode.removeChild(el)
          }
        })

        registerLocale(ctx)
        own(ctx, startDecoration)
        registerMenus(ctx)

        /* 多窗口 / 多标签：别的窗口改了覆盖项，这边跟着刷新 */
        own(ctx, function () {
          if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
          function onStorage(event) {
            if (event && event.key && event.key !== STORE_KEY) return
            store.reload()
            if (requestScan) requestScan()
          }
          window.addEventListener('storage', onStorage)
          return function () {
            window.removeEventListener('storage', onStorage)
          }
        })

        ctx.slots.inject('sidebar.session.row.leading', function () {
          return ctx.slots.register(
            { name: 'sidebar.session.row.leading', id: 'dsh-sidebar-icons.session', order: 30 },
            SessionIcon,
          )
        })

        ctx.slots.inject('shell.overlay', function () {
          return ctx.slots.register(
            { name: 'shell.overlay', id: 'dsh-sidebar-icons.picker', order: 500 },
            PickerDialog,
          )
        })

        ctx.slots.inject('contextMenu.icon', function () {
          return ctx.slots.register(
            { name: 'contextMenu.icon', key: 'dsh-sidebar-icons:palette' },
            PaletteGlyph,
          )
        })
      },
    }
  },
})