// logger.ts
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { createStream } from 'rotating-file-stream';


/**
 * LOG_LEVEL 等级说明 (Pino 日志库):
 * - 'fatal': 只显示 fatal
 * - 'error': 显示 error, fatal
 * - 'warn':  显示 warn, error, fatal
 * - 'info':  显示 info, warn, error, fatal
 * - 'debug': 显示 debug, info, warn, error, fatal
 * - 'trace': 显示 trace, debug, info, warn, error, fatal
 */

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 异步读取配置
const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8');
const cyberconfig = JSON.parse(config);
const isProduction = cyberconfig.loginfo.isProduction ?? true;

// 日志基础配置
const loggerOptions = {
  name: 'cyberbot',
  level: cyberconfig.loginfo.level || 'info',
  base: { pid: false },
  timestamp: pino.stdTimeFunctions.isoTime,
};

let streams;

if (isProduction) {
  // 生产环境：同时输出到文件（轮转）和 stdout（无颜色）
  const fileStream = createStream('app.log', {
    path: logDir,
    size: cyberconfig.loginfo.maxSize || '10M',
    interval: '1d',
    maxFiles: cyberconfig.loginfo.maxDays || 7,
    compress: 'gzip',
    immutable: true,
  });

  // 可选：如果你希望 stdout 也是可读格式（但不带颜色），可以用 pino-pretty 的纯文本模式
  // 但你要求“不带颜色”，所以这里直接输出 JSON 到 stdout，或使用无颜色的 pretty
  const prettyStream = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: false, // 关键：关闭颜色
      levelFirst: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,name',
    },
  });

  streams = [
    { stream: fileStream },        // 写入轮转文件
    { stream: prettyStream },      // 写入 stdout，格式化但无颜色
    // 或者直接用 { stream: process.stdout } 输出原始 JSON
  ];
} else {
  // 开发环境：使用带颜色的 pino-pretty
  streams = [
    {
      stream: pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,name',
        },
      }),
    },
  ];
}

// 创建 logger，使用多流
const logger = pino(loggerOptions, pino.multistream(streams));

export default logger;