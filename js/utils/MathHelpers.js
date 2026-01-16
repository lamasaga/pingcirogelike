/**
 * 辅助函数库
 */

// 能够根据权重返回随机元素的函数
export function getRandomLetter(vowels, consonants, vWeight, cWeight) {
    // 简单的权重算法：
    // 1. 决定是元音还是辅音
    const totalWeight = vWeight + cWeight;
    const randomVal = Math.random() * totalWeight;
    
    let targetCollection;
    
    if (randomVal < vWeight) {
        targetCollection = vowels;
    } else {
        targetCollection = consonants;
    }
    
    // 2. 从选定的集合中随机抽取一个
    const index = Math.floor(Math.random() * targetCollection.length);
    // 返回一个新的对象副本，避免引用问题，并赋予唯一ID方便拖拽追踪
    return {
        ...targetCollection[index],
        id: `letter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
}

// 简单的UUID生成器（如有需要）
export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
