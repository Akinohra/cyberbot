import { type Plugin, ctx, napcat, logger } from "../../core/index.js";

const plugin: Plugin = {
  name: 'like',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.1',
  description: '点赞',
  
  handlers: {
    message: async (e) => {
      const key = ["赞我", "草我", "点赞"];
      if (key.includes(e.raw_message)) {
        try {
          await napcat.send_like({
            user_id: e.sender.user_id,
            times: 20,
          });
          await napcat.set_msg_emoji_like({
            message_id: e.message_id,
            emoji_id: "319",
            set: true
          })
        } catch (err) {
          logger.warn(`[-]插件执行出错: ${typeof err}`);
          if ((err as any).message.includes("上限")) {
                await napcat.set_msg_emoji_like({
                  message_id: e.message_id,
                  emoji_id: "123",
                  set: true
                })
          } else {
            logger.warn(`[-]插件执行出错: ${JSON.stringify(err)}`);
            await ctx.reply(e, `点赞失败, 原因: ${err}`, true);
          }
        }
      }
    },
  },
};

export default plugin;