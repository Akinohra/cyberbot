import { type Plugin, Structs, events, NodeSegment } from "../../core/index.js";
import { isRegexString, isImageUrl, writeConfigToFile, readConfigFromFile } from './helper.js';
import * as path from 'path';

let config = {
    enableGroups: [] as number[],
    keywords: [] as Array<{ keyword: string; reply: string }>
};

const menus: string[] = [
    '#kw on/off',
    '#kw add <关键词> <回复内容[支持图片/正则表达式]>',
    '#kw rm <关键词>',
    '#kw ls'
];

const keyword_path: string = path.resolve(process.cwd(), 'plugins/keyword/config.json');

// 初始化时读取配置
(async () => {
    try {
        config = await readConfigFromFile(keyword_path);
    } catch (error) {
        console.error('Error reading config:', error);
    }
})();

/**
 * 解析添加命令的参数
 * @param message - 完整的命令消息
 * @returns 解析后的关键词和回复内容
 */
function parseAddCommand(message: string): { keyword: string | null, reply: string | null } {
    const addMatch = message.match(/^#kw\s+add\s+(.+)$/);
    if (!addMatch) return { keyword: null, reply: null };

    const content = addMatch[1];
    
    // 尝试提取正则表达式格式的关键词 /.../flags
    const regexMatch = content.match(/^\/(.+)\/([gimsuy]*)\s+(.*)$/);
    if (regexMatch) {
        const [, pattern, flags, reply] = regexMatch;
        return { keyword: `/${pattern}/${flags}`, reply };
    }
    
    let remaining = content;
    let keyword: string | null = null;
    
    // 处理被引号包围的关键词
    const quotedKeywordMatch = remaining.match(/^(['"`])((?:\\.|(?!\1)[^\\])*)\1/);
    if (quotedKeywordMatch) {
        const quote = quotedKeywordMatch[1];
        keyword = quotedKeywordMatch[2].replace(new RegExp(`\\\\${quote}`, 'g'), quote);
        remaining = remaining.slice(quotedKeywordMatch[0].length).trim();
    } else {
        // 非引号包围的单个词作为关键词
        const wordMatch = remaining.match(/^([^\s]+)/);
        if (wordMatch) {
            keyword = wordMatch[1];
            remaining = remaining.slice(wordMatch[0].length).trim();
        }
    }
    
    // 如果没有剩余内容，则返回失败
    if (!remaining) {
        return { keyword: null, reply: null };
    }
    
    // 处理回复内容
    let reply: string | null = null;
    
    // 处理被引号包围的回复内容
    const quotedReplyMatch = remaining.match(/^(['"`])((?:\\.|(?!\1)[^\\])*)\1$/);
    if (quotedReplyMatch) {
        const quote = quotedReplyMatch[1];
        reply = quotedReplyMatch[2].replace(new RegExp(`\\\\${quote}`, 'g'), quote);
    } else {
        reply = remaining;
    }
    
    return { keyword, reply };
}

const plugin: Plugin = {
    name: 'keyword',
    version: '1.0.0',
    description: '关键词插件',
    
    handlers: {
        message: async (context) => {
            if (context.raw_message.startsWith("#kw")) {
                if (!events.hasRight(context.sender.user_id)) return;
                
                const [, command, ...args] = context.raw_message.split(' ');
                const restMessage = args.join(' ');
                
                switch (command) {
                    case 'on':
                        if ('group_id' in context && args.length === 0) {
                            if (!config.enableGroups.includes(context.group_id)) {
                                config.enableGroups.push(context.group_id);
                                await writeConfigToFile(keyword_path, config);
                                await events.reply(context, '✅已开启关键词回复');
                            } else {
                                await events.reply(context, '⚠️关键词回复已处于开启状态');
                            }
                        }
                        break;
                        
                    case 'off':
                        if ('group_id' in context && args.length === 0) {
                            const index = config.enableGroups.indexOf(context.group_id);
                            if (index > -1) {
                                config.enableGroups.splice(index, 1);
                                await writeConfigToFile(keyword_path, config);
                                await events.reply(context, '❎已关闭关键词回复');
                            } else {
                                await events.reply(context, '⚠️关键词回复已处于关闭状态');
                            }
                        }
                        break;
                        
                    case 'add': {
                        const { keyword, reply } = parseAddCommand(context.raw_message);
                        
                        if (keyword && reply) {
                            try {
                                const existingKeyword = config.keywords.some(item => {
                                    try {
                                        return JSON.parse(item.keyword) === keyword;
                                    } catch {
                                        return false;
                                    }
                                });
                                
                                if (existingKeyword) {
                                    await events.reply(context, `⚠️关键词 "${keyword}" 已存在`);
                                    break;
                                }
                                
                                const imageUrl = context.message && Array.isArray(context.message) 
                                    ? context.message.find(segment => segment.type === 'image')?.data?.url || ''
                                    : '';
                                
                                config.keywords.push({
                                    keyword: JSON.stringify(keyword),
                                    reply: imageUrl.length ? JSON.stringify(imageUrl) : JSON.stringify(reply)
                                });
                                
                                await writeConfigToFile(keyword_path, config);
                                await events.reply(context, '✅已添加关键词回复');
                            } catch (error) {
                                console.error('Error adding keyword:', error);
                                await events.reply(context, '❌添加关键词时发生错误');
                            }
                        } else {
                            await events.reply(context, '❌参数错误，请检查关键词和回复内容');
                        }
                        break;
                    }
                    
                    case 'rm': {
                        let keywordToRemove = restMessage;
                        
                        // 处理引号包围的关键词
                        if ((keywordToRemove.startsWith('"') && keywordToRemove.endsWith('"')) ||
                            (keywordToRemove.startsWith("'") && keywordToRemove.endsWith("'")) ||
                            (keywordToRemove.startsWith("`") && keywordToRemove.endsWith("`"))) {
                            keywordToRemove = keywordToRemove.slice(1, -1);
                        }
                        
                        if (keywordToRemove) {
                            let index = -1;
                            for (let i = 0; i < config.keywords.length; i++) {
                                try {
                                    if (JSON.parse(config.keywords[i].keyword) === keywordToRemove) {
                                        index = i;
                                        break;
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                            
                            if (index > -1) {
                                config.keywords.splice(index, 1);
                                await writeConfigToFile(keyword_path, config);
                                await events.reply(context, '✅已删除关键词回复');
                            } else {
                                await events.reply(context, `⚠️关键词 "${keywordToRemove}" 不存在`);
                            }
                        }
                        break;
                    }
                    
                    case 'ls':
                        if (args.length === 0) {
                            if (config.keywords.length === 0) {
                                await events.reply(context, '暂无关键词');
                                return;
                            }
                            
                            const target_id: number = 'group_id' in context ? context.group_id : context.user_id;
                            const forwardmsg: NodeSegment[] = [
                                {
                                    type: 'node',
                                    data: {
                                        content: [
                                            Structs.text("==关键词列表==")
                                        ]
                                    }
                                },
                                {
                                    type: 'node',
                                    data: {
                                        content: [
                                            Structs.text(
                                                config.keywords.map(keyword => {
                                                    try {
                                                        return `${JSON.parse(keyword.keyword)}➡️${JSON.parse(keyword.reply)}`;
                                                    } catch (e) {
                                                        return '解析错误的关键词';
                                                    }
                                                }).join('\n')
                                            )
                                        ]
                                    }
                                }
                            ];
                            
                            events.fakeMessage(target_id, forwardmsg, 'group_id' in context);
                        }
                        break;
                        
                    default:
                        await events.reply(context, menus.join('\n'));
                }
            }
            
            if ('group_id' in context && config.enableGroups.includes(context.group_id)) {
                for (let i = 0; i < config.keywords.length; i++) {
                    const keyword = config.keywords[i];
                    try {
                        const parsedKeyword = JSON.parse(keyword.keyword);
                        const parsedReply = JSON.parse(keyword.reply);
                        
                        const isRegex = isRegexString(parsedKeyword);
                        let isMatched = false;
                        
                        if (isRegex) {
                            const match = parsedKeyword.match(/^\/(.+)\/([gimsuy]*)$/);
                            if (match) {
                                const [, pattern, flags] = match;
                                isMatched = new RegExp(pattern, flags).test(context.raw_message);
                            }
                        } else {
                            isMatched = context.raw_message === parsedKeyword;
                        }
                        
                        if (isMatched) {
                            let replyContent;
                            
                            if (isImageUrl(parsedReply)) {
                                replyContent = [Structs.image(await events.getDynamicDirectLink(parsedReply))];
                            } else if (Array.isArray(parsedReply)) {
                                replyContent = parsedReply.map((line: string) => Structs.text(line));
                            } else {
                                const parts = parsedReply.split('\\n');
                                replyContent = [];
                                for (let j = 0; j < parts.length; j++) {
                                    if (j > 0) {
                                        replyContent.push(Structs.text('\n'));
                                    }
                                    if (parts[j] !== '') {
                                        replyContent.push(Structs.text(parts[j]));
                                    }
                                }
                            }
                            
                            await events.reply(context, replyContent);
                            return;
                        }
                    } catch (e) {
                        console.error('Keyword processing error:', keyword, e);
                        continue;
                    }
                }
            }
        }
    }
};

export default plugin;