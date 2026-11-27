#!/usr/bin/env node
// 项目自检：零依赖，`node scripts/check.mjs` 直接跑。
// 覆盖三类历史事故：
//   ① 三张表不同步（CLAY / SESSION_KINDS / KIND_LABELS 对不上）—— 2.3.0 的面板崩溃就是这类
//   ② 规则表里重复的 kind（第二条永远命中不了）
//   ③ 版本号 / CHANGELOG / locale json 与源码漂移
// 外加一次渲染冒烟：每种 kind 在两个尺寸下都不许抛错，且尺寸分档正确。
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = readFileSync(join(root, 'client.js'), 'utf8')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const problems = []
const fail = (message) => problems.push(message)

function slice(from, to) {
  const a = source.indexOf(from)
  if (a < 0) throw new Error('找不到片段起点: ' + from)
  const b = source.indexOf(to, a)
  if (b < 0) throw new Error('找不到片段终点: ' + to)
  return source.slice(a, b)
}

const catalog = slice('function hslToHex', 'function sessionKindOf')
const rulesSrc = slice('var SESSION_RULES = [', 'function sessionKindOf')
const labelsSrc = slice('var KIND_LABELS = {', '\n    var translate')
const wordsSrc = slice('var WORDS = {', 'var KIND_LABELS = {')
const renderSrc = slice('var PAINT = {', '/* ══════════════════════════ 选图面板')
const smallSrc = slice('var SMALL_STROKE = 2.2', 'var SHORT_SIDE = 20')

const h = (tag, props, ...children) => ({ tag, props: props || {}, children })

const body = `
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MARK_ATTR = 'data-dsi-mark';
  var document = {
    createElementNS: function () {
      return { setAttribute: function () {}, appendChild: function () {}, style: {} };
    },
  };
  ${catalog}
  ${rulesSrc}
  ${labelsSrc}
  ${wordsSrc}
  ${renderSrc}
  return {
    BASE: BASE, CLAY: CLAY, CLAY_FAMILY: CLAY_FAMILY,
    PROJECT_KINDS: PROJECT_KINDS, SESSION_KINDS: SESSION_KINDS,
    KIND_LABELS: KIND_LABELS, WORDS: WORDS,
    PROJECT_RULES: PROJECT_RULES, SESSION_RULES: SESSION_RULES,
    projectKindOf: projectKindOf, sessionKindOf: sessionKindOf,
    sessionIcon: sessionIcon, folderIconReact: folderIconReact, SMALL: SMALL,
  };
`

const api = new Function('h', body)(h)

// ── ① 三张表一致 ──
for (const kind of api.SESSION_KINDS) {
  if (!api.CLAY[kind]) fail(`SESSION_KINDS 里的 ${kind} 没有 CLAY 条目`)
  if (!api.KIND_LABELS[kind]) fail(`SESSION_KINDS 里的 ${kind} 没有 KIND_LABELS`)
}
for (const kind of api.PROJECT_KINDS) {
  if (!api.BASE[kind]) fail(`PROJECT_KINDS 里的 ${kind} 没有调色板`)
  if (!api.KIND_LABELS[kind]) fail(`PROJECT_KINDS 里的 ${kind} 没有 KIND_LABELS`)
}
for (const [kind, spec] of Object.entries(api.CLAY)) {
  if (!api.CLAY_FAMILY[spec.fam]) fail(`CLAY.${kind} 用了未定义的色系 ${spec.fam}`)
  if (!Array.isArray(spec.parts) || spec.parts.length === 0) fail(`CLAY.${kind} 没有 parts`)
  for (const part of [...spec.parts, ...(spec.accent || [])]) {
    if (!part.d || !/^[Mm]/.test(String(part.d).trim())) fail(`CLAY.${kind} 有非法路径起点: ${part.d}`)
  }
}
for (const kind of api.SESSION_KINDS) {
  const small = api.SMALL[kind]
  if (!small) fail(`SESSION_KINDS 里的 ${kind} 没有 16px 专用字形（SMALL）`)
  else for (const part of small) {
    if (!part.d || !/^[Mm]/.test(String(part.d).trim())) fail(`SMALL.${kind} 有非法路径起点: ${part.d}`)
  }
}
if (new Set(api.SESSION_KINDS).size !== api.SESSION_KINDS.length) fail('SESSION_KINDS 有重复项')
if (new Set(api.PROJECT_KINDS).size !== api.PROJECT_KINDS.length) fail('PROJECT_KINDS 有重复项')

