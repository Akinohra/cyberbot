import * as fs from 'fs';

interface RegexValidationOptions {
    strictMode?: boolean;
    allowedFlags?: string;
}

/**
 * 检查给定的字符串是否为正则表达式
 * @param str - 需要检查的字符串
 * @param options - 可选的配置参数
 * @returns 如果字符串是一个有效的正则表达式，则返回 true；否则返回 false
 */
const isRegexString = (
    str: string,
    options: RegexValidationOptions = { strictMode: false }
): boolean => {
    const { allowedFlags = 'gimsuy', strictMode = false } = options;
    const regexPattern = /^\/(.+)\/([gimsuy]*)$/;
    const match = str.match(regexPattern);
    
    if (!match) return false;
    
    const [, pattern, flags] = match;
    const uniqueFlags = [...new Set(flags)];
    
    // 标志校验
    const isValidFlags = uniqueFlags.every(f => allowedFlags.includes(f));
    
    // 严格模式校验
    if (strictMode) {
        try {
            new RegExp(pattern, flags);
            return isValidFlags;
        } catch {
            return false;
        }
    }
    
    return isValidFlags;
};

/**
 * 检查给定的 URL 是否为图片链接
 * @param url - 需要检查的 URL 字符串
 * @returns 如果 URL 是有效的图片链接，则返回 true；否则返回 false
 */
const isImageUrl = (url: string): boolean => {
    if (typeof url !== 'string') return false;
    
    const domainPattern = /^https:\/\/multimedia\.nt\.qq\.com\.cn/;
    const filePattern = /\.(png|jpe?g)$/i;
    return domainPattern.test(url) || filePattern.test(url);
};

/**
 * 将配置写入文件
 * @param filepath - 配置文件路径
 * @param config - 配置对象
 */
const writeConfigToFile = async (filepath: string, config: any): Promise<void> => {
    await fs.promises.writeFile(filepath, JSON.stringify(config, null, 2), 'utf8');
};

/**
 * 从文件中读取机器人的配置
 * @param filepath - 配置文件的路径
 * @returns 包含配置信息的对象
 */
const readConfigFromFile = async (filepath: string): Promise<{ 
    enableGroups: number[]; 
    keywords: Array<{ keyword: string; reply: string }> 
}> => {
    try {
        const data = await fs.promises.readFile(filepath, 'utf8');
        const result = JSON.parse(data);
        
        return {
            enableGroups: Array.isArray(result.enableGroups) ? result.enableGroups : [],
            keywords: Array.isArray(result.keywords) ? result.keywords : []
        };
    } catch (error) {
        return {
            enableGroups: [],
            keywords: []
        };
    }
};

export { 
    isRegexString, 
    isImageUrl, 
    writeConfigToFile, 
    readConfigFromFile 
};