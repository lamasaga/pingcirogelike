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
            initialScore: 30,
            growthRate: 1.5, // +50%
            maxRound: 15, // 胜利关卡
            desc: '30分开局，每关增加50%目标分'
        },
        MEDIUM: {
            name: '中等',
            initialScore: 30,
            growthRate: 1.75, // +75%
            maxRound: 15, // 胜利关卡
            desc: '30分开局，每关增加75%目标分'
        },
        HARD: {
            name: '困难',
            initialScore: 40,
            growthRate: 1.75, // +75%
            maxRound: 15, // 胜利关卡
            desc: '40分开局，每关增加75%目标分'
        },
        HELL: {
            name: '地狱之路',
            initialScore: 40,
            growthRate: 2.0, // +100%
            maxRound: 15, // 胜利关卡
            desc: '40分开局，每关增加100%目标分'
        }
    }
};
