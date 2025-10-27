import { type Plugin, events, napcat, logger } from "../../core/index.js";
const enableGroups:number[] = [];// 启用的群号

const plugin: Plugin = {
  name: 'like',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '点赞',
  
  handlers: {
    message: async (context) => {
      if('group_id' in context && !enableGroups.includes(context.group_id)) return;
      const key = ["赞我", "草我", "点赞"];
      if (key.includes(context.raw_message)) {
        try {
          await napcat.send_like({
            user_id: context.sender.user_id,
            times: 20,
          });
          await events.reply(context, "已赞（￣︶￣）↗　")
        } catch (err) {
          if (err instanceof Error && err.message.includes("上限")) {
            await events.reply(context, "今天赞过了哦, 明天再来吧!(●'◡'●)", true);
          } else {
            logger.warn(`[-]插件执行出错: ${err}`);
            await events.reply(context, `点赞失败, 原因: ${err}`, true);
          }
        }
      }
    },
  },
};

export default plugin;