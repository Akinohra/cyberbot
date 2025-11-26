import { PrivateFriendMessage } from "node-napcat-ts";
import { type Plugin, Structs, events, NodeSegment, napcat } from "../../core/index.js";
import { loadConfig, saveConfig, matchKeyword, isRegexString } from './helper.js'
import path from 'path';

const name:string = "manage";
const configPath:string = path.join(process.cwd(), `plugins/${name}`);

interface Config {
    enableGroups: number[];
    banwords: string[];
    recallwords: string[];
}
let config:Config = {
    enableGroups: [],
    banwords: [],
    recallwords: []
};
const cmds: string[] = [
    '#mg',
    '#mg on/off',
    '#踢 <@成员>',
    '#禁言 <@成员> <?分钟>',
    '#解禁 <@成员>',
    '#开/关灯',
    '#撤回 <@成员> <?条数>',
    '#改群名 <群名>',
    '#加/删管理 <@成员>',
    '#改名片 <@成员> <名片>',
    '#改头衔 <@成员> <头衔>',
    '#加撤回词 <词>',
    '#删撤回词 <词>',
    '#加禁言词 <词>',
    '#删禁言词 <词>',
    '#撤回词列表',
    '#禁言词列表',
    '#微群管'
];

const ban_time = 5;  //禁言时长 单位：分钟

// 初始化时读取配置
(async () => {
  try {
    config = loadConfig(configPath, config) as Config;
  } catch (error) {
    console.error('Error reading config:', error);
  }
})();

