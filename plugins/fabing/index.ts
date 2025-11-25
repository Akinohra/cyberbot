import { type Plugin, ctx, napcat, bot_uin } from "../../core/index.js";
import axios from 'axios';

const enableGroups:number[] = [];// 启用的群号

const plugin: Plugin = {
  name: 'fabing',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '发病文学',
  
  handlers: {
    message: async (e) => {
      if('group_id' in e && !enableGroups.includes(e.group_id)) return;
      const reg = /^\s*(每日)?(发病|发癫)\s*(.*)$/
      const matches = e.raw_message.match(reg)
      if (matches) {
        const name = matches[2] || (e.sender.card ?? e.sender.nickname)
        const { message_id } = await ctx.reply(e, await fetchFbMsgs(name))
        //延时3s
        setTimeout(() => {
            ctx.delete_msg(message_id)
        }, 60000)
      }
    },
    notice: async (e) => {
      if('group_id' in e && !enableGroups.includes(e.group_id)) return;
      // 处理所有通知：好友、群的数量增加与减少、戳一戳、撤回，以及群的签到、禁言、管理变动、转让等等
      if(!('group_id' in e  && e.notice_type =="notify"  && e.sub_type === "poke")) return;
      const { target_id, user_id } = e

        if (target_id === bot_uin) {
          const member = await napcat.get_group_member_info({group_id:e.group_id, user_id: user_id})
          const msg = await fetchFbMsgs((member.card || user_id).toString())
          const { message_id } = await ctx.sendGroupMessage(e.group_id, msg)
          //延时60s
          setTimeout(() => {
            ctx.delete_msg(message_id)
          }, 60000)
        }
    },
  },
};

async function fetchFbMsgs(name: string) {
  // const { data } = await axios.get('https://fb.viki.moe', { params: { name } })
  // return data
    const { data} = await axios.get(`https://api.lolimi.cn/API/fabing/fb.php?name=${name}`);
    return data.data;
}

export default plugin;