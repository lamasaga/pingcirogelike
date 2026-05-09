# 拼词肉鸽（Word Roguelike）

　　**源码仓库**：[github.com/lamasaga/pingcirogelike](https://github.com/lamasaga/pingcirogelike)

　　**服务器部署**（`/srv/pingchi`、IP 子路径访问等）：见仓库内 **[拼词肉鸽-部署与更新.md](./拼词肉鸽-部署与更新.md)**。

　　**Linux / Nginx / systemd / SSH 入门导读**（便于对照部署与运维）：见 **[学习资料-服务器运维入门导读.md](./学习资料-服务器运维入门导读.md)**。

　　**SSH 公钥/私钥**：何时生成、交给谁、日常管理与排错，见 **[学习资料-SSH密钥与服务器登录详解.md](./学习资料-SSH密钥与服务器登录详解.md)**。

　　一款在浏览器中运行的 **英文拼词 + Roguelike 构筑** 小游戏：从商店购入字母，拖到棋盘上组成横向或纵向的合法单词，利用 **遗物（Relics）** 叠加规则打出高分，在限定关卡内达成目标分数即可通关。  

　　界面与元数据以中文为主，单词与词库为英文；支持 **PWA**（见根目录 `manifest.json`），可添加到主屏幕离线游玩（仍需本地 HTTP 服务或托管站点以正常加载 ES Module）。

---

## 玩法速览

- **商店**：随机刷新字母货架（首次刷新免费逻辑由 `ShopSystem` 控制）；购买单价、刷新费用见 `js/config.js` 中的 `CONFIG.COST`。
- **备选区**：暂存已购买但未摆上棋盘的字母（容量等见 `GameState.storage` / `storageCapacity`）。
- **棋盘**：当前为 **7 行 × 8 列**（`CONFIG.GRID`）。横向、纵向连续字母长度 ≥ 2 的串会被扫描；合法单词参与计分（词库见 `js/utils/Dictionary.js`）。
- **回合**：在棋盘上构筑完成后点击 **结束回合**，根据盘面单词结算分数与金币，并推进关卡目标。
- **遗物**：通关或流程中会获得遗物选择，多种类型（字母强化、长度策略、交叉结构、词头词尾等）改变计分规则；数据与逻辑在 `js/core/RelicSystem.js`，UI 在 `js/ui/RelicUI.js`。
- **难度**：预设简单 / 普通 / 地狱之路 / 巨人之路（无尽）等，目标分曲线与说明在 `CONFIG.DIFFICULTIES`。

---

## 本地运行

　　项目为 **原生 HTML + ES Module**，直接用 `file://` 打开往往会受浏览器 CORS 策略限制，**请使用本地静态服务器**打开项目根目录。

例如（任选其一）：

1. **Python 3**（在项目根目录执行）  
   `python -m http.server 8080`  
   浏览器访问：`http://localhost:8080`

2. **Node（若已安装 npx）**  
   `npx --yes serve .`  
   按终端提示的地址访问。

3. **VS Code / Cursor**：使用「Live Server」等扩展，将根目录作为站点根启动。

　　入口文件：`index.html` → `js/main.js`。

---

## 技术栈与特点

| 项目 | 说明 |
|------|------|
| 运行时 | 浏览器；无打包步骤；依赖 ES Module |
| 语言 | JavaScript（ES Modules） |
| 样式 | 多文件 CSS（响应式 / 桌面补充 / 遗物图标等） |
| 词库 | 内置大规模词条对象（约高中难度、多字数分段合并），含简要中文释义 |
| 状态 | `GameState` 单例 + 订阅通知；预留 `permanentTraits`、`sessionStats` |

　　根目录的 `package-lock.json` 当前无 npm 依赖包记录；日常游玩与开发 **不强制** 使用 Node，仅需静态托管。

---

## 仓库结构（与代码一致）

```text
/
├── index.html              # 页面入口、布局与弹层
├── manifest.json           # PWA 清单
├── css/
│   ├── style.css           # 主样式
│   ├── search.css          # 搜索 / 词库相关
│   ├── start.css           # 开始界面等
│   ├── desktop.css         # 桌面端布局补充
│   ├── ui_patch.css        # UI 补丁
│   └── relic_icons.css     # 遗物展示相关
├── icons/                  # 应用图标、遗物图片等
├── js/
│   ├── main.js             # 组装各系统并启动
│   ├── config.js           # 数值、棋盘尺寸、难度曲线
│   ├── core/
│   │   ├── GameState.js    # 金币、分数、回合、备选区等
│   │   ├── ShopSystem.js   # 商店货架与购买
│   │   ├── GridSystem.js   # 网格、扫描单词、计分与遗物交互
│   │   └── RelicSystem.js  # 遗物数据与抽取 / 拥有列表
│   ├── ui/
│   │   ├── Renderer.js     # DOM 更新
│   │   ├── DragManager.js  # 拖拽与放置流程
│   │   ├── RelicUI.js      # 遗物界面
│   │   └── DictionaryViewer.js  # 词库浏览
│   └── utils/
│       ├── Dictionary.js   # 词表与校验入口
│       └── MathHelpers.js  # 字母随机权重等
└── README.md               # 本说明
```

---

## 核心模块职责

- **`GameState`**：游戏阶段、难度、金钱、当前分数与关卡目标、备选区数组；预留局外成长与统计字段。
- **`ShopSystem`**：刷新货架（元音 / 辅音加权随机）、购买确认与扣费协作。
- **`GridSystem`**：落子、扫描横纵单词、词典校验、合并遗物后的得分计算。
- **`RelicSystem`**：`RELIC_DATA` 静态表 + `draftRelics` 等流程，与 `GridSystem` 通过注入协作。
- **`Renderer` / `DragManager`**：视图与交互；`DictionaryViewer` 提供词库查阅。

---

## 配置与扩展提示

- **改平衡**：优先编辑 `js/config.js`（初始金币、购买价、刷新价、`GRID` 行列、`DIFFICULTIES` 等）。
- **改词库**：在 `js/utils/Dictionary.js` 中维护词条；注意与扫描最小长度（≥2）及性能的平衡。
- **新棋盘皮肤 / 特殊格**：`GridSystem` 中单元格含 `tileType` 字段，可扩展为 `BoardConfig` 式数据源（设计文档中的思路仍适用）。
- **未来**：真实在线词典 API、地狱模式免费刷新次数等待办可在 `GameState` / `ShopSystem` 注释处跟进。

---

## 授权与贡献

　　若后续补充开源协议或贡献指南，可在本节追加 `LICENSE` 与 PR 说明；当前以仓库内代码与文档为准。
