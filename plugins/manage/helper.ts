import fs from 'fs'
// 引入LRU缓存替代无限Map
import { LRUCache } from 'lru-cache'

/**
 * 加载配置文件，如果不存在则创建,存在则更新。
 * @param {string} configPath - 配置文件的绝对路径 (不包括文件名)
 * @param {object} config - 默认配置对象
 * @returns {object} - 解析后的配置对象
 */
const loadConfig = (configPath: string, config: object = {}): object => {
    try {
        // 检查配置文件是否存在
        if (!fs.existsSync(configPath)) {
            // 如果文件不存在，则创建一个空的配置文件
            fs.mkdirSync(configPath, { recursive: true });
            fs.writeFileSync(`${configPath}/config.json`, JSON.stringify(config, null, 4));
            console.log(`配置文件已创建于: ${configPath}/config.json`);
        }

        // 加载配置文件
        return JSON.parse(fs.readFileSync(`${configPath}/config.json`, 'utf8'));
    } catch (error) {
        console.error('加载配置文件时发生错误:', error);
        throw error;
    }
}
/**
 * 保存配置文件，如果不存在则创建,存在则更新。
 * @param {string} configPath - 配置文件的绝对路径 (不包括文件名)
 * @param {object} config - 默认配置对象
 * @returns {object} - 解析后的配置对象
 */
const saveConfig = (configPath: string, config: object = {}): object => {
    try {
        fs.writeFileSync(`${configPath}/config.json`, JSON.stringify(config, null, 4));
        console.log(`配置文件已更新于: ${configPath}/config.json`);
        // 加载配置文件
        return JSON.parse(fs.readFileSync(`${configPath}/config.json`, 'utf8'));
    } catch (error) {
        console.error('保存配置文件时发生错误:', error);
        throw error;
    }
}
// 使用LRU缓存替代无限Map，设置最大容量为100个正则表达式
const regexCache = new LRUCache<string, RegExp>({
  max: 100, // 最多缓存100个正则表达式
  ttl: 1000 * 60 * 60, // 1小时过期时间，防止长期不用的正则占用内存
  updateAgeOnGet: true, // 获取时更新"年龄"
  dispose: (value, key) => {
    // 当项目被移除时的清理操作（如果需要）
    // console.debug(`正则表达式缓存项被移除: ${key}`);
  }
});
/**
 * 解析正则表达式字符串为模式和标志。
 * @param {string} regexStr - 正则表达式字符串。
 * @returns {[string, string]} 返回一个元组，包含模式和标志。
 */
const parseRegexStr = (regexStr: string): [string, string] => {
    // 优化后的解析，直接返回分组匹配结果，避免非必要的处理
    const match = /^\/(.*?)\/([gimuy]*)$/.exec(regexStr);
    return match ? [match[1], match[2]] : [regexStr, ''];
};
/**
 * 获取已编译的正则表达式。
 * 如果正则表达式尚未缓存，则创建并缓存它。
 * @param {string} pattern - 正则表达式的模式部分。
 * @param {string} flags - 正则表达式的标志部分。
 * @returns {RegExp} 编译后的正则表达式对象。
 */
const getCompiledRegex = (pattern: string, flags: string): RegExp => {
    const key = `${pattern}_${flags}`;
    const cached = regexCache.get(key);
    if (cached) {
        return cached;
    }
    const compiledRegex = new RegExp(pattern, flags);
    regexCache.set(key, compiledRegex);
    return compiledRegex;
};
/**
 * 检查输入字符串是否包含指定的正则表达式。
 * @param {string} input - 输入字符串。
 * @param {Keywords} keyword - 包含正则表达式的关键词对象。
 * @returns {boolean} 如果输入包含正则表达式，则返回 true；否则返回 false。
 */
const matchKeyword = (input: string, words: string): boolean => {
    if (!words) return false; // 提前校验关键词
    try {
        const [pattern, flags] = parseRegexStr(words);
        const regex = getCompiledRegex(pattern, flags);
        return regex.test(input);
    } catch (error) {
        console.error('Invalid regular expression:', error);
        return false;
    }
};
/**
 * 判断输入的字符串是否是一个有效的正则表达式字符串。
 * @param {string} str - 输入的字符串。
 * @returns {boolean} 如果输入是有效的正则表达式字符串，则返回 true；否则返回 false。
 */
const isRegexString = (str: string): boolean => {
    // 直接使用正则匹配，而不是创建不必要的 RegExp 对象
    return /^\/.*\/[gimuy]*$/.test(str);
};


// 导出函数
export { loadConfig, saveConfig, matchKeyword, isRegexString }