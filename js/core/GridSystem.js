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
        if (relicSystem.hasRelic('A06') && char === 'U') baseAdd += 5; // A06 白银 U
        if (relicSystem.hasRelic('A08') && ['I','O'].includes(char)) baseAdd += 3;
        if (relicSystem.hasRelic('A09') && ['N','M','L'].includes(char)) baseAdd += 4;
        if (relicSystem.hasRelic('A11') && ['Y','W','V','H'].includes(char)) baseAdd += 3;

        // A10: Context Dependent BaseAdd (Touching Edge)
        if (context.isEdge && relicSystem.hasRelic('A10')) baseAdd += 3;

        // --- Context Dependent Multipliers ---
        // A07: Duplicate in word
        if (context.isDuplicate && relicSystem.hasRelic('A07')) percentMult *= 2;
        
        // C02: Cross letter
        if (context.isCross && relicSystem.hasRelic('C02')) percentMult *= 4;

        // D06: First letter
        if (context.isFirst && relicSystem.hasRelic('D06')) percentMult *= 3;

        // D07: Last letter
        if (context.isLast && relicSystem.hasRelic('D07')) percentMult *= 3;

        return (base + baseAdd) * percentMult + totalAdd;
    }

    /**
     * 计算当前总分
     * @param {boolean} detailMode - 是否返回详细计分日志 (用于 Tooltip)
     * @returns {number|Array} - 总分，或者包含详细信息的数组
     */
    calculateScore(detailMode = false) {
        this.scanGrid();
        let totalScore = 0;
        const detailLogs = []; // 用于存储每个单词的计分详情
        
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
            
            // 详细日志对象
            const log = {
                word: word,
                meaning: Dictionary.getMeaning(word), // 获取中文释义
                baseScore: 0,
                breakdown: [] // { desc: string, val: string }
            };
            
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
                const isEdge = coord.r === 0 || coord.r === this.rows - 1 || coord.c === 0 || coord.c === this.cols - 1;

                // 字母上下文
                const context = {
                    isCross: isCross,
                    isFirst: index === 0,
                    isLast: index === len - 1,
                    isDuplicate: charCounts[letter.char] >= 2,
                    isEdge: isEdge
                };

                // 获取字母有效分
                let letterScore = this.getLetterEffectiveScore(letter, context);

                // 应用地块倍率 (DL/TL) - 视为对该位置字母分数的乘法修正
                const tileType = cell.tileType;
                if (tileType === 'DL') { letterScore *= 2; }
                if (tileType === 'TL') { letterScore *= 3; }

                sumLetterFinal += letterScore;

                // 应用地块单词倍率 (DW/TW) - 累乘到 WordMult
                if (tileType === 'DW') wordMult *= 2;
                if (tileType === 'TW') wordMult *= 3;
            });
            
            log.baseScore = sumLetterFinal;

            // 2. 应用词根加值 (RootWordBuff)
            if (relicSystem.hasRelic('B04') && len % 2 !== 0) { rootWordBuff += 8; if(detailMode) log.breakdown.push({desc:'奇数魔杖', val:'+8'}); }
            if (relicSystem.hasRelic('C05') && this.spansCenter(wordItem)) { rootWordBuff += 10; if(detailMode) log.breakdown.push({desc:'桥梁工程师', val:'+10'}); }
            if (relicSystem.hasRelic('D01') && this.isVowel(word[0])) { rootWordBuff += 8; if(detailMode) log.breakdown.push({desc:'起跑器', val:'+8'}); }
            if (relicSystem.hasRelic('D08') && word.endsWith('ER')) { rootWordBuff += 8; if(detailMode) log.breakdown.push({desc:'ER人事局', val:'+8'}); }
            if (relicSystem.hasRelic('D09') && word.startsWith('UN')) { rootWordBuff += 8; if(detailMode) log.breakdown.push({desc:'没UN啊', val:'+8'}); }

            // 3. 应用单词倍率 (WordMult)
            // B类：长度策略
            if (relicSystem.hasRelic('B01') && len >= 2 && len <= 3) { wordMult *= 3; if(detailMode) log.breakdown.push({desc:'锋利短剑', val:'x3'}); }
            if (relicSystem.hasRelic('B02') && len >= 5 && len <= 6) { wordMult *= 2; if(detailMode) log.breakdown.push({desc:'长柄战斧', val:'x2'}); }
            if (relicSystem.hasRelic('B03') && len >= 7) { wordMult *= 1.5; if(detailMode) log.breakdown.push({desc:'冲锋长枪', val:'x1.5'}); }
            if (relicSystem.hasRelic('B05') && len % 2 === 0) { wordMult += 0.5; if(detailMode) log.breakdown.push({desc:'偶数大盾', val:'+0.5x'}); }
            
            // C类：结构
            if (relicSystem.hasRelic('C06') && this.touchesEdge(wordItem)) { wordMult *= 2; if(detailMode) log.breakdown.push({desc:'角落蜘蛛', val:'x2'}); }

            // D类：词缀
            if (relicSystem.hasRelic('D02') && word.endsWith('S')) { wordMult *= 1.25; if(detailMode) log.breakdown.push({desc:'终结技', val:'x1.25'}); }
            if (relicSystem.hasRelic('D03') && word.endsWith('ING')) { wordMult *= 2; if(detailMode) log.breakdown.push({desc:'押韵字典', val:'x2'}); }
            if (relicSystem.hasRelic('D04') && ['J','K','Q','X','Z'].includes(word[0])) { wordMult *= 2; if(detailMode) log.breakdown.push({desc:'贵族头冠', val:'x2'}); }
            if (relicSystem.hasRelic('D05') && len > 1 && word === word.split('').reverse().join('')) { wordMult *= 5; if(detailMode) log.breakdown.push({desc:'回文镜', val:'x5'}); }
            if (relicSystem.hasRelic('D10') && word.endsWith('LY')) { wordMult *= 1.25; if(detailMode) log.breakdown.push({desc:'懒得LY你', val:'x1.25'}); }

            // 计算单词层级分数
            const wordScore = (sumLetterFinal + rootWordBuff) * (len + lengthBuff) * wordMult;
            
            // 记录基础倍率信息 (始终显示长度倍率)
            if(detailMode) {
                // 将长度倍率作为第一项插入 breakdown
                const lengthVal = (len + lengthBuff).toFixed(1);
                // 只有当实际上有长度倍率时才显示 (len > 1 或有 buff)
                if (len > 1 || lengthBuff > 0) {
                    log.breakdown.unshift({desc: `长度倍率(${len})`, val: `x${lengthVal}`});
                }
            }

            // --- Layer 3: Intersection Bonus ---
            // FinalScore = WordScore * (CrossCount * CrossCountBuff + IndependentCrossMult)
            // 基础：0交叉=1倍, 1交叉=2倍, 2交叉=3倍... (CrossCount * 1 + 1)
            
            let crossCount = 0;
            let crossCountBuff = 1.0;  // 基础值为1，每个交叉点提供 +1 倍率
            let independentCrossMult = 1.0;  // 独立基础倍率
            let hasVowelCross = false;
            let hasConsonantCross = false; // For C03

            // C10: 独立日 - 强制 CrossCount = 2
            const independentDay = relicSystem.hasRelic('C10');

            if (independentDay) {
                crossCount = 2;
                if(detailMode) log.breakdown.push({desc:'独立日', val:'交叉=2'});
            } else {
                // C08: 天地大循环 - CrossCount + 2
                if (relicSystem.hasRelic('C08')) {
                    crossCount += 2;
                    if(detailMode) log.breakdown.push({desc:'天地大循环', val:'交叉+2'});
                }

                coords.forEach(coord => {
                    if (coordUsage.get(`${coord.r},${coord.c}`) > 1) {
                        crossCount++;
                        const letterChar = this.grid[coord.r][coord.c].letter.char;
                        if (this.isVowel(letterChar)) {
                            hasVowelCross = true;
                        } else {
                            hasConsonantCross = true;
                        }
                    }
                });
            }

            // C09: 交头接耳 (Head and Tail are cross points)
            // 需检查首尾是否为交叉点
            const isHeadCross = coordUsage.get(`${coords[0].r},${coords[0].c}`) > 1;
            const isTailCross = coordUsage.get(`${coords[len-1].r},${coords[len-1].c}`) > 1;
            
            if (relicSystem.hasRelic('C09') && isHeadCross && isTailCross) {
                crossCountBuff += 0.5;
                if(detailMode) log.breakdown.push({desc:'交头接耳', val:'+0.5/交'});
            }

            // C01 交通指挥棒：每个交叉点额外 +0.33 倍率 -> CrossCountBuff + 0.33
            if (relicSystem.hasRelic('C01')) { 
                crossCountBuff += 0.33; 
                if(detailMode && crossCount > 0) log.breakdown.push({desc:'指挥棒', val:'+0.33/交'}); 
            }

            // B06 4者为大：长度为 4 的单词，交叉点倍率修正 +0.5
            if (relicSystem.hasRelic('B06') && len === 4) {
                crossCountBuff += 0.5;
                if(detailMode && crossCount > 0) log.breakdown.push({desc:'4者为大', val:'+0.5/交'});
            }

            // C04 紧密元音：与元音交叉时，独立倍率 +0.5
            if (relicSystem.hasRelic('C04') && hasVowelCross) { 
                independentCrossMult += 0.5; 
                if(detailMode) log.breakdown.push({desc:'紧密元音', val:'+0.5x'}); 
            }
            
            // C03 连接辅音：与辅音交叉时，独立倍率 +0.5
            if (relicSystem.hasRelic('C03') && hasConsonantCross) { 
                independentCrossMult += 0.5; 
                if(detailMode) log.breakdown.push({desc:'连接辅音', val:'+0.5x'}); 
            }

            const intersectionMult = (crossCount * crossCountBuff) + independentCrossMult;
            
            if (detailMode && crossCount > 0) {
                 log.breakdown.push({desc: `交叉(${crossCount})`, val: `x${intersectionMult.toFixed(1)}`});
            } else if (detailMode && independentCrossMult > 1.0) {
                 // Even if crossCount is 0 (unlikely if C04/C03 triggers, but possible if counting logic changes), show independent mult
                 log.breakdown.push({desc: `交叉加成`, val: `x${intersectionMult.toFixed(1)}`});
            }

            const finalScore = wordScore * intersectionMult;
            const finalScoreInt = Math.floor(finalScore);
            
            log.totalScore = finalScoreInt;
            log.coords = coords; // 方便反查
            detailLogs.push(log);
            
            totalScore += finalScoreInt;
        });
        
        if (detailMode) return detailLogs;
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

    // --- 快照功能 ---
    getSnapshot() {
        return JSON.stringify(this.grid);
    }

    restoreSnapshot(jsonStr) {
        if (!jsonStr) return false;
        try {
            this.grid = JSON.parse(jsonStr);
            this.validWords = []; // reset valid words
            this.scanGrid(); // rescan
            return true;
        } catch (e) {
            console.error("Failed to restore snapshot:", e);
            return false;
        }
    }

    // 获取网格上的所有字母（用于快照恢复前的回收）
    getAllLetters() {
        const letters = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].letter) {
                    letters.push(this.grid[r][c].letter);
                }
            }
        }
        return letters;
    }

    // 清空网格并返回所有字母
    clearGridAndCollectLetters() {
        const letters = this.getAllLetters();
        this.clear();
        return letters;
    }

    // 从快照恢复网格，并从提供的字母池中扣除
    // 返回未使用的字母列表
    placeLettersFromSnapshot(snapshotGrid, availableLetters) {
        // 创建字母池的副本，方便查找和移除
        // 为了匹配具体的字母实例（可能带有特定属性），最好是引用匹配
        // 但快照中只保存了 grid 数据结构，我们需要匹配 storage 中的字母
        
        // 策略：
        // 1. 统计快照中需要的每种字母（Char）的数量
        // 2. 从 availableLetters 中按 Char 查找并取出字母对象
        // 3. 如果 availableLetters 不够（理论上不应该，因为是回滚），创建一个新的 Letter 对象（兜底）
        
        // 注意：snapshotGrid 是 JSON.parse 出来的对象结构，里面的 letter 是 plain object，不是 Letter 实例
        // 如果系统强依赖 Letter 实例的方法（目前好像没有，只是 data container），那 plain object 也行
        // 但最好保持一致性。
        
        // 这里的 availableLetters 是真正的 Letter 实例列表
        
        this.clear();
        const unusedLetters = [...availableLetters];
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cellData = snapshotGrid[r][c];
                if (cellData && cellData.letter) {
                    const char = cellData.letter.char;
                    // 尝试从 pool 中找到一个 char
                    const idx = unusedLetters.findIndex(l => l.char === char);
                    let letterToPlace;
                    
                    if (idx !== -1) {
                        letterToPlace = unusedLetters[idx];
                        unusedLetters.splice(idx, 1);
                    } else {
                        // 兜底：如果找不到（比如 bug 导致丢失），用快照里的数据重建
                        // 注意：快照里的 letter 是 plain object
                         letterToPlace = { ...cellData.letter };
                    }
                    
                    this.grid[r][c].letter = letterToPlace;
                    this.grid[r][c].tileType = cellData.tileType; // 恢复地块类型（如果有）
                } else if (cellData && cellData.tileType) {
                    this.grid[r][c].tileType = cellData.tileType;
                }
            }
        }
        
        this.scanGrid();
        return unusedLetters;
    }

    clear() {
        this.initGrid();
    }
}

export const gridSystem = new GridSystem();
