import { type Plugin, Structs, events, NodeSegment } from "../../core/index.js";
import { isRegexString, isImageUrl, writeConfigToFile, readConfigFromFile } from './helper.js'
import * as path from 'path'

let config = {
  enableGroups: [] as number[],
  keywords: [] as Array<{ keyword: string; reply: string }>
};
const menus: string[] = ['#kw on/off', '#kw add <关键词> <回复内容[支持图片/正则表达式]>', '#kw rm <关键词>', '#kw ls'];

const keyword_path: string = path.resolve(process.cwd(), 'plugins/keyword/config.json');

// 初始化时读取配置
(async () => {
  try {
    config = await readConfigFromFile(keyword_path)
  } catch (error) {
    console.error('Error reading config:', error);
  }
})();

// 更好的参数解析函数，用于处理包含空格的内容
function parseAddCommand(message: string): { keyword: string | null, reply: string | null } {
  // 匹配 #kw add 后的内容
  const addMatch = message.match(/^#kw\s+add\s+(.+)$/);
  if (!addMatch) return { keyword: null, reply: null };

  const content = addMatch[1];
  
  // 尝试提取正则表达式格式的关键词 /.../flags
  const regexMatch = content.match(/^\/(.+)\/([gimsuy]*)\s+(.*)$/);
  if (regexMatch) {
    const [, pattern, flags, reply] = regexMatch;
    return { keyword: `/${pattern}/${flags}`, reply };
  }
  
  // 尾部内容可能是引用的消息或者纯文本
  let remaining = content;
  let keyword: string | null = null;
  
  // 处理被引号包围的关键词
  const quotedKeywordMatch = remaining.match(/^(['"`])((?:\\.|(?!\1)[^\\])*)\1/);
  if (quotedKeywordMatch) {
    const quote = quotedKeywordMatch[1];
    keyword = quotedKeywordMatch[2].replace(new RegExp(`\\\\${quote}`, 'g'), quote); // 解除转义
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
    reply = quotedReplyMatch[2].replace(new RegExp(`\\\\${quote}`, 'g'), quote); // 解除转义
  } else {
    // 非引号包围的回复内容
    reply = remaining;
  }
  
  return { keyword, reply };
}

const plugin: Plugin = {
  name: 'keyword',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '关键词插件',
  
  handlers: {
    message: async (context) => {
      if(context.raw_message.startsWith("#kw")){
        if(!events.hasRight(context.sender.user_id)) return;
        const [, command, ...args] = context.raw_message.split(' ');
        const restMessage = args.join(' ');
        switch (command) {
          case 'on':
            // 实现开关功能
            if('group_id' in context && args.length == 0){
              // 检查群组是否已经启用
              if (!config.enableGroups.includes(context.group_id)) {
                config.enableGroups.push(context.group_id);
                await writeConfigToFile(keyword_path, config);
                await events.reply(context, `✅已开启关键词回复`);
              } else {
                await events.reply(context, `⚠️关键词回复已处于开启状态`);
              }
            }
            break;
          case 'off':
            // 实现开关功能
            if('group_id' in context && args.length == 0){
              // 检查群组是否已启用
              const index = config.enableGroups.indexOf(context.group_id);
              if (index > -1) {
                config.enableGroups.splice(index, 1);
                await writeConfigToFile(keyword_path, config);
                await events.reply(context, `❎已关闭关键词回复`);
              } else {
                await events.reply(context, `⚠️关键词回复已处于关闭状态`);
              }
            }
            break;
          case 'add':
            {
              const { keyword, reply } = parseAddCommand(context.raw_message);
              
              if(keyword && reply) {
              // 检查关键词是否已存在
              const existingKeyword = config.keywords.find(item => JSON.parse(item.keyword) === keyword);
              if (existingKeyword) {
                await events.reply(context, `⚠️关键词 "${keyword}" 已存在`);
                break;
              }
                  const extracimageurl = context.message && Array.isArray(context.message) 
                    ? context.message.find(segment => segment.type === 'image')?.data?.url || ''
                    : '';

                  config.keywords.push({
                      keyword: JSON.stringify(keyword),
                      reply: (extracimageurl).length ? JSON.stringify(extracimageurl): JSON.stringify(reply)
                  });
                  await writeConfigToFile(keyword_path,config)
                  await events.reply(context, `✅已添加关键词回复`);
              } else {
                await events.reply(context, `❌参数错误，请检查关键词和回复内容`);
              }
              break;
            }
          case 'rm':
            {
              let keywordToRemove = restMessage;
              
              // 处理引号包围的关键词
              if ((keywordToRemove.startsWith('"') && keywordToRemove.endsWith('"')) ||
                  (keywordToRemove.startsWith("'") && keywordToRemove.endsWith("'")) ||
                  (keywordToRemove.startsWith("`") && keywordToRemove.endsWith("`"))) {
                keywordToRemove = keywordToRemove.slice(1, -1);
              }
              
              // 这里需要从存储中删除 keywordToRemove
              if(keywordToRemove) {
                // 检查关键词是否存在
                const index = config.keywords.findIndex(item => JSON.parse(item.keyword) === keywordToRemove);
                if (index > -1) {
                  config.keywords.splice(index, 1);
                  await writeConfigToFile(keyword_path, config);
                  await events.reply(context, `✅已删除关键词回复`);
                } else {
                  await events.reply(context, `⚠️关键词 "${keywordToRemove}" 不存在`);
                }
              }
              break;
            }
          case 'ls':
            {
              // 实现列出所有关键词功能
              if(args.length == 0){
                  if(config.keywords.length == 0){
                      await events.reply(context, '暂无关键词'); 
                      return;
                  }
                  const target_id: number = 'group_id' in context ? context.group_id : context.user_id;
                  // 关键词列表展示逻辑
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
                                  config.keywords.map(keyword => `${JSON.parse(keyword.keyword)}➡️${JSON.parse(keyword.reply)}`).join('\n')
                                  )
                              ]
                          }
                      }
                  ];
                  events.fakeMessage(target_id, forwardmsg, 'group_id' in context)
              }
              // 这里需要从存储中读取所有关键词并回复给用户
              break;
            }
          default:
            await events.reply(context, menus.join('\n'));
        }
      }
      if ('group_id' in context && config.enableGroups.includes(context.group_id)) {
        for (const keyword of config.keywords) {
            try {
                const parsed = {
                    keyword: JSON.parse(keyword.keyword),
                    reply: JSON.parse(keyword.reply)
                };
                const isRegex = isRegexString(parsed.keyword);
                const isMatched = isRegex 
                    ? new RegExp(parsed.keyword.slice(1, -1)).test(context.raw_message)
                    : context.raw_message === parsed.keyword;
                if (isMatched) {
                /* 
                  * 处理包含 \n 的字符串回复内容:
                  * 1. 将字符串按 \n 分割成多个部分
                  * 2. 为每个非空部分创建 Structs.text 元素
                  * 3. 在每个分割点之间插入 Structs.text('\n') 来保留原始换行符
                  * 这样可以确保输出时既按换行符分段，又保留了原有的换行格式
                  * 例如："Hello\nWorld\n!" 会变成 [Structs.text('Hello'), Structs.text('\n'), Structs.text('World'), Structs.text('\n'), Structs.text('!')]
                  */
                  const replyContent = await (isImageUrl(parsed.reply)
                    ? [Structs.image(await events.getDynamicDirectLink(parsed.reply))]
                    : Array.isArray(parsed.reply) 
                      ? parsed.reply.map((line: string) => Structs.text(line))
                      : (() => {
                          const parts = parsed.reply.split('\\n');
                          const result = [];
                          for (let i = 0; i < parts.length; i++) {
                            if (i > 0) {
                              result.push(Structs.text('\n'));
                            }
                            if (parts[i] !== '') {
                              result.push(Structs.text(parts[i]));
                            }
                          }
                          return result;
                        })());
                    
                    await events.reply(context, replyContent);
                    return;
                }
            } catch (e) {
                console.error('Keyword processing error:', keyword, e);
            }
        }
      }
    }
  }
};

export default plugin;