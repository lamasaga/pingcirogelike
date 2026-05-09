/**
 * 游戏配置常量
 * 方便后续调整数值平衡
 */
export const CONFIG = {
    INITIAL_MONEY: 20,
    INITIAL_TARGET_SCORE: 40,
    COST: {
        BUY_LETTER: 3,
        REFRESH_SHOP: 1
    },
    // 字母权重与分数 (简化版，参考 Scrabble)
    LETTERS: {
        VOWELS: [
            { char: 'A', score: 1 }, { char: 'E', score: 1 }, { char: 'I', score: 1 },
            { char: 'O', score: 1 }, { char: 'U', score: 1 }
        ],
        CONSONANTS: [
            { char: 'B', score: 3 }, { char: 'C', score: 3 }, { char: 'D', score: 2 },
            { char: 'F', score: 4 }, { char: 'G', score: 2 }, { char: 'H', score: 3 },
            { char: 'J', score: 5 }, { char: 'K', score: 4 }, { char: 'L', score: 1 },
            { char: 'M', score: 3 }, { char: 'N', score: 1 }, { char: 'P', score: 3 },
            { char: 'Q', score: 6 }, { char: 'R', score: 1 }, { char: 'S', score: 1 },
            { char: 'T', score: 1 }, { char: 'V', score: 4 }, { char: 'W', score: 4 },
            { char: 'X', score: 5 }, { char: 'Y', score: 3 }, { char: 'Z', score: 6 }
        ]
    },
    // 概率权重：元音是辅音的2倍
    PROBABILITY: {
        VOWEL_WEIGHT: 2,
        CONSONANT_WEIGHT: 1
    },
    GRID: {
        ROWS: 7,
        COLS: 8
    },
    // 难度预设
    DIFFICULTIES: {
        EASY: {
            name: '简单',
            // 简单: 30、70、120、180、250、350、500、700、1000、1400、2000、2500、3000、3500、4000
            targetScoreFunc: (round) => {
                const targets = [30, 70, 120, 180, 250, 350, 500, 700, 1000, 1400, 2000, 2500, 3000, 3500, 4000];
                return targets[Math.min(round, targets.length) - 1] || 4000 + (round - 15) * 1000;
            },
            maxRound: 15, // 胜利关卡
            desc: '分数增长平缓，适合熟悉机制'
        },
        MEDIUM: {
            name: '普通',
            // 普通: 40、100、200、350、500、750、1250、1600、2000、2500、3100、3800、4600、5200、6000
            targetScoreFunc: (round) => {
                const targets = [40, 100, 200, 350, 500, 750, 1250, 1600, 2000, 2500, 3100, 3800, 4600, 5200, 6000];
                return targets[Math.min(round, targets.length) - 1] || 6000 + (round - 15) * 1500;
            },
            maxRound: 15, // 胜利关卡
            desc: '标准体验，挑战与乐趣并存'
        },
        // 特殊模式预留
        HELL: {
            name: '地狱之路',
            // 地狱: 150、300、500、800、1300、2000、2500、3000、3600、4200、5000、6000、7000、8000、9000
            targetScoreFunc: (round) => {
                const targets = [150, 300, 500, 800, 1300, 2000, 2500, 3000, 3600, 4200, 5000, 6000, 7000, 8000, 9000];
                return targets[Math.min(round, targets.length) - 1] || 9000 + (round - 15) * 2000;
            },
            maxRound: 15,
            desc: '极高难度，独特遗物机制'
        },
        GIANT: {
            name: '巨人之路',
            targetScoreFunc: (round) => 0, // 无目标分
            maxRound: 999,
            desc: '无尽排名模式，全随机构筑'
        }
    }
};
