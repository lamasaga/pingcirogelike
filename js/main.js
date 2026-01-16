import { gameState } from './core/GameState.js';
import { shopSystem } from './core/ShopSystem.js';
import { relicSystem } from './core/RelicSystem.js'; // 导入 RelicSystem
import { gridSystem } from './core/GridSystem.js'; // 导入 GridSystem
import { Renderer } from './ui/Renderer.js';
import { DragManager } from './ui/DragManager.js';
import { DictionaryViewer } from './ui/DictionaryViewer.js';

// 游戏入口
document.addEventListener('DOMContentLoaded', () => {
    // 0. 注入核心依赖
    relicSystem.setGridSystem(gridSystem);

    // 1. 初始化核心系统
    shopSystem.init();

    // 2. 初始化UI
    const renderer = new Renderer();
    const dragManager = new DragManager(renderer);
    const dictionaryViewer = new DictionaryViewer(); // 初始化词典查看器
    
    // 注入依赖
    renderer.setDragManager(dragManager);
    
    // 启动渲染
    renderer.init();

    console.log("Game Initialized");
});
