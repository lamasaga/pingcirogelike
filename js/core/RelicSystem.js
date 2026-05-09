import { gridSystem } from './GridSystem.js';

/**
 * 遗物系统核心逻辑
 * 管理遗物数据、玩家获取的遗物以及效果触发
 */
export const RELIC_DATA = [
    // --- 第一类：字母强化 (Letter Mastery) ---
    { id: "A01", name: "元音护符", rarity: "COMMON", type: "LETTER_BUFF", description: "所有元音字母 (A, E, I, O, U) 的基础加值 +2。", icon: "icons/图标/001.jpg" },
    { id: "A02", name: "辅音护符", rarity: "COMMON", type: "LETTER_BUFF", description: "所有辅音字母的基础加值 +1。", icon: "icons/图标/002.jpg" },
    { id: "A03", name: "重金属", rarity: "RARE", type: "LETTER_BUFF", description: "稀有字母 (J, K, Q, X, Z) 的基础加值 +5。", icon: "icons/图标/003.jpg" },
    { id: "A04", name: "通用树脂", rarity: "COMMON", type: "LETTER_BUFF", description: "最常用的字母 (E, S, T, R, N) 的基础加值 +2。", icon: "icons/图标/004.jpg" },
    { id: "A05", name: "黄金 A", rarity: "EPIC", type: "LETTER_BUFF", description: "字母 'A' 的基础分数变为 10 分。", icon: "icons/图标/005.jpg" },
    { id: "A06", name: "白银 U", rarity: "RARE", type: "LETTER_BUFF", description: "字母 'U' 的基础加值 +5。", icon: "icons/图标/006.jpg" },
    { id: "A07", name: "双生护符", rarity: "RARE", type: "LETTER_BUFF", description: "如果一个单词中包含两个相同的字母，这些字母的分数倍率翻倍。", icon: "icons/图标/007.jpg" },
    { id: "A08", name: "黑铁IO", rarity: "COMMON", type: "LETTER_BUFF", description: "字母 'I' 和 'O' 的基础加值 +3。", icon: "icons/图标/008.jpg" },
    { id: "A09", name: "厚重NML", rarity: "COMMON", type: "LETTER_BUFF", description: "字母 'N', 'M', 'L' 的基础加值 +4。", icon: "icons/图标/009.jpg" },
    { id: "A10", name: "靠边站", rarity: "COMMON", type: "LETTER_BUFF", description: "接触棋盘边缘的字母，基础加值 +3。", icon: "icons/图标/010.jpg" },
    { id: "A11", name: "放声大笑", rarity: "COMMON", type: "LETTER_BUFF", description: "字母 'Y', 'W', 'V', 'H' 的基础加值 +3。", icon: "icons/图标/011.jpg" },
    
    // --- 第二类：长度策略 (Length Strategy) ---
    { id: "B01", name: "锋利短剑", rarity: "COMMON", type: "LENGTH_STRATEGY", description: "长度为 2-3 的单词，总分倍率 x3。", icon: "icons/图标/012.jpg" },
    { id: "B02", name: "长柄战斧", rarity: "RARE", type: "LENGTH_STRATEGY", description: "长度为 5-6 的单词，总分倍率 x2。", icon: "icons/图标/013.jpg" },
    { id: "B03", name: "冲锋长枪", rarity: "EPIC", type: "LENGTH_STRATEGY", description: "长度为 7 及以上的单词，总分倍率 x1.5。", icon: "icons/图标/014.jpg" },
    { id: "B04", name: "奇数魔杖", rarity: "COMMON", type: "LENGTH_STRATEGY", description: "长度为奇数的单词，词根基础加值 +8。", icon: "icons/图标/015.jpg" },
    { id: "B05", name: "偶数大盾", rarity: "COMMON", type: "LENGTH_STRATEGY", description: "长度为偶数的单词，总分倍率 +0.5。", icon: "icons/图标/016.jpg" },
    { id: "B06", name: "4者为大", rarity: "COMMON", type: "LENGTH_STRATEGY", description: "长度为 4 的单词，交叉点的倍率+0.5。", icon: "icons/图标/036.jpg" },   

    // --- 第三类：结构与交叉 (Structure & Cross) ---
    { id: "C01", name: "交通指挥棒", rarity: "COMMON", type: "STRUCTURE", description: "每个交叉点提供的倍率修正 +0.33 (即每个交叉点提供 1.33 倍率)。", icon: "icons/图标/017.jpg" },
    { id: "C02", name: "十字路口", rarity: "EPIC", type: "STRUCTURE", description: "位于交叉点的字母，其自身分数倍率 x4。", icon: "icons/图标/018.jpg" },
    { id: "C03", name: "连接辅音", rarity: "COMMON", type: "STRUCTURE", description: "与任何辅音字母交叉时，独立交叉倍率 +0.5。", icon: "icons/图标/019.jpg" },
    { id: "C04", name: "紧密元音", rarity: "COMMON", type: "STRUCTURE", description: "与任何元音字母交叉时，独立交叉倍率 +0.5。", icon: "icons/图标/020.jpg" },
    { id: "C05", name: "桥梁工程师", rarity: "RARE", type: "STRUCTURE", description: "单词跨越了棋盘的中轴线，词根基础加值 +10。", icon: "icons/图标/021.jpg" },
    { id: "C06", name: "角落蜘蛛", rarity: "EPIC", type: "STRUCTURE", description: "如果单词接触到棋盘的最边缘一行或一列，总分倍率 x2。", icon: "icons/图标/022.jpg" },
    { id: "C08", name: "天地大循环", rarity: "LEGENDARY", type: "STRUCTURE", description: "每个单词都至少视为有 2 个交叉点 (交叉计数 +2)。", icon: "icons/图标/023.jpg" },
    { id: "C09", name: "交头接耳", rarity: "RARE", type: "STRUCTURE", description: "如果单词的头尾字母都是交叉点，该单词交叉点倍率修正 +0.5。", icon: "icons/图标/024.jpg" },
    { id: "C10", name: "独立日", rarity: "LEGENDARY", type: "STRUCTURE", description: "所有单词的交叉点数量始终视为 2 (鼓励不进行交叉)。", icon: "icons/图标/025.jpg" },

    // --- 第四类：词头词尾 (Affix) ---
    { id: "D01", name: "起跑器", rarity: "COMMON", type: "AFFIX", description: "以元音字母开头的单词，词根基础加值 +8。", icon: "icons/图标/026.jpg" },
    { id: "D02", name: "终结技", rarity: "RARE", type: "AFFIX", description: "以 'S' 结尾的单词，总分倍率 x1.25。", icon: "icons/图标/027.jpg" },
    { id: "D03", name: "押韵字典", rarity: "RARE", type: "AFFIX", description: "以 'ING' 结尾的单词，总分倍率 x2。", icon: "icons/图标/028.jpg" },
    { id: "D04", name: "贵族头冠", rarity: "EPIC", type: "AFFIX", description: "以稀有字母 (J,Q,X,Z) 开头的单词，总分倍率 x2。", icon: "icons/图标/029.jpg" },
    { id: "D05", name: "回文镜", rarity: "LEGENDARY", type: "AFFIX", description: "如果单词是回文，总分倍率 x5。", icon: "icons/图标/030.jpg" },
    { id: "D06", name: "重头戏", rarity: "COMMON", type: "AFFIX", description: "单词的首字母分数倍率 x3。", icon: "icons/图标/031.jpg" },
    { id: "D07", name: "豹尾", rarity: "COMMON", type: "AFFIX", description: "单词的尾字母分数倍率 x3。", icon: "icons/图标/032.jpg" },
    { id: "D08", name: "ER人事局", rarity: "COMMON", type: "AFFIX", description: "以 'ER' 结尾的单词，词根基础加值 +8。", icon: "icons/图标/033.jpg" },
    { id: "D09", name: "没UN啊", rarity: "COMMON", type: "AFFIX", description: "以 'UN' 开头的单词，词根基础加值 +8。", icon: "icons/图标/034.jpg" },
    { id: "D10", name: "懒得LY你", rarity: "COMMON", type: "AFFIX", description: "以 'LY' 结尾的单词，总分倍率 x1.25。", icon: "icons/图标/035.jpg" },
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
    draftRelics(count = 3) {
        // 过滤掉已拥有的遗物
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

        // 目前没有获得时立即触发的遗物，保留接口
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
