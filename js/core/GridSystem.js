import { CONFIG } from '../config.js';
import Dictionary from '../utils/Dictionary.js';
import { relicSystem } from './RelicSystem.js'; 

/**
 * 拼词盘系统
 * 管理网格状态、单词检测与计分
 */
class GridSystem {
    constructor() {
        this.rows = CONFIG.GRID.ROWS;
        this.cols = CONFIG.GRID.COLS;
        this.grid = []; // 2D array
        this.validWords = []; // 存储当前合法的单词信息
        this.initGrid();
    }

    initGrid() {
        this.grid = Array(this.rows).fill(null).map(() => 
            Array(this.cols).fill(null).map(() => ({ letter: null, tileType: null }))
        );
        this.validWords = [];
    }

    placeLetter(row, col, letter) {
        if (this.isValidPosition(row, col)) {
            if (this.grid[row][col].letter !== null) return false;
            this.grid[row][col].letter = letter;
            return true;
        }
        return false;
    }

    getLetter(row, col) {
        if (this.isValidPosition(row, col)) return this.grid[row][col].letter;
        return null;
    }

    removeLetter(row, col) {
        if (this.isValidPosition(row, col)) {
            const letter = this.grid[row][col].letter;
            this.grid[row][col].letter = null;
            return letter;
        }
        return null;
    }
    
    setTileType(row, col, type) {
        if (this.isValidPosition(row, col)) {
            this.grid[row][col].tileType = type;
        }
    }