// ── ② 规则表：重复 kind 会让后面的那条整条失效 ──
for (const [name, rules] of [['PROJECT_RULES', api.PROJECT_RULES], ['SESSION_RULES', api.SESSION_RULES]]) {
  const seen = new Set()
  for (const [kind] of rules) {
    if (seen.has(kind)) fail(`${name} 里 ${kind} 出现了两次（第二条永远不会命中）`)
    seen.add(kind)
    if (!api.KIND_LABELS[kind]) fail(`${name} 里的 ${kind} 没有 KIND_LABELS`)
  }
}

// ── ③ 渲染冒烟（含尺寸分档） ──
function tagsOf(node) {
  const out = []
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.tag) out.push(n)
    for (const kid of n.children || []) {
      if (Array.isArray(kid)) kid.forEach(walk)
      else walk(kid)
    }
  }
  walk(node)
  return out
}

for (const kind of api.SESSION_KINDS) {
  for (const size of [16, 30]) {
    let node
    try {
      node = api.sessionIcon(kind, size)
    } catch (error) {
      fail(`sessionIcon(${kind}, ${size}) 抛错: ${error.message}`)
      continue
    }
    const used = tagsOf(node)
    const hasBlur = used.some((n) => String(n.props.filter || '').startsWith('url('))
    const hasMask = used.some((n) => String(n.props.mask || '').startsWith('url('))
    if (size <= 20 && (hasBlur || hasMask)) fail(`sessionIcon(${kind}, ${size}) 该走简化档，却带了 filter/mask`)
    if (size > 20 && (!hasBlur || !hasMask)) fail(`sessionIcon(${kind}, ${size}) 该走完整档，缺 filter/mask`)
  }
}
for (const kind of api.PROJECT_KINDS) {
  try {
    api.folderIconReact(kind, 30)
  } catch (error) {
    fail(`folderIconReact(${kind}) 抛错: ${error.message}`)
  }
}

// ── ④ 版本与 CHANGELOG 一致，且条目带日期 ──
const changelog = readFileSync(join(root, 'docs', 'CHANGELOG.md'), 'utf8')
const topVersion = (changelog.match(/^##\s+(\d+\.\d+\.\d+)/m) || [])[1]
if (!topVersion) fail('CHANGELOG.md 找不到版本条目')
else if (topVersion !== pkg.version) fail(`CHANGELOG 顶部是 ${topVersion}，package.json 是 ${pkg.version}`)
for (const line of changelog.split('\n').filter((l) => /^##\s+\d+\.\d+\.\d+/.test(l))) {
  if (!/\d{4}-\d{2}-\d{2}/.test(line)) fail(`CHANGELOG 条目缺少日期: ${line.trim()}`)
}

// ── ⑤ 文案：内置两套语言必须同键；locale json 是插件列表用的元数据 ──
const zhKeys = Object.keys(api.WORDS.zh || {}).sort()
const enKeys = Object.keys(api.WORDS.en || {}).sort()
if (zhKeys.join(',') !== enKeys.join(',')) fail('WORDS.zh 与 WORDS.en 的键不一致')
for (const file of ['zh.json', 'en.json']) {
  const meta = JSON.parse(readFileSync(join(root, 'locale', file), 'utf8')).meta || {}
  for (const key of ['title', 'description', 'detail']) {
    if (!meta[key]) fail(`locale/${file} 的 meta.${key} 缺失`)
  }
  if (meta.detail && !existsSync(join(root, meta.detail))) fail(`locale/${file} 指向的 detail 文档不存在: ${meta.detail}`)
}

console.log(`kind 表：项目 ${api.PROJECT_KINDS.length} 项 / 会话 ${api.SESSION_KINDS.length} 项 / CLAY ${Object.keys(api.CLAY).length} 条`)
console.log(`版本：package.json ${pkg.version}，CHANGELOG ${topVersion || '?'}`)
if (problems.length) {
  console.error('\n发现问题：')
  for (const problem of problems) console.error(' - ' + problem)
  process.exit(1)
}
console.log('自检通过 ✔')