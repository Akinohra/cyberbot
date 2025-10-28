import { NCWebsocket, AllHandlers, Structs, NodeSegment } from 'node-napcat-ts'
import fs from 'fs'
import path from 'path'
import logger from './logger.js'
import CyberBotEvents from './event.js'


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

export const bot_uin = cyberconfig.bot
export const masters = cyberconfig.master

// 创建并配置CyberBotEvents实例
const cyberBotEvents = new CyberBotEvents(napcat);

export { napcat, NCWebsocket, type AllHandlers, type NodeSegment, Structs, logger }
export { pluginManager, type Plugin  } from './pluginManager.js';
export { cyberBotEvents as events }
