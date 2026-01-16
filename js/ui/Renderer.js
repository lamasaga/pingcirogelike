import { gameState } from '../core/GameState.js';
import { shopSystem } from '../core/ShopSystem.js';
import { gridSystem } from '../core/GridSystem.js';
import { relicSystem } from '../core/RelicSystem.js'; // Import RelicSystem
import { CONFIG } from '../config.js';
import Dictionary from '../utils/Dictionary.js';
import { RelicUI } from './RelicUI.js'; // Import RelicUI

export class Renderer {
    constructor(dragManager) {
        // DOM Elements
        this.elMoney = document.getElementById('money-val');
        this.elScore = document.getElementById('score-val');
        this.elTarget = document.getElementById('target-val');
        this.elShopContainer = document.getElementById('shop-container');
        this.elGridContainer = document.getElementById('grid-container');
        this.elRerollBtn = document.getElementById('btn-reroll');
        this.elSubmitBtn = document.getElementById('btn-submit');
        
        // Round Progress Elements (关卡进度)
        this.elRoundCurrent = document.getElementById('round-current');
        this.elRoundMax = document.getElementById('round-max');
        
        // Victory Modal Elements (胜利界面)
        this.elVictoryModal = document.getElementById('victory-modal');
        this.elVictoryDifficulty = document.getElementById('victory-difficulty');
        this.elVictoryRounds = document.getElementById('victory-rounds');
        this.elVictoryMoney = document.getElementById('victory-money');
        this.elVictoryRestartBtn = document.getElementById('btn-victory-restart');
        
        // Dictionary Modal Elements
        this.elDictBtn = document.getElementById('btn-dictionary');
        this.elDictModal = document.getElementById('dictionary-modal');
        this.elDictCloseBtn = document.getElementById('btn-close-dict');
        this.elDictSearch = document.getElementById('dict-search-input');
        this.elDictLengthFilter = document.getElementById('dict-length-filter');
        this.elDictResults = document.getElementById('dict-results');
        this.elDictClearBtn = document.getElementById('btn-clear-search');
        this.elDictStats = document.getElementById('dict-stats');

        // Help Modal Elements
        this.elHelpBtn = document.getElementById('btn-help');
        this.elHelpModal = document.getElementById('help-modal');
        this.elHelpCloseBtn = document.getElementById('btn-close-help');
        this.elHelpActionBtn = document.getElementById('btn-close-help-action');

        // Start Screen Elements
        this.elStartScreen = document.getElementById('start-screen');
        this.elDifficultyBtns = document.querySelectorAll('.btn-difficulty');
        this.elThemeBtns = document.querySelectorAll('.btn-theme');

        this.dragManager = null; // 稍后注入
        
        // Relic UI Init
        this.relicUI = new RelicUI(relicSystem);

        // UI State
        this.currentView = 'shop'; // 'shop' | 'storage'
        this.currentTheme = 'amber'; // 'amber' | 'rose' | 'sky'
    }

    setDragManager(dm) {
        this.dragManager = dm;
    }

