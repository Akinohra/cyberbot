import { type Plugin, napcat, ctx, pluginManager } from "../../core/index.js";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fsSize } from 'systeminformation';

type FsSizeData = {
    fs: string;
    type: string;
    size: number;
    used: number;
    available: number;
    mount: string;
    [key: string]: any; // 允许其他可能的属性
}

const plugin: Plugin = {
  name: 'cmds',
  version: '1.0.0',
  description: 'A cmds plugin that manager commands',
  
  handlers: {
    message: async (e) => {
      if(!(await ctx.hasRight(e.user_id))) return;
      if (e.raw_message === '#状态') {
        const statusMessage = await getStatus();
        ctx.reply(e, statusMessage);
      } else if (e.raw_message === '#关于') {
        const aboutMessage = await getAbout();
        ctx.reply(e, aboutMessage);
      } else if (e.raw_message === '#帮助') {
        const helpMessage = await getHelp();
        ctx.reply(e, helpMessage);
      } else if (e.raw_message === '#退出') {
        await ctx.reply(e, '已退出框架进程！');
        await dealExit();
      } else if (e.raw_message.startsWith('#设置')) {
        const settings_msg = await settingLogic(e.raw_message);
        await ctx.reply(e, settings_msg);
      }else if (e.raw_message.startsWith('#插件')) {
        const plugins_msg = await pluginsLogic(e.raw_message);
        await ctx.reply(e, plugins_msg);
      }
    }
  }
};

// Function to get the count of plugins in a directory
const getPluginsCount = (dirPath: string) => {
  try {
    const items = fs.readdirSync(dirPath);
    let count = 0;

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error('Error reading directory:', error);
    return -1;
  }
}

