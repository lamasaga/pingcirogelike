import { CONFIG } from '../config.js';

/**
 * 全局状态管理 (Singleton模式)
 * 负责协调资金、分数、回合流程
 */
class GameState {
    constructor() {
        this.money = CONFIG.INITIAL_MONEY;
        this.currentScore = 0;
        this.targetScore = CONFIG.INITIAL_TARGET_SCORE;
        this.round = 1;
        this.gameStatus = 'ready'; // ready, playing, gameover, victory
        
        // 难度设置 (默认中等)
        this.difficultyConfig = CONFIG.DIFFICULTIES.MEDIUM; 

        // 观察者模式：简单的事件订阅，用于通知UI更新
        this.listeners = [];
        
        // 局外成长接口 (预留)
        this.permanentTraits = [];
        
        // 统计数据接口 (预留)
        this.sessionStats = {
            totalGoldSpent: 0,
            bestWord: '',
            highestRoundScore: 0
        };
        
        // 备选区/仓库 (改为动态数组，初始为空)
        this.storage = [];
        this.storageCapacity = 12; // 默认容量
    }

    // 添加到备选区
    addToStorage(letter) {
        if (this.storage.length < this.storageCapacity) {
            this.storage.push(letter);
            this.notify();
            return true;
        }
        return false;
    }

    // 从备选区移除
    removeFromStorage(index) {
        if (index >= 0 && index < this.storage.length) {
            const letter = this.storage.splice(index, 1)[0];
            this.notify();
            return letter;
        }
        return null;
    }

    // 订阅状态变化
    subscribe(callback) {
        this.listeners.push(callback);
    }

    // 通知所有监听者
    notify() {
        this.listeners.forEach(cb => cb(this));
    }

    // 消费金币
    spendMoney(amount) {
        if (this.money >= amount) {
            this.money -= amount;
            this.sessionStats.totalGoldSpent += amount;
            this.notify();
            return true;
        }
        return false;
    }
    
    // 增加金币
    addMoney(amount) {
        this.money += amount;
        this.notify();
    }

    // 增加分数
    addScore(points) {
        this.currentScore += points;
        if (points > this.sessionStats.highestRoundScore) {
            this.sessionStats.highestRoundScore = points;
        }
        this.notify();
    }

    // 开始新游戏
    startGame(difficultyKey) {
        const config = CONFIG.DIFFICULTIES[difficultyKey];
        if (!config) {
            console.error('Invalid difficulty:', difficultyKey);
            return;
        }

        this.difficultyConfig = config;
        this.resetGame();
        
        // 特殊模式初始化逻辑
        if (difficultyKey === 'HELL') {
            this.money = 21; // 地狱之路初始 21 金币
            // TODO: 设置 3 次免费刷新 (需要在 ShopSystem 中实现)
        }
    }

    // 检查回合结束条件
    // 参数 currentTotalScore 是当前盘面计算出的总分
    checkRoundEnd(currentTotalScore) {
        // 如果没有传入分数，尝试使用内部状态（但在当前架构下主要是由 GridSystem 计算）
        const scoreToCheck = (currentTotalScore !== undefined) ? currentTotalScore : this.currentScore;

        if (scoreToCheck >= this.targetScore) {
            // 通关当前关卡
            this.round++;
            
            // 检查是否达到胜利条件（通过最终关卡）
            const maxRound = this.difficultyConfig.maxRound || 15;
            if (this.round > maxRound) {
                // 胜利！
                this.gameStatus = 'victory';
                this.notify();
                return { success: true, victory: true };
            }
            
            // 根据难度配置计算新目标分
            if (typeof this.difficultyConfig.targetScoreFunc === 'function') {
                this.targetScore = this.difficultyConfig.targetScoreFunc(this.round);
            } else {
                // Fallback (虽然不应该发生)
                this.targetScore = Math.ceil(this.targetScore * (this.difficultyConfig.growthRate || 1.5));
            }
            
            // 恢复/奖励金币：基础 7 金币
            // 新规则：如果本回合没有购买任何字母，额外增加 1 块钱 (由外部传入标记或统计)
            // 暂时只实现基础 7 块，进阶逻辑后续添加
            let reward = 7;
            this.addMoney(reward); 
            
            // 检查是否触发遗物选择 (第 2, 4, 7, 11 回合开始前)
            // 修改为：地狱模式每轮都有机会刷新 (TODO)
            // 目前保持基础规则
            const triggerRelic = [2, 4, 7, 11].includes(this.round);

            this.notify();
            return { success: true, triggerRelic: triggerRelic };
        } else {
            // 失败
            this.gameStatus = 'gameover';
            this.notify();
            return { success: false };
        }
    }
    
    // 重置游戏
    resetGame() {
        this.money = CONFIG.INITIAL_MONEY;
        this.currentScore = 0;
        this.round = 1;
        
        // 计算初始目标分 (Round 1)
        if (typeof this.difficultyConfig.targetScoreFunc === 'function') {
            this.targetScore = this.difficultyConfig.targetScoreFunc(1);
        } else {
             this.targetScore = this.difficultyConfig.initialScore || 30;
        }

        this.gameStatus = 'playing'; // 重置后直接开始 playing
        
        // 重置遗物系统
        import('./RelicSystem.js').then(module => {
            module.relicSystem.reset();
        });

        // 重置备选区
        this.storage = []; 

        this.notify();
    }
}

// 导出单例
export const gameState = new GameState();
