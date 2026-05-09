import { gameState } from '../core/GameState.js';
import { shopSystem } from '../core/ShopSystem.js';
import { gridSystem } from '../core/GridSystem.js';

/**
 * 拖拽管理器
 * 处理鼠标/触摸事件，实现字母从商店到网格的移动
 */
export class DragManager {
    constructor(renderer) {
        this.renderer = renderer;
        // 单个拖拽：{ source, index, data }
        // 多个拖拽：{ source: 'grid', items: [ {r, c, data, offsetX, offsetY} ] }
        this.draggedItem = null; 
        
        // Ghost Elements 容器
        this.ghostContainer = null;
        
        this.isDragging = false;
        
        // 框选相关
        this.isSelecting = false;
        this.selectionStart = null; // {x, y}
        this.selectionBox = null;
        this.selectedCells = new Set(); // Set of "r,c" strings
        
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('mouseup', (e) => this.onEnd(e));
        
        // Touch events (simplified, no multi-select for touch yet)
        document.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onEnd(e));
    }

    onMouseDown(e) {
        // 只有左键点击且没有在拖拽物体时才可能触发框选
        if (e.button !== 0) return;
        
        // 允许在 grid-section 或 grid-container 内点击触发框选
        const gridSection = e.target.closest('.grid-section');
        const gridContainer = e.target.closest('.grid-container');
        const gridCell = e.target.closest('.grid-cell');
        const letterCard = e.target.closest('.letter-card');

        // Case 1: Start Dragging 
        // 实际上 startDrag 是由 Renderer 里的 mousedown 触发的
        // 但如果点击的是已选中的卡片，我们需要在这里（或者在 startDrag 里）拦截
        // 由于 Renderer 阻止了冒泡，所以点击卡片时，这个 onMouseDown 不会执行
        // 因此这里只需要处理框选
        
        if (letterCard) return; // 交给 startDrag 处理

        // Case 2: Start Selection
        // 点击区域在 Grid 区域内，且不是交互元素
        if ((gridContainer || gridSection) && !gridCell) {
            e.preventDefault();
            this.startSelection(e);
        } else {
            // 点击其他地方，清空选择
            if (!this.isDragging) {
                this.clearSelection();
            }
        }
    }

    // --- Selection Logic ---
    startSelection(e) {
        this.isSelecting = true;
        this.selectionStart = { x: e.clientX, y: e.clientY };
        
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.left = e.clientX + 'px';
        this.selectionBox.style.top = e.clientY + 'px';
        document.body.appendChild(this.selectionBox);
        
        this.clearSelection();
    }

    updateSelection(e) {
        if (!this.isSelecting || !this.selectionBox) return;
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        const minX = Math.min(this.selectionStart.x, currentX);
        const minY = Math.min(this.selectionStart.y, currentY);
        const width = Math.abs(currentX - this.selectionStart.x);
        const height = Math.abs(currentY - this.selectionStart.y);
        
        this.selectionBox.style.left = minX + 'px';
        this.selectionBox.style.top = minY + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
        
        // 碰撞检测：高亮选中的格子
        this.checkSelectionCollision(minX, minY, width, height);
    }

    checkSelectionCollision(x, y, w, h) {
        const cells = document.querySelectorAll('.grid-cell');
        this.selectedCells.clear();
        
        cells.forEach(cell => {
            const rect = cell.getBoundingClientRect();
            // 简单的 AABB 碰撞
            if (x < rect.right && x + w > rect.left && y < rect.bottom && y + h > rect.top) {
                // 只有当格子有字母时才选中
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                if (gridSystem.getLetter(r, c)) {
                    this.selectedCells.add(`${r},${c}`);
                    cell.querySelector('.letter-card').classList.add('selected');
                }
            } else {
                const card = cell.querySelector('.letter-card');
                if (card) card.classList.remove('selected');
            }
        });
    }

    endSelection() {
        this.isSelecting = false;
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
    }

    clearSelection() {
        this.selectedCells.clear();
        document.querySelectorAll('.letter-card.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    // --- Drag Logic ---

    // 开始多选拖拽
    startMultiDrag(e) {
        const items = [];
        const startX = e.clientX;
        const startY = e.clientY;
        
        // 收集所有选中的字母
        this.selectedCells.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const letter = gridSystem.getLetter(r, c);
            if (letter) {
                // 计算相对位置
                const cell = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
                const rect = cell.getBoundingClientRect();
                items.push({
                    r, c,
                    data: letter,
                    offsetX: rect.left - startX, // 相对鼠标的偏移
                    offsetY: rect.top - startY
                });
            }
        });
        
        if (items.length === 0) return;

        this.isDragging = true;
        this.draggedItem = { source: 'grid-multi', items: items };
        
        this.createMultiGhost(items, startX, startY);
    }

    createMultiGhost(items, startX, startY) {
        this.ghostContainer = document.createElement('div');
        this.ghostContainer.style.position = 'fixed';
        this.ghostContainer.style.left = startX + 'px';
        this.ghostContainer.style.top = startY + 'px';
        this.ghostContainer.style.pointerEvents = 'none';
        this.ghostContainer.style.zIndex = '1000';
        
        items.forEach(item => {
            const ghost = document.createElement('div');
            ghost.className = 'letter-card ghost';
            ghost.innerHTML = `<span class="char">${item.data.char}</span><span class="score">${item.data.score}</span>`;
            ghost.style.position = 'absolute';
            ghost.style.left = item.offsetX + 'px';
            ghost.style.top = item.offsetY + 'px';
            // 修正 ghost 样式，使其看起来像普通的 card
            ghost.style.width = 'var(--cell-size)';
            ghost.style.height = 'var(--cell-size)';
            
            this.ghostContainer.appendChild(ghost);
        });
        
        document.body.appendChild(this.ghostContainer);
    }

    // 普通单选拖拽 (兼容旧接口)
    startDrag(e, source, index, letterData) {
        // 检查是否点击了已选中的网格项 (触发多选拖拽)
        if (source === 'grid' && index && typeof index === 'object') {
            const key = `${index.r},${index.c}`;
            if (this.selectedCells.has(key)) {
                // 如果是多选状态，且选中的不止这一个
                // 转入多选拖拽逻辑
                this.startMultiDrag(e);
                return;
            }
        }
        
        // 点击了未选中的，清空之前的选择
        this.clearSelection();

        // 检查钱够不够 (如果是从商店拖拽)
        if (source === 'shop') {
             const canBuy = shopSystem.buyLetter(index); 
             if (!canBuy) {
                 console.log("Not enough money");
                 return; // TODO: 视觉反馈
             }
        }

        e.preventDefault();
        this.isDragging = true;
        
        // 构造单项 draggedItem
        this.draggedItem = { source, index, data: letterData };
        this.createGhost(e, letterData);
    }

    createGhost(e, letterData) {
        const ghost = document.createElement('div');
        ghost.classList.add('letter-card', 'ghost');
        ghost.innerHTML = `
            <span class="char">${letterData.char}</span>
            <span class="score">${letterData.score}</span>
        `;
        ghost.style.position = 'fixed';
        ghost.style.zIndex = '1000';
        ghost.style.pointerEvents = 'none'; 
        document.body.appendChild(ghost);
        this.ghostElement = ghost;
        this.updateGhostPosition(e);
    }

    updateGhostPosition(e) {
        if (!this.ghostElement) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        this.ghostElement.style.left = (clientX - 25) + 'px'; 
        this.ghostElement.style.top = (clientY - 35) + 'px'; 
    }

    onMove(e) {
        if (this.isSelecting) {
            this.updateSelection(e);
            return;
        }

        if (!this.isDragging) return;
        e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        if (this.ghostElement) {
            this.updateGhostPosition(e);
        } else if (this.ghostContainer) {
            this.ghostContainer.style.left = clientX + 'px';
            this.ghostContainer.style.top = clientY + 'px';
        }
    }

    onEnd(e) {
        if (this.isSelecting) {
            this.endSelection();
            return;
        }

        if (!this.isDragging) return;

        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

        // 多选拖拽结束
        if (this.draggedItem.source === 'grid-multi') {
            this.handleMultiDrop(clientX, clientY);
        } else {
            // 原有的单选拖拽结束逻辑
            const elementBelow = document.elementFromPoint(clientX, clientY);
            const gridCell = elementBelow ? elementBelow.closest('.grid-cell') : null;
            const storageContainer = elementBelow ? elementBelow.closest('#storage-container') : null;
            const shopSection = elementBelow ? elementBelow.closest('.shop-section') : null;

            if (gridCell) {
                const r = parseInt(gridCell.dataset.row);
                const c = parseInt(gridCell.dataset.col);
                this.handleDropToGrid(r, c);
            } else if (storageContainer) {
                this.handleDropToStorage();
            } else if (shopSection && this.renderer.currentView === 'storage' && !storageContainer) {
                 this.handleDropToStorage();
            }
        }

        this.cleanup();
    }

    handleMultiDrop(clientX, clientY) {
        const items = this.draggedItem.items;
        
        // 1. 临时移除所有源位置字母，避免自我碰撞
        // 我们需要先保存它们的原始位置和数据，以便回滚
        const originalLetters = [];
        items.forEach(item => {
            const letter = gridSystem.removeLetter(item.r, item.c);
            // 注意：这里 letter 应该等于 item.data，但为了安全起见使用 remove 返回的
            originalLetters.push({ r: item.r, c: item.c, letter: letter || item.data });
        });

        // 2. 计算目标位置
        const targetPositions = [];
        let validDrop = true;
        
        // 获取 ghostContainer 的位置
        const containerRect = this.ghostContainer.getBoundingClientRect();
        
        // 隐藏 ghost 以便 elementFromPoint 能穿透
        this.ghostContainer.style.display = 'none';

        for (const item of items) {
            const itemX = containerRect.left + item.offsetX + 20; // +20 center offset (assuming 40-50px cell)
            const itemY = containerRect.top + item.offsetY + 20;
            
            const el = document.elementFromPoint(itemX, itemY);
            const cell = el ? el.closest('.grid-cell') : null;
            
            if (cell) {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                
                // 检查是否在目标列表中重复（防止多个卡片挤到一个格子）
                if (targetPositions.some(p => p.targetR === r && p.targetC === c)) {
                    validDrop = false; break;
                }
                
                targetPositions.push({ ...item, targetR: r, targetC: c });
            } else {
                // 落到了网格外面
                validDrop = false;
                break;
            }
        }

        this.ghostContainer.style.display = 'block';
        
        if (validDrop) {
            // 3. 冲突检测：检查所有目标位置是否为空
            // 因为我们已经在步骤1中移除了源字母，所以：
            // - 如果目标是空位，没问题
            // - 如果目标是原来的某个源位置（现在已空），也没问题
            // - 如果目标还有字母，说明是没被选中的其他字母，这就冲突了
            
            let hasConflict = false;
            for (const pos of targetPositions) {
                if (gridSystem.getLetter(pos.targetR, pos.targetC)) {
                    hasConflict = true;
                    break;
                }
            }
            
            if (!hasConflict) {
                // 4. 放置新位置
                targetPositions.forEach(pos => {
                    gridSystem.placeLetter(pos.targetR, pos.targetC, pos.data);
                });
                // 成功，清空选择
                this.clearSelection();
                this.updateUI();
            } else {
                // 有冲突，回滚到原位
                this.revertMultiDrop(originalLetters);
            }
        } else {
            // 落到了无效区域，回滚到原位
            this.revertMultiDrop(originalLetters);
        }
    }
    
    // 辅助：回滚多选拖拽
    revertMultiDrop(originalLetters) {
        originalLetters.forEach(item => {
            // 这里不需要 check，因为我们知道这些位置刚刚被我们清空了
            // 除非逻辑错乱导致同一位置被覆盖，但 remove 是一次性的
            gridSystem.placeLetter(item.r, item.c, item.letter);
        });
        console.log("Multi-drop reverted due to conflict or invalid target.");
    }

    handleDropToGrid(r, c) {
        const { source, index, data } = this.draggedItem;

        if (source === 'shop') {
            // 商店 -> 网格
            if (gridSystem.placeLetter(r, c, data)) {
                shopSystem.confirmPurchase(index);
                this.updateUI();
            }
        } else if (source === 'storage') {
             // 备选区 -> 网格
             if (gridSystem.placeLetter(r, c, data)) {
                 gameState.removeFromStorage(index);
                 this.updateUI();
             }
        } else if (source === 'grid') {
            // 网格 -> 网格 (移动)
            const oldR = index.r;
            const oldC = index.c;

            // 如果是原位置，忽略
            if (oldR === r && oldC === c) return;

            // 1. 先把原来的拿走
            gridSystem.removeLetter(oldR, oldC);
            
            // 2. 尝试放到新位置
            if (gridSystem.placeLetter(r, c, data)) {
                // 成功
                this.updateUI();
            } else {
                // 失败或交换
                const targetLetter = gridSystem.getLetter(r, c);
                if (targetLetter) {
                    // 交换逻辑
                    gridSystem.removeLetter(r, c); 
                    gridSystem.placeLetter(r, c, data); 
                    gridSystem.placeLetter(oldR, oldC, targetLetter); 
                    this.updateUI();
                } else {
                    // 纯粹失败，放回原处
                    gridSystem.placeLetter(oldR, oldC, data);
                }
            }
        }
    }

    handleDropToStorage() {
        const { source, index, data } = this.draggedItem;
        
        if (source === 'storage') {
            return;
        }

        if (source === 'grid') {
            if (gameState.addToStorage(data)) {
                gridSystem.removeLetter(index.r, index.c);
                this.updateUI();
            }
        } else if (source === 'shop') {
            const emptySlotIndex = gameState.storage.findIndex(s => s === null);
            // 这里的 check 可能有点问题，因为 storage 现在是动态数组
            // 只要没满就行
            if (gameState.addToStorage(data)) { // addToStorage return bool
                 shopSystem.confirmPurchase(index);
                 this.updateUI();
            }
        }
    }

    updateUI() {
        this.renderer.renderShop();
        this.renderer.renderGrid();
        this.renderer.renderStats();
    }

    cleanup() {
        this.isDragging = false;
        this.draggedItem = null;
        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }
        if (this.ghostContainer) {
            this.ghostContainer.remove();
            this.ghostContainer = null;
        }
        // Selection cleanup
        // this.clearSelection(); // 拖拽结束后是否保留选择？通常保留方便连续操作，或者不保留。根据用户习惯，这里保留比较好。
    }
}
