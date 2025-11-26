import { type Plugin, Structs, events } from "../../core/index.js";
const enableGroups:number[] = [];// 启用的群号

const plugin: Plugin = {
  name: 'derect-link',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '获取直链',
  
  handlers: {
    message: async (context) => {
      if('group_id' in context && !enableGroups.includes(context.group_id)) return;
      if(context.message.some(msg => ['reply', 'at'].includes(msg.type)) && events.getText(context) === '取'){
          const url = await events.getTemporaryDirectLink(context)
          events.reply(context, `${url}`);
      }
      if(context.message.some(msg => msg.type === 'at') && context.message.some(msg => msg.type === 'text' && msg.data?.text?.trim() === '取头像')){
          const atqq = context.message.find(msg => msg.type === 'at')?.data?.qq 
          if(!atqq) return;
          events.reply(context, [Structs.text(events.getQQAvatarLink(Number(atqq), 100)), Structs.image(events.getQQAvatarLink(Number(atqq), 100))])
      }
    },
  }
};

export default plugin;