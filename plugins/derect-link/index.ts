import { type Plugin, Structs, ctx } from "../../core/index.js";
const enableGroups:number[] = [];// 启用的群号

const plugin: Plugin = {
  name: 'derect-link',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '获取直链',
  
  handlers: {
    message: async (e) => {
      if('group_id' in e && !enableGroups.includes(e.group_id)) return;
      if(e.message.some(msg => ['reply', 'at'].includes(msg.type)) && ctx.getText(e) === '取'){
          const url = await ctx.getTemporaryDirectLink(e)
          ctx.reply(e, `${url}`);
      }
      if(e.message.some(msg => msg.type === 'at') && e.message.some(msg => msg.type === 'text' && msg.data?.text?.trim() === '取头像')){
          const atqq = e.message.find(msg => msg.type === 'at')?.data?.qq 
          if(!atqq) return;
          ctx.reply(e, [Structs.text(ctx.getQQAvatarLink(Number(atqq), 100)), Structs.image(ctx.getQQAvatarLink(Number(atqq), 100))])
      }
    },
  }
};

export default plugin;