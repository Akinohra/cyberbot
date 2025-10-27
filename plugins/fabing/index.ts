import { type Plugin, events, napcat, bot_uin } from "../../core/index.js";
import axios from 'axios';

const enableGroups:number[] = [];// 启用的群号

const plugin: Plugin = {
  name: 'fabing',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '发病文学',
  
  handlers: {
    message: async (context) => {
      if('group_id' in context && !enableGroups.includes(context.group_id)) return;
      const reg = /^\s*(每日)?(发病|发癫)\s*(.*)$/
      const matches = context.raw_message.match(reg)
      if (matches) {
        const name = matches[2] || (context.sender.card ?? context.sender.nickname)
        const { message_id } = await events.reply(context, await fetchFbMsgs(name))
        //延时3s
        setTimeout(() => {
            events.delete_msg(message_id)
        }, 60000)
      }
    },
    notice: async (context) => {
      if('group_id' in context && !enableGroups.includes(context.group_id)) return;
      // 处理所有通知：好友、群的数量增加与减少、戳一戳、撤回，以及群的签到、禁言、管理变动、转让等等
      if(!('group_id' in context  && context.notice_type =="notify"  && context.sub_type === "poke")) return;
      const { target_id, user_id } = context

        if (target_id === bot_uin) {
          const member = await napcat.get_group_member_info({group_id:context.group_id, user_id: user_id})
          const msg = await fetchFbMsgs((member.card || user_id).toString())
          const { message_id } = await events.sendGroupMessage(context.group_id, msg)
          //延时60s
          setTimeout(() => {
            events.delete_msg(message_id)
          }, 60000)
        }
    },
  },
};

async function fetchFbMsgs(name: string) {
  const { data } = await axios.get('https://fb.viki.moe', { params: { name } })
  return data
}

export default plugin;