import { type Plugin, ctx, napcat, logger, Structs, bot_uin } from "../../core/index.js";

const plugin: Plugin = {
  name: 'ops',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '管理员指令',
  
  handlers: {
    "message.group": async (e) => {
        /**
             * bot主人或管理
             */
        const hasRight = ctx.hasRight(e.user_id)

        /**
             * 消息中的文字部分
             */
        const text = ctx.getText(e);

        /**
             * 消息中第一个被艾特人的QQ号
             */
        const MentionedUserId = ctx.getMessageAt(e);

        /**
             * 检查权限和群身份
             * @param needGroupPower 是否需要群主/管理员权限
             * @param needOwner 是否需要群主权限
             * @returns boolean
             */
        const checkPermission = async (needGroupPower = true, needOwner = false) => {
            if (!hasRight) return false;
            
            // 只在需要时检查机器人权限
            if (needGroupPower || needOwner) {
                const botHasGroupPower = await ctx.isGroupAdmin(e.group_id, e.user_id);
                if (needOwner && !botHasGroupPower) return false;
                if (needGroupPower && !botHasGroupPower) return false;
            }

            if (MentionedUserId && needGroupPower) {
                // 只在需要时获取目标用户信息
                const targetMember = await napcat.get_group_member_info({ group_id: e.group_id, user_id: MentionedUserId, no_cache: false });
                if (!targetMember) return false;
                if (targetMember.role === 'owner' || targetMember.role === 'admin') return false;
            }
            return true;
        };

        /**
             * 获取被艾特成员实例并检查权限
             * @param needGroupPower 是否需要群主/管理员权限
             * @param needOwner 是否需要群主权限
             */
        const getMemberWithCheck = async (needGroupPower = true, needOwner = false) => {
            if (!await checkPermission(needGroupPower, needOwner)) return null;
            if (!MentionedUserId) {
                await ctx.reply(e, '？人被你吃了');
                return null;
            }
            const member = await napcat.get_group_member_info({ group_id: e.group_id, user_id: MentionedUserId, no_cache: false });
            return member;
        };

        // 命令列表
        const commands = [
            '#ops',
            '#ops help',
            '#改昵称 [昵称]',
            '#改头像 [图片]',
            '#改性别 [男/女/未知]',
            '#改个性签名 [签名]',
            '#退群',
            '#设置群管理 @某人',
            '#取消群管理 @某人',
            '#我要头衔 [头衔]',
            '#设置头衔 @某人 [头衔]',
            '#踢 @某人',
            '#禁言 @某人 [分钟]',
            '#解禁 @某人',
            '#改群名片 @某人 [名片]',
            '#改群名 [新群名]',
            '#改群头像 [图片]',
            '#撤回',
            '#开全员禁言',
            '#关全员禁言',
            '#发公告',
            '#取图片'
        ];

        // 命令用法说明
        const usages = [
            '基础命令:',
            '#ops - 显示所有可用命令',
            '#ops help - 显示此帮助信息',
            '',
            '机器人个人信息管理:',
            '#改昵称 [昵称] - 修改机器人昵称，需要机器人主人或管理员权限',
            '#改头像 [图片] - 修改机器人头像，需要机器人主人或管理员权限',
            '#改性别 [男/女/未知] - 修改机器人性别，需要机器人主人或管理员权限',
            '#改个性签名 [签名] - 修改机器人个性签名，需要机器人主人或管理员权限',
            '',
            '群管理功能:',
            '#退群 - 退出当前群，需要机器人主人或管理员权限',
            '#设置群管理 @某人 - 设置某人为群管理员，需要群主权限',
            '#取消群管理 @某人 - 取消某人的群管理员身份，需要群主权限',
            '#我要头衔 [头衔] - 给自己设置群头衔，需要机器人是群主',
            '#设置头衔 @某人 [头衔] - 给他人设置群头衔，需要群主权限',
            '#踢 @某人 - 踢出群成员，需要群主权限且发送者是机器人主人',
            '#禁言 @某人 [分钟] - 禁言群成员，默认30分钟，需要管理员权限',
            '#解禁 @某人 - 解除群成员禁言，需要管理员权限',
            '#改群名片 @某人 [名片] - 修改群成员名片，需要管理员权限',
            '#改群名 [新群名] - 修改群名称，需要管理员权限',
            '#改群头像 [图片] - 修改群头像，需要管理员权限',
            '#撤回 - 撤回被引用的消息，需要管理员权限',
            '#开全员禁言 - 开启全员禁言，需要管理员权限',
            '#关全员禁言 - 关闭全员禁言，需要管理员权限',
            '#发公告 - 将引用的消息发布为群公告，需要管理员权限',
            '',
            '其他功能:',
            '#取图片 - 获取引用消息中的图片及链接',
            '',
            '注意事项:',
            '- [] 中的参数为可选',
            '- @某人 表示需要在消息中提及目标用户',
            '- 部分命令需要特定权限才能使用'
        ];

        // 显示命令列表
        if (text === '#ops') {
            await ctx.reply(e, commands.join('\n'), true);
            return;
        }

        // 显示详细帮助
        if (text === '#ops help') {
            await ctx.reply(e, usages.join('\n'), true);
            return;
        }

        // 机器人个人信息管理
        if (text.startsWith('#改昵称')) {
            if (!hasRight) return;
            
            const quoteMsg = await ctx.getQuoteMessage(e);
            const nickname = text.replace('#改昵称', '').trim() || (quoteMsg ? ctx.getText(quoteMsg) : '');
            
            if (!nickname) {
                await ctx.reply(e, '？昵称被你吃了');
                return;
            }
            
            await napcat.set_qq_profile({
                nickname: nickname
            });
            
            await ctx.reply(e, 'done');
        }

        if (text.startsWith('#改头像')) {
            if (!hasRight) return;
            // 只在需要时获取图片URL
            const imgUrl = await ctx.getImageLink(e);
            if (!imgUrl) {
                await ctx.reply(e, '？图片被你吃了');
                return;
            }
            await napcat.set_qq_avatar({
                file: imgUrl
            });
            await ctx.reply(e, 'done');
        }

        if (text.startsWith('#改性别')) {
            if (!hasRight) return;
            const gender = text.replace('#改性别', '').trim();
            if (!gender) {
                await ctx.reply(e, '？染色体被你吃了');
                return;
            }
            const genderMap: Record<string, number> = { '男': 1, '女': 2, '未知': 0 };
            const genderCode = genderMap[gender];
            if (genderCode === undefined) {
                await ctx.reply(e, '性别只能是: 男/女/未知');
                return;
            }
            const botInfo = await napcat.get_login_info();
            await napcat.set_qq_profile({
                nickname: botInfo.nickname,
                sex: genderCode
            });
            await ctx.reply(e, 'done');
        }

        if (text.startsWith('#改个性签名')) {
            if (!hasRight) return;
            
            const quoteMsg = await ctx.getQuoteMessage(e);
            const signature = text.replace('#改个性签名', '').trim() || (quoteMsg ? ctx.getText(quoteMsg) : '');
            
            if (!signature) {
                await ctx.reply(e, '？签名被你吃了');
                return;
            }
            
            await napcat.set_self_longnick({
                longNick: signature
            });
            
            await ctx.reply(e, 'done');
        }

        // 管理功能
        if (text === '#退群') {
            if (!hasRight) return;
            await ctx.reply(e, 'done');
            await napcat.set_group_leave({ group_id: e.group_id });
        }

        if (text.startsWith('#设置群管理')) {
            const member = await getMemberWithCheck(true, true); // 需要群主权限
            if (!member || !MentionedUserId) return;
            await napcat.set_group_admin({ group_id: e.group_id, user_id: MentionedUserId, enable: true });
            await ctx.reply(e, 'done');
        }

        if (text.startsWith('#取消群管理')) {
            const member = await getMemberWithCheck(true, true); // 需要群主权限
            if (!member || !MentionedUserId) return;
            await napcat.set_group_admin({ group_id: e.group_id, user_id: MentionedUserId, enable: false });
            await ctx.reply(e, 'done');
        }

        if (text.startsWith('#我要头衔')) {
            const botHasGroupPower = await ctx.isGroupOwner(e.group_id, bot_uin!);
            if (!botHasGroupPower) return; // 机器人必须是群主
            const newTitle = text.replace('#我要头衔', '').trim();
            if (!newTitle) {
                await ctx.reply(e, '？头衔被你吃了');
                return;
            }
            await ctx.setTitle(e.group_id, e.sender.user_id, newTitle);
            await ctx.reply(e, 'done');
        }

        if (text.startsWith('#设置头衔')) {
            const member = await getMemberWithCheck(true, true); // 需要群主权限
            if (!member || !MentionedUserId) return;
            const newTitle = text.replace('#设置头衔', '').trim();
            await ctx.setTitle(e.group_id, MentionedUserId, newTitle);
            await ctx.reply(e, 'done');
        }

        if (text.startsWith('#踢')) {
            const member = await getMemberWithCheck(true, true); // 需要群主权限且发送者必须是主人
            if (!member || !(ctx.isMaster(e.user_id)) || !MentionedUserId) return;
            await ctx.kick(e.group_id, MentionedUserId, false);
            await ctx.reply(e, 'done');
        }

        // 禁言功能
        if (text.startsWith('#禁言')) {
            const member = await getMemberWithCheck(true); // 需要管理员权限
            if (!member || !MentionedUserId) return;
            const duration = parseInt(text.replace('#禁言', '').trim()) || 30;
            await ctx.ban(e.group_id, MentionedUserId, duration * 60);
            await ctx.reply(e, 'done');
        }

        // 解除禁言功能
        if (text.startsWith('#解禁')) {
            const member = await getMemberWithCheck(true); // 需要管理员权限
            if (!member || !MentionedUserId) return;
            await ctx.ban(e.group_id, MentionedUserId, 0);
            await ctx.reply(e, 'done');
        }

        // 改名片功能
        if (text.startsWith('#改群名片')) {
            const member = await getMemberWithCheck(true); // 需要管理员权限
            if (!member || !MentionedUserId) return;
            const card = text.replace('#改群名片', '').trim();
            await napcat.set_group_card({ group_id: e.group_id, user_id: MentionedUserId, card: card });
            await ctx.reply(e, 'done');
        }

        // 改群名功能
        if (text.startsWith('#改群名')) {
            if (!await checkPermission(true)) return; // 需要管理员权限
            const newName = text.replace('#改群名', '').trim();
            if (!newName) {
                await ctx.reply(e, '？群名被你吃了');
                return;
            }
            await ctx.setGroupName(e.group_id, newName);
            await ctx.reply(e, 'done');
        }

        // 改群头像功能
        if (text.startsWith('#改群头像')) {
            if (!await checkPermission(true)) return; // 需要管理员权限
            // 只在需要时获取图片URL
            const imgUrl = await ctx.getImageLink(e);
            if (!imgUrl) {
                await ctx.reply(e, '？图片被你吃了');
                return;
            }
            await napcat.set_group_portrait({
                group_id: e.group_id,
                file: imgUrl
            });
            await ctx.reply(e, 'done');
        }

        // 撤回功能
        if (text === '#撤回') {
            if (!await checkPermission(true)) return; // 需要管理员权限
            const quoteMsg = await ctx.getQuoteMessage(e);
            if (!quoteMsg) {
                await ctx.reply(e, '？消息被你吃了');
                return;
            }
            await ctx.delete_msg(quoteMsg.message_id);
            await ctx.delete_msg(e.message_id);
            await ctx.reply(e, 'done');
        }

        // 全员禁言功能
        if (text === '#开全员禁言') {
            if (!await checkPermission(true)) return; // 需要管理员权限
            await napcat.set_group_whole_ban({
                group_id: e.group_id,
                enable: true
            });
            await ctx.reply(e, 'done');
        }

        if (text === '#关全员禁言') {
            if (!await checkPermission(true)) return; // 需要管理员权限
            await napcat.set_group_whole_ban({
                group_id: e.group_id,
                enable: false
            });
            await ctx.reply(e, 'done');
        }

        // 发送群公告功能
        if (text === '#发公告') {
            if (!await checkPermission(true)) return; // 需要管理员权限
            const quoteMsg = await ctx.getQuoteMessage(e);
            if (!quoteMsg) {
                await ctx.reply(e, '？公告内容被你吃了');
                return;
            }
            const content = ctx.getText(quoteMsg);
            await napcat._send_group_notice({
                group_id: e.group_id,
                content: content
            });
            await ctx.reply(e, 'done');
        }

        // 获取引用消息中的图片
        if (text === '#取图片') {
            // 只在需要时获取图片URL
            const imgUrl = await ctx.getImageLink(e);
            if (!imgUrl) {
                await ctx.reply(e, '？图片被你吃了');
                return;
            }
            await ctx.reply(e, [Structs.image(imgUrl), Structs.text(imgUrl)]);
        }
      
    },
  },
};

export default plugin;