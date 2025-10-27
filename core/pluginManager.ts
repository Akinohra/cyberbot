import logger from "./logger.js";
import { napcat, AllHandlers } from './index.js';
import { CronJob } from 'cron';
import fs from 'fs'
import path from 'path'

// 添加类型定义
type EventType = keyof AllHandlers;
type EventHandler<T extends EventType> = (context: AllHandlers[T]) => void;

interface Plugin {
  name: string;
  version?: string;
  description?: string;
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  // 添加事件处理器映射
  handlers?: Partial<{
    [K in EventType]: EventHandler<K>
  }>;
  // 添加定时任务
  crons?: ((cron: (expression: string, handler: () => void) => void, context: any, napcat: any) => void);
}

// 添加存储事件处理器的Map
const registeredHandlers = new Map<string, {event: EventType, handler: EventHandler<any>}[]>();

interface LoadedPlugin {
  plugin: Plugin;
  module: any;
  cronJobs?: CronJob[];
}


class PluginManager {
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();


  /**
   * 检查插件是否为系统插件
   * @param pluginPath 插件路径
   */
  private async isSystemPlugin(pluginPath: string): Promise<boolean> {
    try {
      const configPath = path.join(process.cwd(), 'cyberbot.json');
      const configData = await fs.promises.readFile(configPath, 'utf8');
      const cyberconfig = JSON.parse(configData);
      
      // 提取插件目录名
      const pluginDir = path.basename(pluginPath);
      
      // 检查是否为系统插件
      return cyberconfig.plugins?.system?.includes(pluginDir) || false;
    } catch (error) {
      logger.error(`Failed to check if plugin ${pluginPath} is system plugin: ${error}`);
      return false;
    }
  }