const plugin: Plugin = {
  name: name,  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '微群管插件',
  
  handlers: {
    message: async (context) => {
      const regex = /^#.*/i
      
      // 过滤 CQ 码
      const commond:string = context.raw_message;
      // 判断是否有权限
      if((await events.hasRight(context.sender.user_id))){
        // at 消息元素列表
        const ats = events.getMessageAt(context);
        //根据空格拆分消息
        const messages:string[] = commond.split(/\s+/);
        if('group_id' in context && commond.match(regex)) {

          //群指令
          if (commond.startsWith('#mg')) {
            const [_, secondCmd] = commond.split(' ');
        
            if (!['on', 'off'].includes(secondCmd)) {
                return events.reply(context, cmds.join('\n'), true);
            }
          
            const isEnabled = config.enableGroups.includes(context.group_id);
            const actionMap = {
              on: {
                  condition: !isEnabled,
                  successMsg: '✅ 本群开启成功',
                  errorMsg: '❎ 本群已开启',
                  update: () => {
                    if (!config.enableGroups.includes(context.group_id)) {
                      config.enableGroups.push(context.group_id);
                    }
                  }
              },
              off: {
                  condition: isEnabled,
                  successMsg: '✅ 本群关闭成功',
                  errorMsg: '❎ 本群未开启',
                  update: () => {
                    const index = config.enableGroups.indexOf(context.group_id);
                    if (index > -1) {
                      config.enableGroups.splice(index, 1);
                    }
                  }
              }
            };
          
            const { condition, successMsg, errorMsg, update } = actionMap[secondCmd as keyof typeof actionMap];
            
            if (condition) {
              update();
              saveConfig(configPath, config);
              return await events.reply(context, successMsg);
            }
          
            return events.reply(context, errorMsg);
          }
          // 群聊触发
          if(!config.enableGroups.includes(context.group_id)){
            return
          }
          // 触发指令
          if (commond.startsWith('#踢')) {
            if(!ats[0]){
            return events.reply(context, '❎移出失败，该群员不存在');
            }
            await events.kick(context.group_id, ats[0])
            return events.reply(context, `🌟${ats[0]} 被移出群聊`);
          }
          else if(commond.startsWith('#禁言')){
              // 执行禁言
              if(!ats[0]){
                return events.reply(context, '❎禁言/解除禁言失败，该群员不存在');
              }
              const info = await napcat.get_group_member_info({group_id:context.group_id, user_id: ats[0]})
              const name = info.card || (info.nickname ?? ats[0])
              events.ban(context.group_id, ats[0], parseInt(messages[2]) * 60);
              return events.reply(context, name + '已被禁言'+messages[2] + '分钟！');

          }
          else if(commond.startsWith('#解禁')){
              // 解除禁言
              if(!ats[0]){
                return events.reply(context, '❎解除失败，该群员不存在');
              }
              const info = await napcat.get_group_member_info({group_id:context.group_id, user_id: ats[0]})
              const name = info.card || (info.nickname ?? ats[0])
              events.ban(context.group_id, ats[0], 0);
              return events.reply(context, '✅已解除对'+name+'的禁言！');
          }
          else if (['#关灯', '#全员禁言'].includes(commond)) {
              events.banAll(context.group_id, true);
              return events.reply(context, '✅已开启全员禁言');
          }
          else if (['#开灯', '#全员解禁'].includes(commond)) {
              events.banAll(context.group_id, false);
              return events.reply(context, '✅已解除全员禁言'); 
          }
          else if(commond.startsWith('#撤回')){
              if(!ats[0]){
                return events.reply(context, '❎撤回失败，该消息指向的用户不存在');
              }
              let count = 0,  m_id = 0;
              let histrymsgs: { user_id: number; message_id: number; }[] = [];
              let flag = true;
              setTimeout(()=>{//180s还未结束退出循环
                flag = false;
              }, 180000)
              events.reply(context, "正在撤回...");
        
              while(count < parseInt(messages[2]) && flag){
                        
                  const msgs = await napcat.get_group_msg_history({
                      group_id: context.group_id,
                      message_seq: m_id,
                      count:50,
                      reverseOrder:true
                  })
                  
                  // 提取 user_id 和 message_id
                  histrymsgs = msgs.messages.map(msg => ({
                      user_id: msg.sender.user_id,
                      message_id: msg.message_id
                  }));
            
                
                if(histrymsgs.length > 0){
                  for (let histrymsg of histrymsgs) {
                    if (histrymsg.user_id == ats[0]) {
                      await events.delete_msg(histrymsg.message_id);
                      count++;
                    }
                    if(count >= parseInt(messages[2])){
                      break;
                    }
                  }
                  m_id = histrymsgs[histrymsgs.length-1].message_id
                }
              }
              return events.reply(context, "✅撤回成功");
          }
          else if(commond.startsWith('#改群名')){
              napcat.set_group_name({ group_id: context.group_id, group_name: messages[1] })
              return events.reply(context, "✅更改成功", true);
          }
          else if(commond.startsWith('#加管理')){
              if(!ats[0]){
                return events.reply(context, '❎添加失败，该群员不存在');
              }
              napcat.set_group_admin({ group_id: context.group_id, user_id: ats[0], enable: true });
              return events.reply(context, "✅添加成功", true);
          }
          else if(commond.startsWith('#删管理')){
              if(!ats[0]){
                return events.reply(context, "❎删除失败，该群员不存在", true);
              }
              // napcat.setGroupAdmin(context.group_id, qqs[1], false);
              napcat.set_group_admin({ group_id: context.group_id, user_id: ats[0], enable: false });
              return events.reply(context, "✅删除成功", true);
          }
          if(commond.startsWith('#改名片')){
              if(!ats[0]){
                return events.reply(context, '❎修改失败，该群员不存在');
              }
              napcat.set_group_card({ group_id: context.group_id, user_id: ats[0], card: messages[2] });
              return events.reply(context, "✅修改成功", true);
          }
          else if(commond.startsWith('#改头衔')){
              if(!ats[0]){
                return events.reply(context, '❎修改失败，该群员不存在');
              }
              napcat.set_group_special_title({ group_id: context.group_id, user_id: ats[0], special_title: messages[2] });
              return events.reply(context, "✅修改成功", true);
          }
        }
        if(commond.startsWith('#加撤回词')){
          if(!messages[1]){
            return events.reply(context, '格式错误，正确格式：#加撤回词 <词>', true);
          }
          if (config.recallwords.includes(messages[1])) {
            return events.reply(context, '❎ 词已存在');
          }
          config.recallwords.push(messages[1]);
          saveConfig(configPath, config)
          return events.reply(context, '✅ 添加成功');
        }
        else if(commond.startsWith('#删撤回词')){
          if(!messages[1]){
            return events.reply(context, '格式错误，正确格式：#删撤回词 <词>', true);
          }
          if (!config.recallwords.includes(messages[1])) {
            return events.reply(context, '❎ 词不存在');
          }
          const idx = config.recallwords.findIndex(e => e[0] === messages[1]);
          config.recallwords.splice(idx, 1);
          saveConfig(configPath, config)
          return events.reply(context, '✅ 删除成功');
        }
        else if(commond.startsWith('#加禁言词')){
          if(!messages[1]){
            return events.reply(context, '格式错误，正确格式：#加禁言词 <词>', true);
          }
          if (config.banwords.includes(messages[1])) {
            return events.reply(context, '❎ 词已存在');
          }
          config.banwords.push(messages[1]);
          saveConfig(configPath, config)
          return events.reply(context, '✅ 添加成功');
        }
        else if(commond.startsWith('#删禁言词')){
          if(!messages[1]){
            return events.reply(context, '格式错误，正确格式：#删禁言词 <词>', true);
          }
          if (!config.banwords.includes(messages[1])) {
            events.reply(context, `${messages[1]}`);
            return events.reply(context, '❎ 词不存在');
          }
          const idx = config.banwords.findIndex(e => e[0] === messages[1]);
          config.banwords.splice(idx, 1);
          saveConfig(configPath, config)
          return events.reply(context, '✅ 删除成功');
        }
        else if(commond === '#禁言词列表'){
          if(config.banwords.length === 0){
            return events.reply(context, '禁言词列表为空', true);
          }
          const target_id: number = 'group_id' in context ? context.group_id : (context as PrivateFriendMessage).user_id;
          // 禁言词列表展示逻辑
          const forwardmsg: NodeSegment[] = [
              {
                  type: 'node',
                  data: {
                      content: [
                          Structs.text("==禁言词列表==")
                      ]
                  }
              },
              {
                  type: 'node',
                  data: {
                      content: [
                          Structs.text(
                          config.banwords.join('\n')
                          )
                      ]
                  }
              }
          ];
          events.fakeMessage(target_id, forwardmsg, 'group_id' in context)
        }
        else if(commond === '#撤回词列表'){
          if(config.recallwords.length === 0){
            return events.reply(context, '撤回词列表为空', true);
          }
          const target_id: number = 'group_id' in context ? context.group_id : (context as PrivateFriendMessage).user_id;
          // 禁言词列表展示逻辑
          const forwardmsg: NodeSegment[] = [
              {
                  type: 'node',
                  data: {
                      content: [
                          Structs.text("==撤回词列表==")
                      ]
                  }
              },
              {
                  type: 'node',
                  data: {
                      content: [
                          Structs.text(
                          config.recallwords.join('\n')
                          )
                      ]
                  }
              }
          ];
          events.fakeMessage(target_id, forwardmsg, 'group_id' in context)
        }
        else  if(commond === '#微群管'){
          return events.reply(context, cmds.join('\n'), true);
        }
      }else {
        if (!('group_id' in context)) return;
        const { raw_message, sender, message_id } = context;
        //禁言词
        for (const item of config.banwords) {//精确
          // 判断是否为正则匹配
          if ( raw_message !== item && isRegexString(item)) {
            const content = matchKeyword(raw_message, item);
            if (content) {
              await events.ban(context.group_id, sender.user_id, ban_time * 60);
              await events.delete_msg(message_id);
              const { message_id:mid } = await events.reply(context, '消息含有违禁词，请文明聊天。');
              // 60s撤回
              return setTimeout(() => {
                  events.delete_msg(mid);
              }, 10 * 1000);
            }
          }
          else if (raw_message === item) {
            await events.ban(context.group_id, sender.user_id, ban_time * 60);
            await events.delete_msg(message_id);
            const { message_id:mid } = await events.reply(context, '消息含有违禁词，请文明聊天。');
            // 60s撤回
            return setTimeout(() => {
                events.delete_msg(mid);
            }, 10 * 1000);
          }
        }
        //撤回词
        for (const item of config.recallwords) {//精确
          if ( raw_message !== item && isRegexString(item)) {
            const content = matchKeyword(raw_message, item);
            if (content) {
              await events.delete_msg(message_id);
              const { message_id:mid } = await events.reply(context, '消息含有违禁词，请文明聊天。');
              // 60s撤回
              return setTimeout(() => {
                  events.delete_msg(mid);
              }, 10 * 1000);
            }
          }
          else if (raw_message === item) {
            await events.delete_msg(message_id);
            const { message_id:mid } = await events.reply(context, '消息含有违禁词，请文明聊天。');
            // 60s撤回
            return setTimeout(() => {
                events.delete_msg(mid);
            }, 10 * 1000);
          }
        }
      }    

    }
  }
};

export default plugin;