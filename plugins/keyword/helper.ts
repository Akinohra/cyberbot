
import * as fs from 'fs';

interface RegexValidationOptions {
    strictMode?: boolean;  // 是否验证正则表达式合法性
    allowedFlags?: string; // 默认允许所有标志
}

/**
 * 检查给定的字符串是否为正则表达式。
 * 
 * @param str - 需要检查的字符串。
 * @param options - 可选的配置参数。
 * @returns 如果字符串是一个有效的正则表达式，则返回 `true`；否则返回 `false`。
 */
const isRegexString = (
    str: string,
    options: RegexValidationOptions = { strictMode: false } // 移除默认值中的冗余参数
): boolean => {
    const { allowedFlags = 'gimsuy', strictMode = false } = options; // 解构时设置默认值
    const patternValidation = /^\/(?:[^\\/]|\\.)*\/([gimsuy]*)$/.test(str);
    
    if (!patternValidation) return false;
    
    const [, flags] = str.match(/^\/(?:[^\\/]|\\.)*\/([gimsuy]*)$/) || [];
    const uniqueFlags = flags.split('').filter((f, i, arr) => arr.indexOf(f) === i);
    
    // 标志校验
    const isValidFlags = uniqueFlags.every(f => allowedFlags.indexOf(f) !== -1);
    
    // 严格模式校验
    if (options.strictMode) {
        try {
            new RegExp(str); // 实际创建正则对象验证
            return isValidFlags;
        } catch {
            return false;
        }
    }
    
    return isValidFlags;
};
/**
 * 检查给定的 URL 是否为图片链接。
 * 
 * @param url - 需要检查的 URL 字符串。
 * @returns 如果 URL 以 `https://multimedia.nt.qq.com.cn` 开头并且以 `.png`, `.jpg`, 或 `.jpeg` 结尾，则返回 `true`；否则返回 `false`。
 */
const isImageUrl = (url: string): boolean => {
    const domainPattern = /^https:\/\/multimedia\.nt\.qq\.com\.cn/;
    const filePattern = /\.(png|jpe?g)$/i;
    return domainPattern.test(url) || filePattern.test(url);
}
/**
 * 检查给定的字符串是否为图片链接。
 * 
 * @param str - 需要检查的字符串。
 * @returns 如果字符串是一个有效的图片链接，则返回 `true`；否则返回 `false`。
 */
const writeConfigToFile = async (filepath:string,config: any) => {
    await fs.promises.writeFile(filepath, JSON.stringify(config, null, 2));
};

/**
 * 从文件中读取机器人的配置。
 * 
 * @param filepath - 配置文件的路径。
 * @returns 包含配置信息的对象。
 */
const readConfigFromFile = async (filepath: string) => {
    try {
        
        const data = await fs.promises.readFile(filepath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {
            enableGroups: [],
            keywords: []
        };
    }
};


// 导出函数
export { isRegexString, isImageUrl,writeConfigToFile, readConfigFromFile }