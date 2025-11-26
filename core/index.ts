import { NCWebsocket, AllHandlers, Structs, NodeSegment } from 'node-napcat-ts'
import fs from 'fs'
import path from 'path'
import logger from './logger.js'
import CyberBotContext from './event.js'


const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8')
const cyberconfig = JSON.parse(config)
const napcat = new NCWebsocket({
  baseUrl: cyberconfig.baseUrl,
  accessToken: cyberconfig.accessToken,
  // 是否需要在触发 socket.error 时抛出错误, 默认关闭
  throwPromise: cyberconfig.throwPromise,
  // ↓ 自动重连(可选)
  reconnection: cyberconfig.reconnection
  // ↓ 是否开启 DEBUG 模式
}, cyberconfig.debug)


// *弃用 export const bot_uin = cyberconfig.bot *
// 机器人主人列表
export const masters = cyberconfig.master
// 将登陆号存入全局变量
export let bot_uin: number | null = null;
// 导出设置机器人登陆号函数
export function setBotUin(uin: number) {
  bot_uin = uin;
}

// 创建并配置CyberBotContext实例
const cyberBotContext = new CyberBotContext(napcat);

// 监听所有消息事件并记录raw_message
napcat.on('message', (e) => {
  if (e.message_type == "group") {
    logger.info(`[*]群(${e.group_id}) ${e.sender.nickname}(${e.sender.user_id}): ${e.raw_message}`);
} else if (e.message_type == "private") {
    logger.info(`[*]私(${e.sender.user_id}) ${e.sender.nickname}: ${e.raw_message}`);
}});

export { napcat, NCWebsocket, type AllHandlers, type NodeSegment, Structs, logger }
export { pluginManager, type Plugin  } from './pluginManager.js';
export { cyberBotContext as ctx }
