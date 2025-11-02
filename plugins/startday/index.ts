import { type Plugin, napcat, logger, Structs } from "../../core/index.js";
import axios from "axios";

const enableGroups:number[] = [];// 启用的群号

const plugin: Plugin = {
  name: 'startday',
  version: '1.0.0',
  description: '定时推送晨间新闻的功能',
  
  handlers: {
    message: (context) => {
    }
  },

  // onLoad: async () => {
  //   logger.info('Plugin1 loaded and message listener registered');
  // },

  // onUnload: async () => {
  //   logger.info('Plugin1 unloaded and message listener removed');
  // }
  crons: (cron) => {
    // 每天早上9点执行一次的任务
    cron('0 0 9 * * *', async () => {
        // 如果 enableGroups 为空数组，则不执行任何操作
        if (enableGroups.length === 0) {
          logger.info('No groups configured for morning news, skipping...');
          return;
        }
      const newsApiUrl = 'https://ai-h5.vivo.com.cn/hiboard-morningpaper/index.html?pid=17611841663859d13a1e2059b47e297a9baa28c8d6082&newsFrom=0&ids=&api=https://smart-feeds.vivo.com.cn&vaid=43bbc4e3f51a1cf04385c5a85924a3e921a0e674df75595d9d6b6c512f0c2cec&abShow=1&newstype=5&vivoArticleNo=V0500000000000013vE8v4f'
        try {
            const base64_img = await axios.post('http://192.168.10.124:65001/screenshot', {url: newsApiUrl})
            if (base64_img.data && base64_img.data.screenshot) {
                const base64Buffer = base64ToBuffer(base64_img.data.screenshot);
                // 遍历 enableGroups 数组，向每个群组发送消息
                for (const groupId of enableGroups) {
                    napcat.send_group_msg({
                        group_id: groupId, 
                        message: [Structs.image(base64Buffer)]
                    });
                }
            }
        }catch (error) {
          logger.error('Error fetching news:');
        }
    });
    cron('0 0 18 * * *', async () => {
        // 如果 enableGroups 为空数组，则不执行任何操作
        if (enableGroups.length === 0) {
          logger.info('No groups configured for morning news, skipping...');
          return;
        }
        const newsApiUrl = 'https://ai-h5.vivo.com.cn/hiboard-morningpaper/index.html?pid=176199298107610a7d623964e4b19bef2263bd0750e0b&newsFrom=1&ids=&api=https://smart-feeds.vivo.com.cn&vaid=43bbc4e3f51a1cf04385c5a85924a3e921a0e674df75595d9d6b6c512f0c2cec&abShow=1&newstype=6&vivoArticleNo=V124514857582d7308cb4e6aa0b330538d2'
        try {
            const base64_img = await axios.post('http://192.168.10.124:65001/screenshot', {url: newsApiUrl})
            if (base64_img.data && base64_img.data.screenshot) {
                const base64Buffer = base64ToBuffer(base64_img.data.screenshot);
                // 遍历 enableGroups 数组，向每个群组发送消息
                for (const groupId of enableGroups) {
                    napcat.send_group_msg({
                        group_id: groupId, 
                        message: [Structs.image(base64Buffer)]
                    });
                }
            }
        }catch (error) {
          logger.error('Error fetching news:');
        }
    });

  }
};

const base64ToBuffer = (base64Image: string): Buffer => {
  // 去除 base64 数据中的 MIME 类型部分
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  // 将 base64 数据转换为 Buffer
  const buffer = Buffer.from(base64Data, 'base64');
  
  return buffer;
};

export default plugin;