  /**
   * 将插件信息持久化到配置文件
   * @param pluginPath 插件路径
   */
  private async persistPlugin(pluginPath: string): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'cyberbot.json');
      const configData = await fs.promises.readFile(configPath, 'utf8');
      const cyberconfig = JSON.parse(configData);

      // 提取插件目录名
      const pluginDir = path.basename(pluginPath);

      // 检查是否为系统插件
      const isSystemPlugin = cyberconfig.plugins?.system?.includes(pluginDir);

      // 如果是系统插件，则不需要添加到user列表
      if (isSystemPlugin) {
        return;
      }

      // 确保 plugins 和 user 数组存在
      if (!cyberconfig.plugins) {
        cyberconfig.plugins = {};
      }
      if (!cyberconfig.plugins.user) {
        cyberconfig.plugins.user = [];
      }

      // 如果插件尚未在用户插件列表中，则添加它
      if (!cyberconfig.plugins.user.includes(pluginDir)) {
        cyberconfig.plugins.user.push(pluginDir);
        
        // 写回文件
        await fs.promises.writeFile(configPath, JSON.stringify(cyberconfig, null, 2), 'utf8');
        logger.info(`Plugin ${pluginDir} persisted to cyberbot.json`);
      }
    } catch (error) {
      logger.error(`Failed to persist plugin ${pluginPath} to config: ${error}`);
    }
  }
  /**
   * 从配置文件中移除插件信息
   * @param pluginPath 插件路径
   */
  private async unpersistPlugin(pluginPath: string): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'cyberbot.json');
      const configData = await fs.promises.readFile(configPath, 'utf8');
      const cyberconfig = JSON.parse(configData);

      // 提取插件目录名
      const pluginDir = path.basename(pluginPath);

      // 检查是否为系统插件
      const isSystemPlugin = cyberconfig.plugins?.system?.includes(pluginDir);

      // 如果是系统插件，则不从user列表中移除
      if (isSystemPlugin) {
        return;
      }

      // 确保 plugins 和 user 数组存在
      if (cyberconfig.plugins && cyberconfig.plugins.user) {
        // 从用户插件列表中移除
        cyberconfig.plugins.user = cyberconfig.plugins.user.filter((p: string) => p !== pluginDir);
        
        // 写回文件
        await fs.promises.writeFile(configPath, JSON.stringify(cyberconfig, null, 2), 'utf8');
        logger.info(`Plugin ${pluginDir} removed from cyberbot.json`);
      }
    } catch (error) {
      logger.error(`Failed to unpersist plugin ${pluginPath} from config: ${error}`);
    }
  }

  /**
   * 加载插件
   * @param pluginPath 插件路径
   */
  async load(pluginPath: string): Promise<boolean> {
    try {
      // 检查插件是否已经加载
      if (this.loadedPlugins.has(pluginPath)) {
        logger.info(`Plugin ${pluginPath} is already loaded`);
        return true;
      }
      // 在Windows上将路径转换为file:// URL以避免ESM加载错误
      let importPath = pluginPath;
      if (process.platform === 'win32' && !pluginPath.startsWith('file://')) {
        // 确保路径使用正斜杠并添加file://前缀
        const normalizedPath = pluginPath.replace(/\\/g, '/');
        importPath = `file://${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
      }
      // 动态导入插件
      const pluginModule = await import(importPath);
      const plugin: Plugin = pluginModule.default || pluginModule;

      // 验证插件对象
      if (!plugin.name) {
        logger.error(`Plugin ${pluginPath} does not export a valid plugin object (missing name)`);
        return false;
      }
      // 处理插件事件处理器
      const pluginHandlers: {event: EventType, handler: Function}[] = [];
      if (plugin.handlers) {
        Object.entries(plugin.handlers).forEach(([event, handler]) => {
          napcat.on(event as EventType, handler);
          pluginHandlers.push({event: event as EventType, handler});
        });
        registeredHandlers.set(pluginPath, pluginHandlers as any);
      }

      // 处理插件定时任务
      const cronJobs: CronJob[] = [];
      if (plugin.crons) {
        // 创建一个代理函数来处理 cron 任务定义
        const createCronTask = (expression: string, handler: () => void) => {
          try {
            const job = new CronJob(
              expression,
              handler,
              null,
              true
            );
            cronJobs.push(job);
            logger.info(`Cron job started for plugin ${plugin.name} with expression: ${expression}`);
          } catch (error) {
            logger.error(`Failed to start cron job for plugin ${plugin.name}: ${error}`);
          }
        };
        // 为插件提供 cron 函数
        const cronProxy = (expression: string, handler: () => void) => {
          createCronTask(expression, handler);
        };
        // 调用插件的 cron 函数
        plugin.crons(cronProxy, {}, napcat);
      }

      // 执行插件的 onLoad 方法
      if (typeof plugin.onLoad === 'function') {
        await plugin.onLoad();
      }

      // 将插件添加到已加载插件列表中
      this.loadedPlugins.set(pluginPath, {
        plugin,
        module: pluginModule
      });
      // 插件启用写入配置文件
      await this.persistPlugin(path.dirname(pluginPath));
      logger.info(`Plugin ${plugin.name} loaded successfully from ${pluginPath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to load plugin from ${pluginPath}: ${error}`);
      return false;
    }
  }

  /**
   * 卸载插件
   * @param pluginPath 插件路径
   */
  async unload(pluginPath: string): Promise<boolean> {
    try {
      // 检查是否为系统插件，系统插件不允许卸载
      if (await this.isSystemPlugin(pluginPath)) {
        const pluginName = path.basename(pluginPath);
        logger.info(`System plugin ${pluginName} cannot be unloaded`);
        return false;
      }
      const loadedPlugin = this.loadedPlugins.get(pluginPath);
      
      if (!loadedPlugin) {
        logger.info(`Plugin ${pluginPath} is not loaded`);
        return false;
      }

      // 执行插件的 onUnload 方法
      if (typeof loadedPlugin.plugin.onUnload === 'function') {
        await loadedPlugin.plugin.onUnload();
      }

      // 停止并清理插件的 cron 任务
      if (loadedPlugin.cronJobs) {
        loadedPlugin.cronJobs.forEach(job => {
          if (job.isActive) {
            job.stop();
          }
        });
      }
      // 移除插件注册的事件处理器
      const pluginHandlers = registeredHandlers.get(pluginPath);
      if (pluginHandlers) {
        pluginHandlers.forEach(({event, handler}) => {
          return napcat.off(event, handler);
        });
        registeredHandlers.delete(pluginPath);
      }
      // 从已加载插件列表中移除
      this.loadedPlugins.delete(pluginPath);
      // 从配置文件中移除启用插件
      await this.unpersistPlugin(path.dirname(pluginPath));
      logger.info(`Plugin ${loadedPlugin.plugin.name} unloaded successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to unload plugin ${pluginPath}:${error}`);
      return false;
    }
  }

  /**
   * 重新加载插件
   * @param pluginPath 插件路径
   */
  async reload(pluginPath: string): Promise<boolean> {
    // 检查是否为系统插件，系统插件不允许重载
    if (await this.isSystemPlugin(pluginPath)) {
      const pluginName = path.basename(pluginPath);
      logger.info(`System plugin ${pluginName} cannot be reloaded`);
      return false;
    }
    // 先卸载插件
    const unloadResult = await this.unload(pluginPath);
    
    // 然后重新加载插件
    const loadResult = await this.load(pluginPath);
    
    return unloadResult && loadResult;
  }

  /**
   * 获取所有已加载的插件
   */
  getLoadedPlugins(): { path: string; plugin: Plugin }[] {
    return Array.from(this.loadedPlugins.entries()).map(([path, loadedPlugin]) => ({
      path,
      plugin: loadedPlugin.plugin
    }));
  }

  /**
   * 根据插件名称查找插件
   * @param pluginName 插件名称
   */
  getPluginByName(pluginName: string): Plugin | undefined {
    for (const [, loadedPlugin] of this.loadedPlugins) {
      if (loadedPlugin.plugin.name === pluginName) {
        return loadedPlugin.plugin;
      }
    }
    return undefined;
  }
  /**
   * 根据目录名获取所有插件名称
   */
  getAllPlugins(): string[] {
    const pluginsDir = path.join(process.cwd(), 'plugins');
    if (!fs.existsSync(pluginsDir)) {
      logger.warn(`Plugins directory does not exist: ${pluginsDir}`);
      return [];
    }
    try {
      const items = fs.readdirSync(pluginsDir);
      const pluginDirs = items.filter(item => {
        const itemPath = path.join(pluginsDir, item);
        return fs.statSync(itemPath).isDirectory(); // 只保留目录
      });
      return pluginDirs;
    } catch (error) {
      logger.error(`Error reading plugins directory: ${error}`);
      return [];
    }
  }
  /**
   * 初始化插件管理器
   */
  async initialize() {
    const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8')
    const cyberconfig = JSON.parse(config);
    // 添加插件管理器到napcat实例中
    // 遍历系统插件
    if (Array.isArray(cyberconfig.plugins.system)) {
      for (const pluginDir of cyberconfig.plugins.system) {
        const fullPath = path.join(process.cwd(), 'plugins', pluginDir, 'index.js');
        try {
          await this.load(fullPath);
          logger.info(`Loaded system plugin from ${fullPath}`);
        } catch (error) {
          logger.error(`Failed to load system plugin from ${fullPath}: ${error}`);
        }
      }
    }
    // 遍历 cyberconfig.plugins 并加载用户插件
    if (Array.isArray(cyberconfig.plugins.user)) {
      for (const pluginDir of cyberconfig.plugins.user) {
        const fullPath = path.join(process.cwd(), 'plugins', pluginDir, 'index.js');
        try {
          await this.load(fullPath);
          logger.info(`Loaded plugin from ${fullPath}`);
        } catch (error) {
          logger.error(`Failed to load plugin from ${fullPath}: ${error}`);
        }
      }
    }
    // 示例：获取已加载的插件信息
    logger.info(`Loaded plugins: ${JSON.stringify(this.getLoadedPlugins())}`);
  }
}

export const pluginManager = new PluginManager();
export { Plugin };
