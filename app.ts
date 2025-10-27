import { napcat, pluginManager, logger, events } from "./core/index.js";
import fs from 'fs'
import path from 'path'

const main = async () => {
  // 连接到napcat
  await napcat.connect();
  logger.info('Connected to NapCat');
  const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8')
  const cyberconfig = JSON.parse(config);
  const logo = `
  .oooooo.                .o8                          oooooooooo.                .   
 d8P'  \`Y8b              "888                          \`888'   \`Y8b             .o8   
888          oooo    ooo  888oooo.   .ooooo.  oooo d8b  888     888  .ooooo.  .o888oo 
888           \`88.  .8'   d88' \`88b d88' \`88b \`888\"\"8P  888oooo888' d88' \`88b   888   
888            \`88..8'    888   888 888ooo888  888      888    \`88b 888   888   888   
\`88b    ooo     \`888'     888   888 888    .o  888      888    .88P 888   888   888 . 
 \`Y8bood8P'      .8'      \`Y8bod8P' \`Y8bod8P' d888b    o888bood8P'  \`Y8bod8P'   "888" 
             .o..P'                                                                   
             \`Y8P'                                                                  
                                                                                      
CyberBot 一个基于 node-napcat-ts 的 QQ 机器人
参考: kivibot@viki && Abot@takayama
@auther: 星火
`;
logger.info(logo);
  await events.sendPrivateMessage(cyberconfig.master[0], `[Bot🤖] 已成功上线！\n🎉 机器人已准备就绪，随时为您服务！`);
  // 初始化插件
  await pluginManager.initialize();
}

main();