// 封装成一个函数，获取指定路径所在硬盘的信息
const getDiskInfo = async (path = process.cwd()) => {
    try {
      const disks = await fsSize();
      const GB = 1073741824;
      
      // 明确声明 targetDisk 可能是 FsSizeData 或 null
      let targetDisk: FsSizeData | null = null;
      let maxMountLength = 0;
      
      for (const disk of disks) {
        if (path.startsWith(disk.mount) && disk.mount.length > maxMountLength) {
          targetDisk = disk;
          maxMountLength = disk.mount.length;
        }
      }
  
      if (!targetDisk) throw new Error(`找不到路径 ${path} 对应的磁盘`);
  
      const sizeGB = targetDisk.size / GB;
      const availableGB = targetDisk.available / GB;
      
      return {
        total: parseFloat(sizeGB.toFixed(2)),
        used: parseFloat((sizeGB - availableGB).toFixed(2)),
        available: parseFloat(availableGB.toFixed(2))
      };
    } catch (err) {
      console.error("获取磁盘信息失败:", err);
      return { total: 100, used: 50, available: 50 };
    }
};
// 状态信息
const getStatus = async (): Promise<string> => {
  const pluginsCount = getPluginsCount(path.join(process.cwd(), 'plugins'));
  const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8');
  const loadedPlugins = JSON.parse(config).plugins.user.length + JSON.parse(config).plugins.system.length;
  // 框架版本信息
  let ver_info = { app_name: "CyberBot", protocol_version: "Unknown", app_version: "Unknown" };
  try {
      // 使用NCWebsocket的get_version_info方法
      const versionInfo = await napcat.get_version_info();
      ver_info = {
          app_name: versionInfo.app_name || "CyberBot",
          protocol_version: versionInfo.protocol_version || "Unknown",
          app_version: versionInfo.app_version || "Unknown"
      };
      // 获取登录QQ信息
      let login_qq = { nickname: "Unknown", user_id: "Unknown" };
      try {
          // 使用NCWebsocket的get_login_info方法
          const loginInfo = await napcat.get_login_info();
          login_qq = {
              nickname: loginInfo.nickname || "Unknown",
              user_id: String(loginInfo.user_id) || "Unknown"
          };
      } catch (err) {
          console.error("获取登录信息失败:", err);
      }
      // 获取好友列表
      let friend_list: any[] = [];
      try {
          // 使用NCWebsocket的get_friend_list方法
          friend_list = await napcat.get_friend_list();
      } catch (err) {
          console.error("获取好友列表失败:", err);
      }
      // 获取群列表
      let group_list: any[] = [];
      try {
          // 使用NCWebsocket的get_group_list方法
          group_list = await napcat.get_group_list();
      } catch (err) {
          console.error("获取群列表失败:", err);
      }
      // 内存使用情况
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      // nodejs版本信息
      const nodeVersion = process.version;
      // 平台信息
      const platform = os.platform() === 'win32' ? 'Windows' : os.platform();
      const arch = os.arch();
      // 运行时间信息
      const uptimeSeconds = process.uptime();
      const days = Math.floor(uptimeSeconds / (24 * 3600));
      const hours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = Math.floor(uptimeSeconds % 60);
      const formattedTime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      // 插件状态
      const status = '〓 🟢 Bot 状态 〓';
      // 硬盘信息
      const { total, used } = await getDiskInfo();
      const statusMessage = `${status}\n` +
        `🤖 CyberBot(${login_qq.nickname})\n` +
        `❄ ${login_qq.user_id}\n` +
        `🧩 插件${loadedPlugins}/${pluginsCount}个已启用\n` +
        `🕦 ${formattedTime}\n` +
        `📋 ${friend_list.length}个好友，${group_list.length}个群\n` +
        `🔷 ${ver_info.app_name}-${ver_info.protocol_version}-${ver_info.app_version}\n` +
        `🚀 bot占用-${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB-${((memoryUsage.rss / totalMemory) * 100).toFixed(2)}%\n` +
        `💻 ${platform}-${arch}-node${nodeVersion.slice(1)}\n` +
        `⚡ ${((totalMemory - freeMemory) / 1024 / 1024 / 1024).toFixed(2)} GB/${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB-${(((totalMemory - freeMemory) / totalMemory) * 100).toFixed(2)}%\n` +
        `💾 ${used.toFixed(0)} GB/${total.toFixed(0)} GB-${((used/total) * 100).toFixed(2)}%`
      return statusMessage;
  } catch (err) {
      console.error("获取版本信息失败:", err);
  }
  return '';
}
// 关于信息
const getAbout = async (): Promise<string> => {
  return "〓  🚀  CyberBot〓\n新一代QQ机器人框架\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✦ 核心特性 ✦\n├─ 🪶 极简轻量：不依赖复杂环境，安装即用\n├─ 🎨 优雅架构：TypeScript 全栈开发，类型安全\n├─ 🧩 热插拔插件：模块化设计，功能扩展无忧\n├─ ⚡ 性能怪兽：基于 Node.js 事件驱动模型\n├─ 🌐 跨平台支持：Windows/Linux/macOS 全兼容\n\n✦ 技术架构 ✦\n└─ 🔧 底层协议：NapcatQQ 核心驱动\n└─ 🧬 开发框架：node-napcat-ts 深度整合\n└─ 📦 生态支持：npm 海量模块即插即用\n\n✦ 开发者友好 ✦\n💡 完善文档 + 示例项目 = 1分钟快速上手\n🛠️ 提供cli工具链，创建/调试/打包一气呵成\n\n✨ 开源协议：MIT License，欢迎贡献代码！\n开源地址：https://github.com/Akinohra/cyberbot.git";
}
// 获取帮助信息
const getHelp = async (): Promise<string> => {
  return "〓 💡 CyberBot 帮助 〓\n#帮助 👉 显示帮助信息\n#插件 👉 框架插件管理\n#设置 👉 框架设置管理\n#状态 👉 显示框架状态\n#更新 👉 更新框架版本\n#退出 👉 退出框架进程";
}
// 设置详情
const settingLogic = async (message: string): Promise<string> => { 
  const [command, subCommand, ...args] = message.trim().split(/\s+/);
  if (subCommand === '详情') {
    const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8')
    const cyberconfig = JSON.parse(config);
    const msg = `〓 ⚙️ Bot 设置 〓\n主人: ${cyberconfig.master.join(", ")}\n管理员: ${cyberconfig.admins.join(", ")}`;
    return msg
  }else if (subCommand === '加主人') {
    const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8')
    const cyberconfig = JSON.parse(config);
    const newMaster = args[0];
    if (cyberconfig.master.includes(newMaster)) {
      return `❌主人 ${newMaster} 已存在`;
    } else {
      cyberconfig.master.push(newMaster);
      await fs.promises.writeFile(path.join(process.cwd(), 'cyberbot.json'), JSON.stringify(cyberconfig, null, 2), 'utf8');
      return `✅主人 ${newMaster} 已添加`;
    }
  }else if (subCommand === '删主人') {
    const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8')
    const cyberconfig = JSON.parse(config);
    const delMaster = args[0];
    if (!cyberconfig.master.includes(delMaster)) {
      return `❌主人 ${delMaster} 不存在`;
    } else {
      cyberconfig.master = cyberconfig.master.filter((item: string) => item !== delMaster);
      await fs.promises.writeFile(path.join(process.cwd(), 'cyberbot.json'), JSON.stringify(cyberconfig, null, 2), 'utf8');
      return `✅主人 ${delMaster} 已删除`;
    }
  }else if (subCommand === '加管理') {
    const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8')
    const cyberconfig = JSON.parse(config);
    const newAdmin = args[0];
    if (cyberconfig.admins.includes(newAdmin)) {
      return `❌管理员 ${newAdmin} 已存在`;
    } else {
      cyberconfig.admins.push(newAdmin);
      await fs.promises.writeFile(path.join(process.cwd(), 'cyberbot.json'), JSON.stringify(cyberconfig, null, 2), 'utf8');
      return `✅管理员 ${newAdmin} 已添加`;
    }
  }else if (subCommand === '删管理') {
    const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8')
    const cyberconfig = JSON.parse(config);
    const delAdmin = args[0];
    if (!cyberconfig.admins.includes(delAdmin)) {
      return `❌管理员 ${delAdmin} 不存在`;
    } else {
      cyberconfig.admins = cyberconfig.admins.filter((item: string) => item !== delAdmin);
      await fs.promises.writeFile(path.join(process.cwd(), 'cyberbot.json'), JSON.stringify(cyberconfig, null, 2), 'utf8');
      return `✅管理员 ${delAdmin} 已删除`;
    }
  }else{
    return "〓 ⚙️ Bot 设置 〓\n#设置 详情\n#设置 [加/删]主人 <QQ/AT>\n#设置 [加/删]管理 <QQ/AT>"
  }

}
// 插件详情
const pluginsLogic = async (message: string): Promise<string> => { 
  const [command, subCommand, ...args] = message.trim().split(/\s+/);

  // 获取系统插件列表
  const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8');
  const cyberconfig = JSON.parse(config);
  const systemPlugins = cyberconfig.plugins?.system || [];

  if (subCommand === '列表') {
    let msg = "〓 🧩 CyberBot 插件 〓\n";
    const allplugins = pluginManager.getAllPlugins();
    const loadedPlugins = pluginManager.getLoadedPlugins().map(item => {
      const pluginName = item.plugin.name;
      const isSystem = systemPlugins.includes(pluginName) ? '[系统]' : '[用户]';
      return `${isSystem}${pluginName}-${item.plugin.version}`;
    });
    const unloadedPlugins = allplugins.filter(pluginName => !pluginManager.getLoadedPlugins().map(item => item.plugin.name).includes(pluginName));
    const formatLoadedPlugins = loadedPlugins.map(pluginName => `🟢 ${pluginName}`);
    const formatUnloadedPlugins = unloadedPlugins.map(pluginName => {
      const isSystem = systemPlugins.includes(pluginName) ? '[系统]' : '[用户]';
      return `🔴 ${isSystem}${pluginName}`;
    });
    msg += formatLoadedPlugins.join('\n');
    if (formatUnloadedPlugins.length > 0) {
      msg += '\n' + formatUnloadedPlugins.join('\n');
    }
    
    return msg
  }else if (subCommand === '启用') {
    const pluginName = args[0];
    // 检查是否为系统插件
    if (systemPlugins.includes(pluginName)) {
      return `❌系统插件 ${pluginName} 默认已启用，无法重复启用`;
    }
    if ((await pluginManager.load(path.join(process.cwd(), 'plugins', pluginName, 'index.js')))) {
      return `✅插件 ${pluginName} 已启用`;
    } else {
      return `❌插件 ${pluginName} 未找到`;
    }
  }else if (subCommand === '禁用') {
    const pluginName = args[0];
    // 检查是否为系统插件
    if (systemPlugins.includes(pluginName)) {
      return `❌系统插件 ${pluginName} 不能被禁用`;
    }
    if ((await pluginManager.unload(path.join(process.cwd(), 'plugins', pluginName, 'index.js')))) {
      return `✅插件 ${pluginName} 已禁用`;
    } else {
      return `❌插件 ${pluginName} 未找到`;
    }
  }else if (subCommand === '重载') {
    const pluginName = args[0];
    // 检查是否为系统插件
    if (systemPlugins.includes(pluginName)) {
      return `❌系统插件 ${pluginName} 不能被重载`;
    }
    if ((await pluginManager.reload(path.join(process.cwd(), 'plugins', pluginName, 'index.js')))) {
      return `✅插件 ${pluginName} 已重载`;
    } else {
      return `❌插件 ${pluginName} 未找到或未启用`;
    }
  }else{
    return "〓 🧩 Bot 插件 〓\n#插件 列表\n#插件 启用 <插件名>\n#插件 禁用 <插件名>\n#插件 重载 <插件名>"
  }

}
const dealExit = async (): Promise<void> => {
  napcat.disconnect();
  process.exit(0);
}

export default plugin;