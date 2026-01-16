# Word Builder Roguelike (拼词肉鸽) - 设计文档

## 1. 游戏概述
一款结合了肉鸽（Roguelike）构筑要素的拼词游戏。玩家通过购买字母、组合单词来获取分数，利用饰品（Trinkets）产生化学反应，突破关卡目标。

## 2. 核心玩法
- **备选区 (Shop)**: 随机刷新字母。
  - 购买费用: 3金币/个。
  - 刷新费用: 1金币/次。
  - 刷新概率: 元音 (Vowels) 选取几率是辅音 (Consonants) 的2倍。
- **拼写区 (Grid)**: 玩家拖动字母到此处组成单词。
- **结算 (Score)**: 
  - 基础分: 字母分值求和。
  - 倍率/加成: 由饰品 (Trinkets) 和特殊词盘格子提供。
- **循环**: 拼词 -> 结算 -> 获得金币/分数 -> 下一关/失败。

## 3. 技术架构 (Modular JS)
为了方便迁移到 Uni-app 和扩展，我们采用 ES6 Modules 模式，分离数据与视图。

### 目录结构
```text
/
├── index.html          # 入口文件
├── css/
│   ├── style.css       # 核心样式 (柔和风格)
│   └── animations.css  # 动效
├── js/
│   ├── main.js         # 游戏主入口 (Controller)
│   ├── config.js       # 游戏配置 (常量、概率、价格)
│   ├── core/
│   │   ├── GameState.js    # 全局状态管理 (分数、金币、关卡)
│   │   ├── ShopSystem.js   # 商店逻辑 (随机生成、购买)
│   │   └── GridSystem.js   # 拼词盘逻辑 (放置、验证)
│   ├── ui/
│   │   ├── Renderer.js     # 负责更新 DOM
│   │   └── DragManager.js  # 负责处理拖拽交互
│   └── utils/
│       ├── Dictionary.js   # 词库检查 (API预留)
│       └── MathHelpers.js  # 随机数、概率计算
```

## 4. 接口预留 (Extensibility)

### 局外成长 (Meta Progression)
在 `GameState` 中预留 `permanentTraits` 数组，用于存储游戏开始前加载的被动效果。

### 拼词盘 (Board Skins/Buffs)
`GridSystem` 将接受 `BoardConfig` 对象：
```javascript
{
  id: "classic_wood",
  size: [8, 8],
  specialSlots: [{x: 2, y: 2, type: "double_score"}] // 特殊格子接口
}
```

### 游戏统计 (Statistics)
`GameState` 中预留 `sessionStats` 对象，记录：
- 拼出的最长单词
- 单回合最高分
- 消耗金币总数

## 5. 开发路线
1. **MVP**: 能够购买字母、拖动到网格、计算基础分、判定胜负。
2. **Phase 2**: 加入饰品系统、特殊格子。
3. **Phase 3**: 接入真实英文词库 API。
