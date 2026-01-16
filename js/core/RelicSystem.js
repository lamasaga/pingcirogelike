// import { gridSystem } from './GridSystem.js';

/**
 * 遗物系统核心逻辑
 * 管理遗物数据、玩家获取的遗物以及效果触发
 */
export const RELIC_DATA = [
    // --- 第一类：字母强化 (Letter Mastery) ---
    { id: "A01", name: "元音护符", rarity: "COMMON", type: "LETTER_BUFF", description: "所有元音字母 (A, E, I, O, U) 的基础分数 +2。" },
    { id: "A02", name: "辅音磨刀石", rarity: "COMMON", type: "LETTER_BUFF", description: "所有辅音字母的基础分数 +1。" },
    { id: "A03", name: "重金属", rarity: "RARE", type: "LETTER_BUFF", description: "稀有字母 (J, K, Q, X, Z) 的基础分数 +5。" },
    { id: "A04", name: "通用树脂", rarity: "COMMON", type: "LETTER_BUFF", description: "最常用的字母 (E, S, T, R, N) 基础分数 +2。" },
    { id: "A05", name: "黄金 A", rarity: "EPIC", type: "LETTER_BUFF", description: "字母 'A' 的基础分数变为 10 分。" },
    { id: "A06", name: "白银 E", rarity: "RARE", type: "LETTER_BUFF", description: "字母 'E' 的基础分数 +5。" },
    { id: "A07", name: "双生护符", rarity: "RARE", type: "LETTER_BUFF", description: "如果一个单词中包含两个相同的字母，这些字母的分数翻倍。" },
    
    // --- 第二类：长度策略 (Length Strategy) ---
    { id: "B01", name: "短剑", rarity: "COMMON", type: "LENGTH_STRATEGY", description: "长度为 2-3 的单词，总分 x1.5。" },
    { id: "B02", name: "长柄斧", rarity: "RARE", type: "LENGTH_STRATEGY", description: "长度为 5-6 的单词，总分 x1.5。" },
    { id: "B03", name: "百科全书", rarity: "EPIC", type: "LENGTH_STRATEGY", description: "长度为 7 及以上的单词，总分 x2.5。" },
    { id: "B04", name: "奇数魔杖", rarity: "COMMON", type: "LENGTH_STRATEGY", description: "长度为奇数的单词，基础分 +5。" },
    { id: "B05", name: "偶数大盾", rarity: "COMMON", type: "LENGTH_STRATEGY", description: "长度为偶数的单词，倍率 +0.25。" },
    { id: "B06", name: "斐波那契螺旋", rarity: "LEGENDARY", type: "LENGTH_STRATEGY", description: "长度为 1, 2, 3, 5, 8 的单词，总分 x2。" },

    // --- 第三类：结构与交叉 (Structure & Cross) ---
    { id: "C01", name: "交通指挥棒", rarity: "COMMON", type: "STRUCTURE", description: "每个交叉点提供 +0.5 的独立倍率。" },
    { id: "C02", name: "十字路口", rarity: "EPIC", type: "STRUCTURE", description: "位于交叉点的字母，其自身分数 x3。" },
    { id: "C04", name: "紧密连接", rarity: "COMMON", type: "STRUCTURE", description: "与任何元音字母交叉时，独立交叉倍率 +0.5。" },
    { id: "C05", name: "桥梁工程师", rarity: "RARE", type: "STRUCTURE", description: "单词跨越了棋盘的中轴线，词根分 +10。" },
    { id: "C06", name: "角落蜘蛛", rarity: "EPIC", type: "STRUCTURE", description: "如果单词接触到棋盘的最边缘一行或一列，总分 x2。" },

    // --- 第四类：词头词尾 (Prefix & Suffix) ---
    { id: "D01", name: "起跑器", rarity: "COMMON", type: "AFFIX", description: "以元音字母开头的单词，基础分 +5。" },
    { id: "D02", name: "终结技", rarity: "RARE", type: "AFFIX", description: "以 'S' 结尾的单词，总分 x1.2。" },
    { id: "D03", name: "押韵字典", rarity: "RARE", type: "AFFIX", description: "以 'ING' 结尾的单词，总分 x1.5。" },
    { id: "D04", name: "贵族头冠", rarity: "EPIC", type: "AFFIX", description: "以稀有字母 (J,Q,X,Z) 开头的单词，总分 x3。" },
    { id: "D05", name: "回文镜", rarity: "LEGENDARY", type: "AFFIX", description: "如果单词是回文（如 KAYAK），总分 x5。" },
    { id: "D06", name: "重头戏", rarity: "COMMON", type: "AFFIX", description: "单词的首字母分数 x2。" },
    { id: "D07", name: "豹尾", rarity: "COMMON", type: "AFFIX", description: "单词的尾字母分数 x2。" },
    { id: "D08", name: "ER工会证", rarity: "COMMON", type: "AFFIX", description: "以 'ER' 结尾的单词，基础分 +8。" },

    // --- 第五类：棋盘与地块 (Board & Tiles) - 暂时移除，存在BUG ---
    // { id: "E01", name: "肥沃土壤", rarity: "RARE", type: "BOARD_BUFF", description: "获得时随机将 3 个普通格子变成“双倍字母分”格子。" },
    // { id: "E02", name: "金矿", rarity: "EPIC", type: "BOARD_BUFF", description: "获得时随机将 1 个普通格子变成“三倍单词分”格子。" },
    // { id: "E03", name: "中心灯塔", rarity: "COMMON", type: "BOARD_BUFF", description: "经过棋盘中心点（起始点）的单词，总分额外 +20。" },
    // { id: "E04", name: "扩张主义", rarity: "COMMON", type: "BOARD_BUFF", description: "棋盘最外圈的所有格子，自带“双倍字母分”效果。" },
    // { id: "E07", name: "虚空行者", rarity: "EPIC", type: "BOARD_BUFF", description: "放置在空白格子上（不利用交叉）的第一个单词，分数 x2。" },

    // --- 第六类：特殊与经济 (Special & Economy) ---
    { id: "F01", name: "备用口袋", rarity: "COMMON", type: "SPECIAL", description: "手牌上限 +1 (变为 8 张)。" },
    { id: "F02", name: "回收站", rarity: "COMMON", type: "SPECIAL", description: "每次“弃牌/重抽”不消耗回合数，每场游戏限 3 次。" },
    { id: "F04", name: "连胜奖杯", rarity: "RARE", type: "SPECIAL", description: "如果上回合得分超过 100，本回合所有倍率 +0.5。" },
    { id: "F05", name: "赌徒骰子", rarity: "LEGENDARY", type: "SPECIAL", description: "单词计算完总分后，50% 概率 x1.5，50% 概率 x0.8。" },
    { id: "F06", name: "耐心之石", rarity: "COMMON", type: "SPECIAL", description: "如果本回合没有进行弃牌操作，下回合首个单词分数 +15。" }
];

