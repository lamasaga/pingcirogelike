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
        
        // 备选区/仓库 (固定 8 个槽位)
        this.storage = Array(8).fill(null);
    }

    // 添加到备选区
    addToStorage(letter) {
        // 找第一个空位
        const index = this.storage.findIndex(slot => slot === null);
        if (index !== -1) {
            this.storage[index] = letter;
            this.notify();
            return true;
        }
        return false;
    }

    // 从备选区移除
    removeFromStorage(index) {
        if (index >= 0 && index < this.storage.length) {
            const letter = this.storage[index];
            this.storage[index] = null;
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
            
            // 根据难度增长率计算新目标分 (向上取整)
            this.targetScore = Math.ceil(this.targetScore * this.difficultyConfig.growthRate);
            
            // 恢复/奖励金币：根据需求恢复7金币，这里实现为增加7金币
            this.addMoney(7); 
            
            // 检查是否触发遗物选择 (第 2, 4, 7, 11 回合开始前)
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
        // 使用当前难度配置的初始分
        this.targetScore = this.difficultyConfig.initialScore;
        this.round = 1;
        this.gameStatus = 'playing'; // 重置后直接开始 playing
        
        // 重置遗物系统
        // 这里需要引入 relicSystem，但为了避免循环引用，我们可以通过全局事件或注入方式
        // 但最简单的方式是直接在这里引入（ES Module 支持循环引用，只要不是初始化时立即调用）
        // 或者让外部控制器负责重置 relicSystem。这里我们假设外部控制器会处理，或者使用 notify。
        // 为了确保逻辑完整，我们在 GameState 中触发一个 reset 事件
        // this.notify('reset'); // 简单的 notify 不带参数，但我们可以约定
        
        // 修正：在 main.js 或 UI 层调用 relicSystem.reset() 会更好
        // 但既然 GameState 是核心，我们最好在这里处理。
        // 由于循环引用问题，我们可以在 Renderer 中监听 reset。
        // 也可以在这里使用动态 import
        import('./RelicSystem.js').then(module => {
            module.relicSystem.reset();
        });

        // 重置备选区
        this.storage = Array(8).fill(null); 

        this.notify();
    }
}

// 导出单例
export const gameState = new GameState();