    /**
     * 设置主题配色
     * @param {string} theme - 'amber' | 'rose' | 'sky'
     */
    setTheme(theme) {
        this.currentTheme = theme;
        
        // 移除所有主题，然后应用新主题
        if (theme === 'amber') {
            // 默认主题，移除 data-theme 属性
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        // 保存到 localStorage 以便下次访问时记住
        localStorage.setItem('gameTheme', theme);
        console.log(`主题已切换为: ${theme}`);
    }

    /**
     * 从 localStorage 加载保存的主题
     */
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('gameTheme') || 'amber';
        this.setTheme(savedTheme);
        
        // 更新按钮状态
        this.elThemeBtns.forEach(btn => {
            if (btn.dataset.theme === savedTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    init() {
        // 加载保存的主题配色
        this.loadSavedTheme();
        
        // 初始渲染
        this.renderStats();
        this.renderBottomPanel();
        this.renderGrid();
        this.bindUIEvents();
        
        // 显示开始界面 (而不是直接开始)
        // this.elStartScreen.classList.remove('hidden'); // HTML 中默认没有 hidden，就是显示的
    
        // 订阅状态变更
        gameState.subscribe(() => {
            this.renderStats();
            // 如果 view 是 storage，更新 storage 内容 (例如当物品从 storage 移出)
            if (this.currentView === 'storage') {
                this.renderBottomPanel();
            }
        });
    }

    bindUIEvents() {
        // 配色主题选择事件
        this.elThemeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.setTheme(theme);
                
                // 更新按钮状态
                this.elThemeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 难度选择事件
        this.elDifficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const diff = btn.dataset.diff;
                // 开始游戏
                gameState.startGame(diff);
                shopSystem.init(); // 确保商店初始化
                
                // 隐藏开始界面
                this.elStartScreen.classList.add('hidden');
                
                // 刷新UI
                this.renderGrid();
                this.renderBottomPanel();
                this.renderStats();
            });
        });

        // 刷新按钮
        this.elRerollBtn.addEventListener('click', () => {
            shopSystem.refreshStock();
            if (this.currentView !== 'shop') {
                this.switchView('shop');
            }
            this.renderBottomPanel();
        });

        // Tab 切换事件
        const btnTabShop = document.getElementById('btn-tab-shop');
        const btnTabStorage = document.getElementById('btn-tab-storage');
        
        if (btnTabShop) btnTabShop.addEventListener('click', () => this.switchView('shop'));
        if (btnTabStorage) btnTabStorage.addEventListener('click', () => this.switchView('storage'));

        // 提交按钮 (进入下一关逻辑)
        this.elSubmitBtn.addEventListener('click', () => {
            // 获取当前盘面实际分数
            const currentScore = gridSystem.calculateScore();
            // 加上可能存在的非盘面分数（如果有的话，目前主要是0）
            const totalScore = currentScore + gameState.currentScore;

            const result = gameState.checkRoundEnd(totalScore);
            
            if (result.success) {
                // 检查是否胜利
                if (result.victory) {
                    this.showVictoryModal();
                    return;
                }
                
                const nextStep = () => {
                    // gridSystem.clear(); // 不清空盘面，让玩家继续构建
                    shopSystem.refreshStock(true); // 免费刷新一次作为奖励
                    this.renderGrid();
                    this.renderBottomPanel();
                    this.renderStats(); // 确保目标分和金币更新
                };

                alert(`恭喜通关！\n\n目标达成！进入第 ${gameState.round} 关\n金币 +7\n新目标分: ${gameState.targetScore}`);

                if (result.triggerRelic) {
                    // 弹出遗物选择
                    const options = relicSystem.draftRelics(3);
                    this.relicUI.showSelectionModal(options, (selectedId) => {
                        relicSystem.addRelic(selectedId);
                        nextStep();
                    });
                } else {
                    nextStep();
                }
            } else {
                alert(`游戏失败！\n\n当前分数 ${totalScore} 未达到目标 ${gameState.targetScore}\n点击确定重新开始。`);
                // 失败后回到开始界面，而不是直接重置
                this.elStartScreen.classList.remove('hidden');
                gridSystem.clear(); // 失败重置时才清空
                // gameState.resetGame(); // 这步在点击难度按钮时会做
            }
        });
        
        // 胜利界面重开按钮
        if (this.elVictoryRestartBtn) {
            this.elVictoryRestartBtn.addEventListener('click', () => {
                this.hideVictoryModal();
                gridSystem.clear();
                this.elStartScreen.classList.remove('hidden');
            });
        }

        // 词典相关事件
        this.elDictBtn.addEventListener('click', () => {
            this.showDictionaryModal();
        });

        this.elDictCloseBtn.addEventListener('click', () => {
            this.hideDictionaryModal();
        });

        // 点击遮罩层关闭
        this.elDictModal.addEventListener('click', (e) => {
            if (e.target === this.elDictModal) {
                this.hideDictionaryModal();
            }
        });

        // 搜索输入
        const performSearch = () => {
            const query = this.elDictSearch.value.trim();
            const length = this.elDictLengthFilter.value;
            
            // 控制清除按钮显示
            if (query) {
                this.elDictClearBtn.classList.remove('hidden');
            } else {
                this.elDictClearBtn.classList.add('hidden');
            }

            this.renderDictResults(query, length);
        };

        this.elDictSearch.addEventListener('input', performSearch);
        this.elDictLengthFilter.addEventListener('change', performSearch);

        // 清除按钮
        this.elDictClearBtn.addEventListener('click', () => {
            this.elDictSearch.value = '';
            this.elDictSearch.focus();
            performSearch();
        });

        // 帮助相关事件
        this.elHelpBtn.addEventListener('click', () => {
            this.elHelpModal.classList.remove('hidden');
        });
        
        const closeHelp = () => {
            this.elHelpModal.classList.add('hidden');
        };
        
        this.elHelpCloseBtn.addEventListener('click', closeHelp);
        this.elHelpActionBtn.addEventListener('click', closeHelp);
        
        this.elHelpModal.addEventListener('click', (e) => {
            if (e.target === this.elHelpModal) {
                closeHelp();
            }
        });
    }