    getTileType(row, col) {
         if (this.isValidPosition(row, col)) return this.grid[row][col].tileType;
        return null;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    scanGrid() {
        const foundWords = [];
        
        // 1. 横向扫描
        for (let r = 0; r < this.rows; r++) {
            let currentWord = "";
            let currentCoords = [];
            for (let c = 0; c < this.cols; c++) {
                const cell = this.grid[r][c];
                if (cell.letter) {
                    currentWord += cell.letter.char;
                    currentCoords.push({r, c});
                } else {
                    if (currentWord.length >= 2) foundWords.push({ word: currentWord, coords: [...currentCoords], dir: 'row' });
                    currentWord = "";
                    currentCoords = [];
                }
            }
            if (currentWord.length >= 2) foundWords.push({ word: currentWord, coords: [...currentCoords], dir: 'row' });
        }

        // 2. 纵向扫描
        for (let c = 0; c < this.cols; c++) {
            let currentWord = "";
            let currentCoords = [];
            for (let r = 0; r < this.rows; r++) {
                const cell = this.grid[r][c];
                if (cell.letter) {
                    currentWord += cell.letter.char;
                    currentCoords.push({r, c});
                } else {
                    if (currentWord.length >= 2) foundWords.push({ word: currentWord, coords: [...currentCoords], dir: 'col' });
                    currentWord = "";
                    currentCoords = [];
                }
            }
            if (currentWord.length >= 2) foundWords.push({ word: currentWord, coords: [...currentCoords], dir: 'col' });
        }

        this.validWords = foundWords.filter(item => Dictionary.has(item.word));
        return this.validWords;
    }

    /**
     * 计算字母的有效分数 (Layer 1)
     * Formula: (Base + BaseAdd) * PercentMult + TotalAdd
     * 供Renderer调用时，context为空，仅返回基础强化后的分值
     */
    getLetterEffectiveScore(letter, context = {}) {
        if (!letter) return 0;

        let base = letter.score || 0;
        let baseAdd = 0;
        let percentMult = 1;
        let totalAdd = 0;
        const char = letter.char;
        
        // 必须确保 relicSystem 已加载
        if (!relicSystem) return base;

        // --- A类：字母强化 (BaseAdd / Base Override) ---
        if (relicSystem.hasRelic('A01') && this.isVowel(char)) baseAdd += 2;
        if (relicSystem.hasRelic('A02') && !this.isVowel(char)) baseAdd += 1;
        if (relicSystem.hasRelic('A03') && ['J','K','Q','X','Z'].includes(char)) baseAdd += 5;
        if (relicSystem.hasRelic('A04') && ['E','S','T','R','N'].includes(char)) baseAdd += 2;
        if (relicSystem.hasRelic('A05') && char === 'A') base = 10; // Override
        if (relicSystem.hasRelic('A06') && char === 'E') baseAdd += 5;

        // --- Context Dependent Multipliers ---
        // A07: Duplicate in word
        if (context.isDuplicate && relicSystem.hasRelic('A07')) percentMult *= 2;
        
        // C02: Cross letter
        if (context.isCross && relicSystem.hasRelic('C02')) percentMult *= 3;

        // D06: First letter
        if (context.isFirst && relicSystem.hasRelic('D06')) percentMult *= 2;

        // D07: Last letter
        if (context.isLast && relicSystem.hasRelic('D07')) percentMult *= 2;

        return (base + baseAdd) * percentMult + totalAdd;
    }

    /**
     * 计算当前总分
     * 遵循 3层级公式
     */
    calculateScore() {
        this.scanGrid();
        let totalScore = 0;
        
        // 统计交叉引用计数
        const coordUsage = new Map(); 
        this.validWords.forEach(item => {
            item.coords.forEach(coord => {
                const key = `${coord.r},${coord.c}`;
                coordUsage.set(key, (coordUsage.get(key) || 0) + 1);
            });
        });

        this.validWords.forEach(wordItem => {
            const word = wordItem.word;
            const len = word.length;
            const coords = wordItem.coords;
            
            // --- Layer 2: Word Score ---
            // WordScore = (Sum(LetterFinal) + RootWordBuff) * (Length + LengthBuff) * WordMult
            
            let sumLetterFinal = 0;
            let rootWordBuff = 0;
            let lengthBuff = 0;
            let wordMult = 1.0;

            // 分析重复字母 (for A07)
            const charCounts = {};
            word.split('').forEach(c => charCounts[c] = (charCounts[c] || 0) + 1);

            // 1. 计算每个字母的分数并求和
            coords.forEach((coord, index) => {
                const cell = this.grid[coord.r][coord.c];
                const letter = cell.letter;
                const isCross = coordUsage.get(`${coord.r},${coord.c}`) > 1;
                
                // 字母上下文
                const context = {
                    isCross: isCross,
                    isFirst: index === 0,
                    isLast: index === len - 1,
                    isDuplicate: charCounts[letter.char] >= 2
                };

                // 获取字母有效分
                let letterScore = this.getLetterEffectiveScore(letter, context);

                // 应用地块倍率 (DL/TL) - 视为对该位置字母分数的乘法修正
                const tileType = cell.tileType;
                if (tileType === 'DL') letterScore *= 2;
                if (tileType === 'TL') letterScore *= 3;

                sumLetterFinal += letterScore;

                // 应用地块单词倍率 (DW/TW) - 累乘到 WordMult
                if (tileType === 'DW') wordMult *= 2;
                if (tileType === 'TW') wordMult *= 3;
            });

            // 2. 应用词根加值 (RootWordBuff)
            if (relicSystem.hasRelic('B04') && len % 2 !== 0) rootWordBuff += 5;
            if (relicSystem.hasRelic('C05') && this.spansCenter(wordItem)) rootWordBuff += 10;
            if (relicSystem.hasRelic('D01') && this.isVowel(word[0])) rootWordBuff += 5;
            if (relicSystem.hasRelic('D08') && word.endsWith('ER')) rootWordBuff += 8;
            // E03 中心灯塔 (+20) - 这里处理为 RootWordBuff
            // if (relicSystem.hasRelic('E03') && this.passesCenter(wordItem)) rootWordBuff += 20;

            // 3. 应用单词倍率 (WordMult)
            // B类：长度策略
            if (relicSystem.hasRelic('B01') && len >= 2 && len <= 3) wordMult *= 1.5;
            if (relicSystem.hasRelic('B02') && len >= 5 && len <= 6) wordMult *= 1.5;
            if (relicSystem.hasRelic('B03') && len >= 7) wordMult *= 2.5;
            if (relicSystem.hasRelic('B05') && len % 2 === 0) wordMult += 0.25;
            if (relicSystem.hasRelic('B06') && [1,2,3,5,8].includes(len)) wordMult *= 2;
            
            // C类：结构
            if (relicSystem.hasRelic('C06') && this.touchesEdge(wordItem)) wordMult *= 2;

            // D类：词缀
            if (relicSystem.hasRelic('D02') && word.endsWith('S')) wordMult *= 1.2;
            if (relicSystem.hasRelic('D03') && word.endsWith('ING')) wordMult *= 1.5;
            if (relicSystem.hasRelic('D04') && ['J','K','Q','X','Z'].includes(word[0])) wordMult *= 3;
            if (relicSystem.hasRelic('D05') && len > 1 && word === word.split('').reverse().join('')) wordMult *= 5;

            // F类：特殊
            if (relicSystem.hasRelic('F05')) {
                 const rand = this.getDeterministicRandom(wordItem);
                 if (rand > 0.5) wordMult *= 1.5;
                 else wordMult *= 0.8;
            }

            // 计算单词层级分数
            const wordScore = (sumLetterFinal + rootWordBuff) * (len + lengthBuff) * wordMult;

            // --- Layer 3: Intersection Bonus ---
            // FinalScore = WordScore * (CrossCount * CrossCountBuff + IndependentCrossMult)
            // 基础：0交叉=1倍, 1交叉=2倍, 2交叉=3倍...
            
            let crossCount = 0;
            let crossCountBuff = 1;  // 基础值为1，每个交叉点提供 +1 倍率
            let independentCrossMult = 1.0;  // 独立基础倍率
            let hasVowelCross = false;

            coords.forEach(coord => {
                if (coordUsage.get(`${coord.r},${coord.c}`) > 1) {
                    crossCount++;
                    if (this.isVowel(this.grid[coord.r][coord.c].letter.char)) {
                        hasVowelCross = true;
                    }
                }
            });

            // C01 交通指挥棒：每个交叉点额外 +0.5 倍率
            if (relicSystem.hasRelic('C01')) crossCountBuff += 0.5;
            // C04 紧密连接：与元音交叉时，独立倍率 +0.5
            if (relicSystem.hasRelic('C04') && hasVowelCross) independentCrossMult += 0.5;

            const intersectionMult = (crossCount * crossCountBuff) + independentCrossMult;
            
            const finalScore = wordScore * intersectionMult;
            totalScore += Math.floor(finalScore);
        });
        
        return totalScore;
    }
    
    // 辅助：判断元音
    isVowel(char) {
        return ['A','E','I','O','U'].includes(char);
    }
    
    // 辅助：检查某个格子是否属于有效单词
    isValidCell(r, c) {
        return this.validWords.some(item => 
            item.coords.some(coord => coord.r === r && coord.c === c)
        );
    }

    // 辅助：跨越中线判断
    spansCenter(wordItem) {
        const centerAxis = (CONFIG.GRID.ROWS - 1) / 2;
        const coords = wordItem.coords;
        if (wordItem.dir === 'row') {
            const minC = Math.min(...coords.map(c => c.c));
            const maxC = Math.max(...coords.map(c => c.c));
            return (minC < centerAxis && maxC > centerAxis);
        } else { 
            const minR = Math.min(...coords.map(c => c.r));
            const maxR = Math.max(...coords.map(c => c.r));
            return (minR < centerAxis && maxR > centerAxis);
        }
    }

    // 辅助：触边判断
    touchesEdge(wordItem) {
        return wordItem.coords.some(c => c.r === 0 || c.r === this.rows - 1 || c.c === 0 || c.c === this.cols - 1);
    }

    // 辅助：确定性随机 (for F05)
    getDeterministicRandom(wordItem) {
        const hashStr = wordItem.word + wordItem.coords[0].r + wordItem.coords[0].c;
        let hash = 0;
        for (let i = 0; i < hashStr.length; i++) {
            hash = ((hash << 5) - hash) + hashStr.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash % 100) / 100;
    }

    clear() {
        this.initGrid();
    }
}

export const gridSystem = new GridSystem();