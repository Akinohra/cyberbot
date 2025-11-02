import { type Plugin, events, napcat, logger } from "../../core/index.js";
const enableGroups:number[] = [];// 启用的群号

const plugin: Plugin = {
  name: 'like',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.1',
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
          await napcat.set_msg_emoji_like({
            message_id: context.message_id,
            emoji_id: "319",
            set: true
          })
          const replies = [
            "已赞！大佬请收下我的膝盖～(￣▽￣～)~",
            "点赞成功！感觉您的魅力值+10086",
            "Boom！20个赞已送达，您就是今日最亮的仔✨",
            "点赞完成～您的帅气/美丽已经突破天际！",
            "操作成功！这波赞我必须给您点满 (๑•̀ㅂ•́)و✧",
            "已疯狂点赞！再不回复我都要被您的魅力电到了！",
            "搞定！您的赞已被我承包啦～(～￣▽￣)～",
            "点赞如雨下，专为您而洒٩(๑>◡<๑)۶"
          ];
          await events.reply(context, events.randomItem(replies))
        } catch (err) {
          logger.warn(`[-]插件执行出错: ${typeof err}`);
          if ((err as any).message.includes("上限")) {
                await napcat.set_msg_emoji_like({
                  message_id: context.message_id,
                  emoji_id: "123",
                  set: true
                })
            await events.reply(context, "今天赞过了哦, 明天再来吧!(●'◡'●)", true);
          } else {
            logger.warn(`[-]插件执行出错: ${JSON.stringify(err)}`);
            await events.reply(context, `点赞失败, 原因: ${err}`, true);
          }
        }
      }
    },
  },
};

export default plugin;