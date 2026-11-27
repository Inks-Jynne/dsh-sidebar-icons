# 安装说明（3 步）

这是 **DeepSeek Harness** 的侧栏图标插件，v1.0.1。
解压得到 `dsh-sidebar-icons` 文件夹，把它放进 DSH 的 profile 即可。

## 1. 找到你的 profile 目录

| 系统 | 路径 |
|---|---|
| Windows | `C:\Users\<你>\.dsh\profiles\desktop\node_modules\` |
| macOS / Linux | `~/.dsh/profiles/desktop/node_modules/` |

> `desktop` 是默认 profile 名。如果你建过别的 profile，换成对应的那个。

## 2. 把文件夹放进去

解压出来的 `dsh-sidebar-icons` 整个文件夹，直接复制到上面那个 `node_modules\` 里：

```
.dsh/profiles/desktop/node_modules/dsh-sidebar-icons/
   ├─ package.json
   ├─ index.js
   ├─ client.js
   ├─ cordis.patch.yml
   ├─ icon.svg
   └─ locale/
```

## 3. 让 DSH 加载它

打开 DSH → **设置 → 插件**，找到 `dsh-sidebar-icons` 并启用（或者对它的 bundle 开关关一次再开一次）。

侧栏立刻变成黏土图标。如果样式没变，按 **Ctrl+R** 刷新一次窗口。

---

## 怎么确认装好了

1. 左侧栏**项目**行显示黏土文件夹（不再是官方线框文件夹）；
2. **会话**行左侧显示图标（`<>`、地球、烧瓶…）；
3. 项目 / 会话行的 `⋯` 菜单里有 **自定义图标…**。

三条都在 = 正常。任一条不在，见 `docs/USAGE.md` 的「出问题先看这里」。

## 卸载

1. 设置 → 插件，停用 `dsh-sidebar-icons`；
2. 删掉 `node_modules/dsh-sidebar-icons` 这个文件夹；
3. 侧栏回到官方外观（插件会把追加的节点、属性、样式表全部移除）。

## 常见问题

**放进去但插件列表里没有它**
路径多半放错了一层。正确是 `node_modules/dsh-sidebar-icons/package.json`，
不是 `node_modules/dsh-sidebar-icons/dsh-sidebar-icons/package.json`。

**插件列表有，但侧栏没变化**
bundle 开关关一次再开一次；仍无变化就刷新窗口（Ctrl+R）。

**点「自定义图标…」没反应**
确认版本是 1.0.0（更早的测试版有过一个渲染崩溃，已修）。

版本、设计规范、分类规则表在 `README.md` 与 `docs/` 里。