    showDictionaryModal() {
        this.elDictModal.classList.remove('hidden');
        
        // 重置状态
        this.elDictSearch.value = '';
        this.elDictLengthFilter.value = '';
        this.elDictClearBtn.classList.add('hidden');
        this.elDictResults.scrollTop = 0; // 滚动回顶部

        this.elDictSearch.focus();
        this.updateDictStats();
        // 初始显示
        this.renderDictResults('', ''); 
    }

    hideDictionaryModal() {
        this.elDictModal.classList.add('hidden');
    }

    updateDictStats() {
        const stats = Dictionary.getStats();
        this.elDictStats.textContent = `当前词库共 ${stats.total} 个单词`;
    }

    renderDictResults(query, length = null) {
        this.elDictResults.innerHTML = '';
        
        let results = {};
        if (!query && !length) {
            // 如果没有查询条件
            this.elDictResults.innerHTML = '<div style="padding:20px;text-align:center;color:#999">输入单词或选择长度开始搜索</div>';
            return;
        } else {
            results = Dictionary.search(query, length);
        }

        const words = Object.keys(results);
        const LIMIT = 50; // 限制显示数量，防止卡顿

        if (words.length === 0) {
            this.elDictResults.innerHTML = '<div style="padding:20px;text-align:center;color:#999">未找到匹配单词</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        
        // 只显示前 N 个结果
        const displayWords = words.slice(0, LIMIT);
        
        displayWords.forEach(word => {
            const item = document.createElement('div');
            item.className = 'dict-item';
            item.innerHTML = `
                <span class="dict-word">${word}</span>
                <span class="dict-meaning">${results[word]}</span>
            `;
            fragment.appendChild(item);
        });

        if (words.length > LIMIT) {
            const more = document.createElement('div');
            more.style.padding = '10px';
            more.style.textAlign = 'center';
            more.style.color = '#999';
            more.style.fontStyle = 'italic';
            more.textContent = `... 还有 ${words.length - LIMIT} 个结果，请细化搜索 ...`;
            fragment.appendChild(more);
        }

        this.elDictResults.appendChild(fragment);
    }

    renderStats() {
        this.elMoney.textContent = gameState.money;
        
        // 动态计算当前分数并显示
        const currentGridScore = gridSystem.calculateScore();
        this.elScore.textContent = gameState.currentScore + currentGridScore; // 现有分+盘面分
        
        this.elTarget.textContent = gameState.targetScore;
        
        // 更新关卡进度显示
        if (this.elRoundCurrent) {
            this.elRoundCurrent.textContent = gameState.round;
        }
        if (this.elRoundMax) {
            const maxRound = gameState.difficultyConfig.maxRound || 15;
            this.elRoundMax.textContent = maxRound;
        }
    }
    
    /**
     * 显示胜利模态框
     */
    showVictoryModal() {
        if (!this.elVictoryModal) return;
        
        // 更新胜利统计信息
        if (this.elVictoryDifficulty) {
            this.elVictoryDifficulty.textContent = gameState.difficultyConfig.name || '未知';
        }
        if (this.elVictoryRounds) {
            const maxRound = gameState.difficultyConfig.maxRound || 15;
            this.elVictoryRounds.textContent = maxRound;
        }
        if (this.elVictoryMoney) {
            this.elVictoryMoney.textContent = gameState.money;
        }
        
        // 显示模态框
        this.elVictoryModal.classList.remove('hidden');
    }
    
    /**
     * 隐藏胜利模态框
     */
    hideVictoryModal() {
        if (this.elVictoryModal) {
            this.elVictoryModal.classList.add('hidden');
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // 更新 Tab 样式
        const shopTab = document.getElementById('btn-tab-shop');
        const storageTab = document.getElementById('btn-tab-storage');
        const rerollBtn = document.getElementById('btn-reroll');

        if (view === 'shop') {
            shopTab.classList.add('active');
            storageTab.classList.remove('active');
            rerollBtn.classList.remove('hidden'); // 显示刷新按钮
        } else {
            shopTab.classList.remove('active');
            storageTab.classList.add('active');
            rerollBtn.classList.add('hidden'); // 隐藏刷新按钮
        }

        this.renderBottomPanel();
    }

    renderBottomPanel() {
        this.elShopContainer.innerHTML = '';
        
        let items = [];
        let source = '';

        if (this.currentView === 'shop') {
            items = shopSystem.stock;
            source = 'shop';
        } else {
            items = gameState.storage;
            source = 'storage';
        }

        items.forEach((letter, index) => {
            const slot = document.createElement('div');
            slot.className = 'shop-slot'; // 复用样式
            
            if (letter) {
                const card = this.createLetterCard(letter);
                
                // 如果是商店，显示价格 (可选，但为了简洁目前省略，用户知道是 $3)
                if (source === 'shop') {
                    // card.title = "Cost: $3";
                }

                // 绑定拖拽
                this.attachDragEvents(card, source, index, letter);
                slot.appendChild(card);
            } else {
                slot.classList.add('empty');
            }
            this.elShopContainer.appendChild(slot);
        });
    }

    renderShop() {
        this.renderBottomPanel();
    }

    renderGrid() {
        // 渲染前强制更新单词状态，确保高亮是实时的
        gridSystem.scanGrid();

        // 计算交叉点 (供 UI 高亮使用)
        const coordUsage = new Map();
        gridSystem.validWords.forEach(item => {
            item.coords.forEach(coord => {
                const key = `${coord.r},${coord.c}`;
                coordUsage.set(key, (coordUsage.get(key) || 0) + 1);
            });
        });

        this.elGridContainer.innerHTML = '';
        // 设置 CSS Grid 样式
        this.elGridContainer.style.gridTemplateColumns = `repeat(${CONFIG.GRID.COLS}, 1fr)`;

        for (let r = 0; r < CONFIG.GRID.ROWS; r++) {
            for (let c = 0; c < CONFIG.GRID.COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const cellData = gridSystem.grid[r][c];
                
                // 渲染地块倍率 (Tile Type)
                if (cellData.tileType) {
                    cell.classList.add(cellData.tileType.toLowerCase());
                    const badge = document.createElement('span');
                    badge.className = 'tile-badge';
                    badge.textContent = cellData.tileType;
                    cell.appendChild(badge);
                }

                const letter = cellData.letter;
                if (letter) {
                    const card = this.createLetterCard(letter);
                    
                    // 检查是否是有效单词的一部分，添加高亮
                    if (gridSystem.isValidCell(r, c)) {
                        card.classList.add('valid-word');
                    }

                    // 检查是否是交叉点，添加橘色光晕
                    const isCross = coordUsage.get(`${r},${c}`) > 1;
                    if (isCross) {
                        card.classList.add('cross-highlight');
                    }
                    
                    // 绑定拖拽：从 Grid 到 Grid
                    this.attachDragEvents(card, 'grid', {r, c}, letter);
                    cell.appendChild(card);
                }

                this.elGridContainer.appendChild(cell);
            }
        }
        
        // 每次盘面变化都更新分数预览
        this.renderStats();
    }

    createLetterCard(letter) {
        const div = document.createElement('div');
        div.className = 'letter-card';
        
        // 获取有效分数 (目前仅包含固有属性增强，暂不包含位置/上下文增强)
        // 如果需要显示上下文增强(如"首字母x2")，需要传入 context，但这需要 calculateScore 先运行并缓存结果
        const effectiveScore = gridSystem.getLetterEffectiveScore(letter);
        const baseScore = letter.score || 0;
        
        let scoreHtml = `<span class="score">${baseScore}</span>`;
        if (effectiveScore > baseScore) {
            scoreHtml = `<span class="score buffed">${effectiveScore}</span>`;
        }

        div.innerHTML = `
            <span class="char">${letter.char}</span>
            ${scoreHtml}
        `;
        return div;
    }
    
    // 统一绑定事件
    attachDragEvents(element, source, index, letterData) {
        if (!this.dragManager) return;
        
        element.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // 防止冒泡
            this.dragManager.startDrag(e, source, index, letterData);
        });
        element.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.dragManager.startDrag(e, source, index, letterData);
        });
    }
}
