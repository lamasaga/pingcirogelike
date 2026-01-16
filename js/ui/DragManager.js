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
        this.draggedItem = null; // { source: 'shop'|'grid', index: number|{r,c}, data: letterObj }
        this.ghostElement = null; // 跟随鼠标的视觉元素
        
        this.isDragging = false;
        
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('mouseup', (e) => this.onEnd(e));
        
        document.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onEnd(e));
    }

    // 开始拖拽
    // source: 'shop' | 'grid' | 'storage'
    // index: 数字(商店/备选区下标) 或 对象 {r, c} (网格坐标)
    startDrag(e, source, index, letterData) {
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
        this.draggedItem = { source, index, data: letterData };

        this.createGhost(e, letterData);
    }

    createGhost(e, letterData) {
        const ghost = document.createElement('div');
        ghost.classList.add('letter-card', 'ghost');
        
        // 恢复完整的卡片结构
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
        if (!this.isDragging) return;
        e.preventDefault();
        this.updateGhostPosition(e);
    }

    onEnd(e) {
        if (!this.isDragging) return;

        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

        // 检测落点
        const elementBelow = document.elementFromPoint(clientX, clientY);
        const gridCell = elementBelow ? elementBelow.closest('.grid-cell') : null;
        
        // 检测是否落在备选区/商店区
        const shopSection = elementBelow ? elementBelow.closest('.shop-section') : null;

        if (gridCell) {
            const r = parseInt(gridCell.dataset.row);
            const c = parseInt(gridCell.dataset.col);
            this.handleDropToGrid(r, c);
        } else if (shopSection) {
            // 如果落在下方区域，且当前视图是备选区，尝试放入备选区
            if (this.renderer.currentView === 'storage') {
                this.handleDropToStorage();
            } else {
                // 如果落在商店区，但当前是商店视图，暂不支持"卖回商店"
                // 可以回弹
            }
        }

        this.cleanup();
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
            // 备选区内部排序？暂时不做，忽略
            return;
        }

        if (source === 'grid') {
            // 网格 -> 备选区
            if (gameState.addToStorage(data)) {
                gridSystem.removeLetter(index.r, index.c);
                this.updateUI();
            }
        } else if (source === 'shop') {
            // 商店 -> 备选区 (购买)
            // 检查是否有空位
            const emptySlotIndex = gameState.storage.findIndex(s => s === null);
            if (emptySlotIndex !== -1) {
                // 再次确认购买 (扣钱)
                if (shopSystem.confirmPurchase(index)) {
                     gameState.addToStorage(data);
                     this.updateUI();
                }
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
    }
}