import { type Plugin, Structs, events, logger, napcat } from "../../core/index.js";
import axios from 'axios';

const plugin: Plugin = {
  name: 'demo',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: 'A simple plugin that demo using napcat',
  
  handlers: {
    message: async (context) => {
      // 收到 hello 消息时回复 Hi there!
      if (context.raw_message === 'hello') {
        const { message_id } = await events.reply(context, 'Hi there!', true);
        //5s撤回
        setTimeout(() => {
          events.delete_msg(message_id)
        }, 5000);
      }
      // 收到 love 消息时回复爱你哟和一个爱心 QQ 表情
      if (context.raw_message === 'love') {
        // 复杂消息消息可以使用数组组合
        events.reply(context, ['爱你哟 ', Structs.face(66)])
      }
      // 收到 壁纸 消息时回复今天的 bing 壁纸
      if (context.raw_message === '壁纸') {
        // 第一个参数是图片的 URL，第二个参数是是否使用缓存，true 为使用缓存，false 为不使用缓存
        events.reply(context, [Structs.image('https://p2.qpic.cn/gdynamic/m7yRCticIwlKMnXkIat8nNRyD95wf24YNBoiblNYKYdXs/0')])
      }
      // 收到 一言 消息时回复一言
      if (context.raw_message === '一言') {
        const { data } = await axios.get('https://v1.hitokoto.cn/')
        events.reply(context, data.hitokoto)
      }
    },
    request: async (context) => {
      // 处理所有请求：好友、群，添加好友、邀请入群等等
      console.log('收到请求:', JSON.stringify(context));
      // 群组相关请求
      if (context.request_type === 'group') {
        // 自动同意群邀请或加群请求
        await events.aprroveGroupJoinRequest(context.flag, true);
        console.log('已自动同意群组请求');
      }
      
      // 好友相关请求可以在这里处理
      if (context.request_type === 'friend') {
        // 处理好友请求
      }
    },
    notice: async (context) => {
      // 处理所有通知：好友、群的数量增加与减少、戳一戳、撤回，以及群的签到、禁言、管理变动、转让等等
      console.log('收到通知:', JSON.stringify(context));
    },
  },

  // onLoad: async () => {
  //   logger.info('Plugin1 loaded and message listener registered');
  // },

  // onUnload: async () => {
  //   logger.info('Plugin1 unloaded and message listener removed');
  // }
  // crons: (cron) => {
  //   // 每分钟执行一次的任务
  //   cron('0 * * * * *', () => {
  //     logger.info('[Plugin1] Cron job executed: This runs every minute');
  //   });
    
  //   // 每5秒执行一次的任务
  //   cron('*/5 * * * * *', () => {
  //     logger.info('[Plugin1] Cron job executed: This runs every 5 seconds');
  //   });
  // }
};

export default plugin;