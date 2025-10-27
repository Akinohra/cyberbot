import { type Plugin, events, napcat } from "../../core/index.js";

const enableGroups: number[] = []; // 启用的群号

// 添加一个Map来记录用户最后触发命令的时间
const userCooldownMap = new Map();
const COOLDOWN_TIME = 5 * 60 * 1000; // 5分钟的冷却时间（毫秒）
// 添加多个回复语句
const banMessages = [
    `⚡天道法则波动！[nickname]道友顿悟「闭口禅」大神通，雷劫将至，闭关banTime秒！(温馨提示：渡劫期间建议默诵《莫生气》心法)`,
    `🔮天机已定！[nickname]道友被【天道】选中，进入「默语修行」状态，禁言banTime秒！(修行期间可打坐冥想，提高道行)`,
    `🌩️天雷轰顶！[nickname]道友触发「天选之人」法阵，被迫闭关banTime秒！(道友可在心中默念：我不生气，我不生气...)`,
    `✨仙缘已至！恭喜[nickname]道友获得「闭口缄言」神功传承，需专心修炼banTime秒！(友情提示：神功大成后可掌握"沉默是金"奥义)`,
    `🏮灯火阑珊处！[nickname]道友偶得「无言真经」，需静心参悟banTime秒！(参悟期间，群内信息皆为道心干扰，切勿理会)`,
    `🎭机缘巧合！[nickname]道友中了「哑口无言」奇门遁甲，需安静banTime秒解咒！(解咒期间，建议细品一杯枸杞茶养生)`,
    `⏳时来运转！[nickname]道友被太上老君点化，进入「止语悟道」状态，需安静banTime秒！(点化期间切勿心浮气躁，伤及道基)`,
    `🔥祝贺[nickname]道友获选天命之人，享受「禅定之境」banTime秒！(禅定中请勿打扰，否则功亏一篑)`,
    `📜天榜已定！[nickname]道友获封「缄默使者」，需闭关修炼banTime秒！(修炼期间可思考人生，领悟真谛)`
    ];

const plugin: Plugin = {
  name: 'chosen-one',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '天选之人',
  
  handlers: {
    message: async (context) => {
        if(context.raw_message === '天选之人' && 'group_id' in context && enableGroups.includes(context.group_id)){
            // 获取发送消息用户的ID
            const userId = context.user_id;
            const currentTime = Date.now();
            
            // 检查用户是否在冷却期
            if(userCooldownMap.has(userId)) {
              const lastTime = userCooldownMap.get(userId);
              const timeElapsed = currentTime - lastTime;
              
              if(timeElapsed < COOLDOWN_TIME) {
                // 计算剩余冷却时间（秒）
                const remainingTime = Math.ceil((COOLDOWN_TIME - timeElapsed) / 1000);
                events.reply(context, `道友刚刚施展过此神通，元气未复，请${remainingTime}秒后再试！`);
                return;
              }
            }
            // 记录用户触发时间
            userCooldownMap.set(userId, currentTime);
            // 原有的天选逻辑
            const group_member_list = await napcat.get_group_member_list({group_id: context.group_id})
            const random_item = events.randomItem(group_member_list);
            const ban_id = random_item ? random_item.user_id : 0;
            const isAdmin = await events.isGroupAdmin(context.group_id, ban_id);
            const isOwner = await events.isGroupOwner(context.group_id, ban_id);
            const can_ban = !(isAdmin || isOwner);
            const ban_random_time = events.randomInt(30, 300)
            can_ban && await events.ban(context.group_id, ban_id, ban_random_time)
            
            // 随机选择一条回复语句
            const randomMessage = events.randomItem(banMessages)
            .replace('nickname', random_item.card || random_item.nickname)
            .replace('banTime', ban_random_time.toString());
            
            events.reply(context, randomMessage);
        }
    },
  }
};

export default plugin;