class RelicSystem {
    constructor() {
        this.ownedRelics = []; // 玩家当前拥有的遗物对象列表
        this.listeners = [];
        this.gridSystem = null; // 依赖注入
    }

    // 注入依赖，打破循环引用
    setGridSystem(gridSystem) {
        this.gridSystem = gridSystem;
    }

    // 订阅遗物变化
    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this.ownedRelics));
    }

    // 随机抽取 N 个不重复的遗物供选择
    // 可以根据稀有度加权 (目前简单实现为纯随机)
    draftRelics(count = 3) {
        // 过滤掉已拥有的遗物 (有些遗物可能允许叠加，但目前假设唯一)
        const ownedIds = new Set(this.ownedRelics.map(r => r.id));
        const pool = RELIC_DATA.filter(r => !ownedIds.has(r.id));
        
        if (pool.length <= count) return pool;

        // 简单的洗牌算法
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // 添加遗物
    addRelic(relicId) {
        const relic = RELIC_DATA.find(r => r.id === relicId);
        if (relic) {
            this.ownedRelics.push(relic);
            console.log(`获得遗物: ${relic.name}`);
            
            // 触发"获得时"效果 (On Acquire)
            this.triggerOnAcquire(relic);
            
            this.notify();
            return true;
        }
        return false;
    }

    // 检查是否有某个遗物
    hasRelic(relicId) {
        return this.ownedRelics.some(r => r.id === relicId);
    }

    // 获取特定类型的遗物
    getRelicsByType(type) {
        return this.ownedRelics.filter(r => r.type === type);
    }

    // 触发"获得时"的一次性效果
    triggerOnAcquire(relic) {
        console.log(`Triggering effect for ${relic.name}`);
        
        if (!this.gridSystem) {
            console.warn("GridSystem not injected into RelicSystem. Board effects cannot be applied.");
            return;
        }

        // 暂时移除 E 类遗物逻辑
        /*
        // E01 肥沃土壤: 随机 3 个 DL (双倍字母分)
        if (relic.id === 'E01') {
            this.applyRandomTiles('DL', 3);
        }
        // E02 金矿: 随机 1 个 TW (三倍单词分)
        if (relic.id === 'E02') {
             this.applyRandomTiles('TW', 1);
        }
        */
    }

    // 辅助：随机给空白格子赋予倍率
    applyRandomTiles(type, count) {
        if (!this.gridSystem) return;

        let applied = 0;
        let attempts = 0;
        const maxAttempts = 100;

        while (applied < count && attempts < maxAttempts) {
            const r = Math.floor(Math.random() * this.gridSystem.rows);
            const c = Math.floor(Math.random() * this.gridSystem.cols);
            
            // 仅对还没有倍率的格子生效
            if (!this.gridSystem.getTileType(r, c)) {
                this.gridSystem.setTileType(r, c, type);
                console.log(`Set ${type} at [${r},${c}]`);
                applied++;
            }
            attempts++;
        }
    }

    // 重置
    reset() {
        this.ownedRelics = [];
        this.notify();
    }
}

// 导出单例
export const relicSystem = new RelicSystem();
