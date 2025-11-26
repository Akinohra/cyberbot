import { type Plugin, Structs, events, logger } from "../../core/index.js";

const enableGroups:number[] = [];// 启用的群号

// 存储待验证用户信息
const pendingVerifications = new Map<string, {
  question: string,
  answer: number,
  groupId: number,
  userId: number,
  timer: NodeJS.Timeout,
  attempts: number
}>();

const plugin: Plugin = {
  name: 'verification',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '入群验证功能：新成员加入群聊后需在180秒内完成简单的加法题验证，否则将被踢出群聊',
  
  
  handlers: {
    message: async (context) => {
      if (!context || !context.user_id) return;
      if (!('group_id' in context)) return;
      if (!enableGroups.includes(context.group_id)) return;
      const groupId = context.group_id;
      const userId = context.user_id;
      const verificationKey = `${groupId}_${userId}`;
      // 检查该用户是否在验证列表中
      if (pendingVerifications.has(verificationKey)) {
        const verification = pendingVerifications.get(verificationKey)!;
        
        // 增加尝试次数
        verification.attempts += 1;
        
        // 尝试将消息转换为数字并检查是否正确
        const userAnswer = parseInt(context.raw_message.trim());
        
        if (!isNaN(userAnswer)) {
          if (userAnswer === verification.answer) {
            // 回答正确，取消计时器
            clearTimeout(verification.timer);
            
            // 从验证列表中移除
            pendingVerifications.delete(verificationKey);
            
            // 发送验证成功消息
            await events.reply(context, [
              Structs.at(userId),
              Structs.text(` 恭喜您，验证成功！欢迎加入本群。`)
            ]);
          } else {
            // 回答错误，给出提示并允许重试
            const remainingTimeMs = 180 * 1000 - (verification.attempts * 5000); // 粗略估计已用时间
            const remainingTimeSec = Math.max(Math.floor(remainingTimeMs / 1000), 0);
            
            await events.reply(context, [
              Structs.at(userId),
              Structs.text(` 回答错误，请重新尝试。您还有约${remainingTimeSec}秒时间。\n题目：${verification.question}`)
            ]);
          }
        }
      }
    },
    request: async (context) => {
      // 检查是否为群成员增加的通知
      if (context.request_type === 'group' && context.sub_type === 'add') {
        if (!enableGroups.includes(context.group_id)) return;
        // 新成员加入群聊
        const groupId = context.group_id;
        const userId = context.user_id;
        await events.aprroveGroupJoinRequest(context.flag, true);
        
        // 生成两个1-100之间的随机数
        const num1 = Math.floor(Math.random() * 100) + 1;
        const num2 = Math.floor(Math.random() * 100) + 1;
        const is_add = num1 < num2;
        const answer = is_add ? num1 + num2 : num1 - num2;
        const question = `${num1} ${is_add ? '+' : '-'} ${num2}`;

        // 向群发送验证消息 - 修复消息格式
        await events.sendGroupMessage(groupId, [
          Structs.at(userId), 
          Structs.text(` 欢迎加入本群！请在「180」秒内发送「${question}」的运算结果，不然会被移出群聊喵 (✿◡‿◡)`)
        ]);

        // 记录此用户的验证信息
        const verificationKey = `${groupId}_${userId}`;
        
        // 设置计时器，180秒后检查是否验证成功
        const timer = setTimeout(async () => {
          // 检查该用户是否还在待验证列表中
          if (pendingVerifications.has(verificationKey)) {
            // 未完成验证，踢出群聊
            try {
              await events.kick(groupId, userId, false);
              await events.sendGroupMessage(groupId, [
                Structs.text(`由于 ${userId} 未能在规定时间内完成验证，已被移出群聊。`)
              ]);
            } catch (error) {
              logger.error(`踢出用户失败: ${error}`);
              await events.sendGroupMessage(groupId, [
                Structs.text(`尝试移出用户 ${userId} 失败，可能是权限不足。`)
              ]);
            }
            
            // 从待验证列表中移除
            pendingVerifications.delete(verificationKey);
          }
        }, 180 * 1000); // 180秒
        
        // 保存验证信息
        pendingVerifications.set(verificationKey, {
          question,
          answer,
          groupId,
          userId,
          timer,
          attempts: 0
        });
      }
    }
  }
};

export default plugin;