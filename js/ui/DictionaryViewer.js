import Dictionary from '../utils/Dictionary.js';

/**
 * 词典查看器 UI 组件
 * 处理词典弹窗的显示、搜索和渲染
 */
export class DictionaryViewer {
    constructor() {
        // DOM 元素引用
        this.modal = document.getElementById('dictionary-modal');
        this.btnOpen = document.getElementById('btn-dictionary');
        this.btnClose = document.getElementById('btn-close-dict');
        this.searchInput = document.getElementById('dict-search-input');
        this.resultsContainer = document.getElementById('dict-results');
        this.statsElement = document.getElementById('dict-stats');

        // 状态
        this.pageSize = 50; // 每页显示数量
        this.currentPage = 1;
        this.currentResults = []; // 当前搜索/筛选结果 [key, value]
        
        // 绑定事件
        this.initEvents();
    }

    /**
     * 初始化事件监听
     */
    initEvents() {
        if (this.btnOpen) {
            this.btnOpen.addEventListener('click', () => this.open());
        }
        
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.close());
        }

        // 点击模态框外部关闭
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }

        // 搜索输入防抖
        if (this.searchInput) {
            let timeout;
            this.searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }

        // 滚动加载更多 (简单的无限滚动)
        if (this.resultsContainer) {
            this.resultsContainer.addEventListener('scroll', () => {
                if (this.resultsContainer.scrollTop + this.resultsContainer.clientHeight >= this.resultsContainer.scrollHeight - 50) {
                    this.loadMore();
                }
            });
        }
    }

    /**
     * 打开词典
     */
    open() {
        this.modal.classList.remove('hidden');
        this.updateStats();
        // 默认显示所有单词（或前N个）
        if (this.currentResults.length === 0) {
            this.handleSearch('');
        }
    }

    /**
     * 关闭词典
     */
    close() {
        this.modal.classList.add('hidden');
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const stats = Dictionary.getStats();
        if (this.statsElement) {
            this.statsElement.textContent = `共收录 ${stats.total} 个单词`;
        }
    }

    /**
     * 处理搜索
     * @param {string} query 
     */
    handleSearch(query) {
        this.currentPage = 1;
        this.resultsContainer.innerHTML = ''; // 清空列表

        let resultsObj = {};
        if (!query || query.trim() === '') {
            // 如果搜索为空，显示所有（按字母顺序，这里其实是按 Dictionary 对象的顺序）
            // 考虑到性能，直接获取所有引用
            resultsObj = Dictionary.getAllWords();
        } else {
            resultsObj = Dictionary.search(query);
        }

        // 转换为数组 [word, meaning] 并按字母顺序排序
        this.currentResults = Object.entries(resultsObj).sort((a, b) => a[0].localeCompare(b[0]));
        
        // 渲染第一页
        this.renderPage();
    }

    /**
     * 加载更多（分页渲染）
     */
    loadMore() {
        const totalPages = Math.ceil(this.currentResults.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderPage();
        }
    }

    /**
     * 渲染当前页的数据
     */
    renderPage() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.currentResults.slice(start, end);

        if (pageData.length === 0 && this.currentPage === 1) {
            this.resultsContainer.innerHTML = '<div class="dict-item" style="justify-content:center; color:#999;">未找到匹配单词</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        
        pageData.forEach(([word, meaning]) => {
            const item = document.createElement('div');
            item.className = 'dict-item';
            
            const wordEl = document.createElement('span');
            wordEl.className = 'dict-word';
            wordEl.textContent = word;
            
            const meaningEl = document.createElement('span');
            meaningEl.className = 'dict-meaning';
            meaningEl.textContent = meaning;
            
            item.appendChild(wordEl);
            item.appendChild(meaningEl);
            fragment.appendChild(item);
        });

        this.resultsContainer.appendChild(fragment);
    }
}
