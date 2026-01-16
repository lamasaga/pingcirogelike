import { CONFIG } from '../config.js';
import { getRandomLetter } from '../utils/MathHelpers.js';
import { gameState } from './GameState.js';

/**
 * 商店系统
 * 负责生成备选字母、处理购买逻辑
 */
class ShopSystem {
    constructor() {
        this.stock = []; // 当前商店里的字母
        this.maxSlots = 10; // 商店槽位 (两排)
    }

    // 初始化商店
    init() {
        this.refreshStock(true); // 首次刷新免费或由外部控制
    }

    // 刷新商品
    refreshStock(isFree = false) {
        if (!isFree) {
            if (!gameState.spendMoney(CONFIG.COST.REFRESH_SHOP)) {
                return false; // 钱不够
            }
        }

        this.stock = [];
        for (let i = 0; i < this.maxSlots; i++) {
            const letter = getRandomLetter(
                CONFIG.LETTERS.VOWELS,
                CONFIG.LETTERS.CONSONANTS,
                CONFIG.PROBABILITY.VOWEL_WEIGHT,
                CONFIG.PROBABILITY.CONSONANT_WEIGHT
            );
            this.stock.push(letter);
        }
        return true;
    }

    // 尝试购买字母 (返回字母对象或null)
    buyLetter(index) {
        if (index < 0 || index >= this.stock.length) return null;
        if (!this.stock[index]) return null; // 已经被买走了

        // 检查余额
        if (gameState.money >= CONFIG.COST.BUY_LETTER) {
            // 扣钱在拖拽成功后由外部逻辑触发？
            // 或者：拖拽开始时并不扣钱，放置成功才扣钱。
            // 这里我们提供一个 check 接口和一个 transaction 接口
            return this.stock[index];
        }
        return null;
    }
    
    // 确认交易完成（从商店移除该字母并扣钱）
    confirmPurchase(index) {
         if (gameState.spendMoney(CONFIG.COST.BUY_LETTER)) {
             const letter = this.stock[index];
             this.stock[index] = null; // 留空或者移除? 参考小丑牌通常是留空
             return letter;
         }
         return null;
    }
}

export const shopSystem = new ShopSystem();
