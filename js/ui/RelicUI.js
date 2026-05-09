/**
 * 遗物系统 UI 控制器
 */
export class RelicUI {
    constructor(relicSystem) {
        this.relicSystem = relicSystem;
        this.modal = document.getElementById('relic-selection-modal');
        this.container = document.getElementById('relic-options-container');
        this.panel = document.querySelector('.trinket-panel');
        
        // 绑定数据更新
        this.relicSystem.subscribe((ownedRelics) => {
            this.updatePanel(ownedRelics);
        });
    }

    /**
     * 显示三选一模态框
     * @param {Array} options - 遗物对象数组
     * @param {Function} onSelect - 选择回调 (relicId) => void
     */
    showSelectionModal(options, onSelect) {
        this.container.innerHTML = ''; // 清空旧选项

        options.forEach(relic => {
            const card = document.createElement('div');
            card.className = `relic-card ${relic.rarity.toLowerCase()}`;
            
            let iconContent;
            if (relic.icon) {
                iconContent = `<img src="${relic.icon}" class="relic-icon-img" alt="${relic.name}">`;
            } else {
                iconContent = `<span class="icon-text">${this.getIconForRelic(relic)}</span>`;
            }

            card.innerHTML = `
                <div class="relic-icon-wrapper">
                    ${iconContent}
                </div>
                <div class="relic-info">
                    <h3 class="relic-name">
                        ${relic.name}
                        <span class="relic-tag">${this.getRarityName(relic.rarity)}</span>
                    </h3>
                    <p class="relic-desc">${relic.description}</p>
                </div>
            `;

            card.addEventListener('click', () => {
                this.hideModal();
                onSelect(relic.id);
            });

            this.container.appendChild(card);
        });

        this.modal.classList.remove('hidden');
    }

    hideModal() {
        this.modal.classList.add('hidden');
    }

    /**
     * 更新顶部遗物栏
     */
    updatePanel(ownedRelics) {
        // 清空现有 slot，或者根据遗物数量重新生成
        // 现有 HTML: <div class="trinket-panel"> <div class="trinket-slot" title="饰品位">+</div> ... </div>
        
        // 简单策略：重建整个 panel 的内容
        this.panel.innerHTML = '';

        // 1. 渲染已有的遗物
        ownedRelics.forEach(relic => {
            const slot = document.createElement('div');
            slot.className = `trinket-slot has-relic ${relic.rarity.toLowerCase()}`;
            slot.title = `${relic.name}\n${relic.description}`;
            
            if (relic.icon) {
                slot.innerHTML = `<img src="${relic.icon}" class="trinket-icon-img" alt="${relic.name}">`;
            } else {
                slot.innerHTML = `<span class="icon-text">${this.getIconForRelic(relic)}</span>`;
            }
            
            this.panel.appendChild(slot);
        });

        // 2. 补齐空位 (保持至少 3 个，或者是 4 个因为有 4 次获取机会)
        const totalSlots = 4; 
        const emptySlots = Math.max(0, totalSlots - ownedRelics.length);
        
        for (let i = 0; i < emptySlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'trinket-slot';
            slot.title = '遗物位';
            // 第一个空位可以显示 "+" 号提示
            if (i === 0 && ownedRelics.length < totalSlots) {
                slot.textContent = '+';
            }
            this.panel.appendChild(slot);
        }
    }

    // 辅助：获取遗物图标 (暂时用首字母或 Emoji)
    getIconForRelic(relic) {
        // 这里可以根据 relic.type 返回不同的 emoji
        const typeMap = {
            'LETTER_BUFF': '🅰️',
            'LENGTH_STRATEGY': '📏',
            'STRUCTURE': '🏗️',
            'AFFIX': '🔗',
            'BOARD_BUFF': '✨',
            'SPECIAL': '🎁'
        };
        return typeMap[relic.type] || '💎';
    }

    // 辅助：获取稀有度中文名
    getRarityName(rarity) {
        const map = {
            'COMMON': '普通',
            'RARE': '稀有',
            'EPIC': '史诗',
            'LEGENDARY': '传说'
        };
        return map[rarity] || rarity;
    }
}
