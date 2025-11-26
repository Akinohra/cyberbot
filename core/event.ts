import { AllHandlers, NCWebsocket, SendMessageSegment, Structs, NodeSegment } from 'node-napcat-ts'
import logger from './logger.js'
import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto';
import { string2argv as _string2argv } from 'string2argv';
import _mri from 'mri';

// 事件封装类
class CyberBote {
    private napcat: NCWebsocket

    constructor(napcat: NCWebsocket) {
        this.napcat = napcat
    }

    // @onebot11 — 发送私聊消息
    /**
     * 回复消息的函数
     * @param e 消息上下文，包含消息类型、群组ID或用户ID等信息
     * @param message 要发送的消息内容，可以是字符串、消息段数组，或字符串与消息段的混合数组
     * @returns 返回包含消息ID的Promise对象
     */
    async reply(
        e: AllHandlers['message'],
        message: (SendMessageSegment | string)[] | string,
        quote: boolean = false,
    ): Promise<{ message_id: number }> {
        try {
            // 将字符串或混合数组统一转换为标准的消息段数组
            const messageContent = typeof message === 'string'
                ? [Structs.text(message)]
                : message.map(seg => typeof seg === 'string' ? Structs.text(seg) : seg);

            const messageSegments = quote
                ? [Structs.reply(e.message_id), ...messageContent]
                : messageContent;
            // 记录日志，显示正在回复的消息类型和目标ID
            // logger.info(`Replying to ${e.message_type} ${e.message_type === 'group' ? `${e.group_id}` : `${e.user_id}`}`);
            // 如果是群消息且有群ID，则发送群消息
            if (e.message_type === 'group' && e.group_id) {
                const result = await this.napcat.send_group_msg({
                    group_id: e.group_id,
                    message: messageSegments,
                });
                // 发送成功后记录日志
                logger.info(`[*]群(回复)(${e.group_id}) ${e.sender?.nickname ? `${e.sender.nickname}(${e.sender.user_id})` : ''}: ${typeof message === 'string' ? message : message.map(seg => typeof seg === 'string' ? seg : JSON.stringify(seg)).join(' ')}`);
                return result;
            }
            // 如果是私聊消息且有用户ID，则发送私聊消息
            if (e.message_type === 'private' && e.user_id) {
                const result = await this.napcat.send_private_msg({
                    user_id: e.user_id,
                    message: messageSegments,
                });
                // 发送成功后记录日志
                logger.info(`[*]私(回复)(${e.user_id}) ${e.sender?.nickname ? `${e.sender.nickname}` : ''}: ${typeof message === 'string' ? message : message.map(seg => typeof seg === 'string' ? seg : JSON.stringify(seg)).join(' ')}`);
                return result;
            }
            // 不支持的类型或缺少关键字段时记录警告信息
            const errorMsg = `Unsupported message e: type=${e.message_type}, group_id=${'group_id' in e ? e.group_id : 'undefined'}, user_id=${'user_id' in e ? e.user_id : 'undefined'}`;
            logger.warn(errorMsg);
            return { message_id: 0 };
        } catch (error) {
            logger.error(
            `发送消息失败: ${error instanceof Error ? JSON.stringify(error.message) : JSON.stringify(error)}`);
            return { message_id: 0 };
        }
    }
    /**
     * 检查指定QQ号是否为机器人的主人
     * @param qq 需要检查的QQ号
     * @returns Promise<boolean> 返回一个Promise，resolve时返回布尔值表示是否为机器人的主人
     */
    async isMaster(qq: number): Promise<boolean> {
        try {
            // logger.info(`Checking master status for QQ ${qq}`);
            // 读取cyberbot.json配置文件
            const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8');
            // 解析配置文件内容
            const parsedConfig = JSON.parse(config);
            // 检查配置中的master数组是否包含当前QQ号
            return Array.isArray(parsedConfig.master) && parsedConfig.master.includes(qq);
        } catch (error) {
            // logger.error(`Error checking master status for QQ ${qq}:${error}`);
            return false;
        }
    }
    /**
     * 检查指定QQ号是否为机器人的管理员
     * @param qq 需要检查的QQ号
     * @returns Promise<boolean> 返回一个Promise，resolve时返回布尔值表示是否为机器人的管理员
     */
    async isAdmin(qq: number): Promise<boolean> {
        try {
            // logger.info(`Checking admin status for QQ ${qq}`);
            // 读取cyberbot.json配置文件
            const config = await fs.promises.readFile(path.join(process.cwd(), 'cyberbot.json'), 'utf8')
            // 解析配置文件内容并检查admins数组是否包含当前QQ号
            return JSON.parse(config).admins.includes(qq)
        } catch (error) {
            // logger.error(`Error checking admin status for QQ ${qq}: ${error}`)
            return false
        }
    }
    /**
     * 检查指定QQ号是否具有权限（是机器人的主人或机器人的管理员）
     * @param qq 需要检查的QQ号
     * @returns Promise<boolean> 返回一个Promise，resolve时返回布尔值表示是否具有权限
     */
    async hasRight(qq: number): Promise<boolean> {
        try {
            // logger.info(`Checking rights for QQ ${qq}`);
            // 检查QQ号是否为机器人的主人或者机器人的管理员
            return await this.isMaster(qq) || await this.isAdmin(qq);
        } catch (error) {
            // logger.error(`Error checking rights for QQ ${qq}: ${error}`);
            return false;
        }
    }
    // @onebot11 — 发送私聊消息
    /**
     * 发送私聊消息给指定用户
     * @param user_id 目标用户的QQ号
     * @param message 要发送的消息内容，可以是字符串、消息段数组，或字符串与消息段的混合数组
     * @returns 返回包含消息ID的Promise对象，如果发送失败则返回{ message_id: 0 }
     */
    async sendPrivateMessage(user_id: number, message: string | (string | SendMessageSegment)[]): Promise<{message_id: number;}> {
        try {
            logger.info(`Sending private message to ${user_id}`);
            // 统一处理消息：将字符串或混合数组转为标准的消息段数组
            const msgArray: SendMessageSegment[] =
                typeof message === 'string'
                    ? [Structs.text(message)]
                    : message.map(seg => 
                        typeof seg === 'string' 
                            ? Structs.text(seg) 
                            : seg
                    );
            // 调用napcat API发送私聊消息
            const result = await this.napcat.send_private_msg({
                user_id: user_id,
                message: msgArray
            });
            // 发送成功后记录日志
            logger.info(`[*]私(发送)(${user_id}): ${typeof message === 'string' ? message : message.map(seg => typeof seg === 'string' ? seg : JSON.stringify(seg)).join(' ')}`);
            return result;
        }
        catch (error) {
            logger.error(`Failed to send message: ${error}`);
            return { message_id: 0 };
        }
    }
    // @onebot11 — 发送群聊信息
    /**
     * 发送群聊消息到指定群组
     * @param group_id 目标群组的ID
     * @param message 要发送的消息内容，可以是字符串、消息段数组，或字符串与消息段的混合数组
     * @returns 返回包含消息ID的Promise对象，如果发送失败则返回{ message_id: 0 }
     */
    async sendGroupMessage(group_id: number, message: string | (string | SendMessageSegment)[]): Promise<{message_id: number;}> {
        try {
            logger.info(`Sending group message to ${group_id}`);
            // 统一处理消息：将字符串或混合数组转为标准的消息段数组
            const msgArray: SendMessageSegment[] =
                typeof message === 'string'
                    ? [Structs.text(message)]
                    : message.map(seg =>
                        typeof seg === 'string'
                            ? Structs.text(seg)
                            : seg
                    );
            // 调用napcat API发送群聊消息
            const result = await this.napcat.send_group_msg({
                group_id: group_id,
                message: msgArray
            });
            // 发送成功后记录日志
            logger.info(`[*]群(发送)(${group_id}): ${typeof message === 'string' ? message : message.map(seg => typeof seg === 'string' ? seg : JSON.stringify(seg)).join(' ')}`);
            return result;
        }catch (error) {
            logger.error(`Failed to send message: ${error}`);
            return { message_id: 0 };
        }
    }
    async delete_msg(message_id: number): Promise<boolean> {
        try {                
            logger.info(`Deleting message ${message_id}`);
            await this.napcat.delete_msg({ message_id: message_id });
            return true;
        } catch (error) {
            logger.error(`Failed to delete message ${message_id}: ${error}`);
            return false;
        }
    }
    // @onebot11 — 群组踢人
    /**
     * 从群组中踢出指定用户
     * @param group_id 目标群组的ID
     * @param user_id 要踢出的用户的ID
     * @param reject_add_request 是否拒绝该用户重新加入群组的申请，默认为false
     * @returns Promise<boolean> 踢人操作成功返回true，失败返回false
     */
    async kick(group_id: number, user_id: number, reject_add_request = false): Promise<boolean> {
        try {
            logger.info(`Kicking user ${user_id} from group ${group_id}`);
            // 调用napcat API执行踢人操作
            await this.napcat.set_group_kick({
                group_id: group_id,
                user_id: user_id,
                reject_add_request: reject_add_request
            });
            return true;
        } catch (error) {
            logger.error(`Failed to kick user ${user_id} from group ${group_id}: ${error}`);
            return false;
        }
    }
    // @onebot11 — 群组禁言
    /**
     * 在群组中禁言指定用户
     * @param group_id 群组ID
     * @param user_id 用户ID
     * @param duration 禁言时长（秒）
     * @returns 操作是否成功
     */
    async ban(group_id: number, user_id: number, duration: number): Promise<boolean> {
        try {
            logger.info(`Banning user ${user_id} in group ${group_id} for ${duration} seconds`);
            // 调用napcat API执行禁言操作
            await this.napcat.set_group_ban({
                group_id: group_id,
                user_id: user_id,
                duration: duration
            });
            return true;
        } catch (error) {
            logger.error(`Failed to ban user ${user_id} in group ${group_id}: ${error}`);
            return false;
        }
    }
    // @onebot11 — 群组全员禁言
    /**
     * 设置群组全员禁言状态
     * @param group_id 群组ID
     * @param enable 是否启用全员禁言，true为开启，false为关闭
     * @returns 操作是否成功
     */
    async banAll(group_id: number, enable: boolean): Promise<boolean> {
        try {
            logger.info(`${enable ? 'Enabling' : 'Disabling'} whole group ban for group ${group_id}`);
            // 调用napcat API设置群组全员禁言状态
            await this.napcat.set_group_whole_ban({
                group_id: group_id,
                enable: enable
            });
            return true;
        } catch (error) {
            logger.error(`Failed to ${enable ? 'enable' : 'disable'} whole group ban for group ${group_id}: ${error}`);
            return false;
        }
    }
    // @onebot11 — 设置群名
    /**
     * 修改群组名称
     * @param group_id 群组ID
     * @param group_name 新的群组名称
     * @returns 操作是否成功
     */
    async setGroupName(group_id: number, group_name: string): Promise<boolean> {
        try {
            logger.info(`Setting group name for group ${group_id} to "${group_name}"`);
            // 调用napcat API设置群组名称
            await this.napcat.set_group_name({
                group_id: group_id,
                group_name: group_name
            });
            return true;
        } catch (error) {
            logger.error(`Failed to set group name for group ${group_id} to "${group_name}": ${error}`);
            return false;
        }
    }
    // @onebot11 — 群组设置管理员
    /**
     * 设置群组管理员
     * @param group_id 群组ID
     * @param user_id 用户ID
     * @param enable 是否设置为管理员，true为设置，false为取消
     * @returns 操作是否成功
     */
    async setAdmin(group_id: number, user_id: number, enable: boolean): Promise<boolean> {
        try {
            logger.info(`${enable ? 'Setting' : 'Unsetting'} admin for user ${user_id} in group ${group_id}`);
            // 调用napcat API设置群组管理员
            await this.napcat.set_group_admin({
                group_id: group_id,
                user_id: user_id,
                enable: enable
            });
            return true;
        } catch (error) {
            logger.error(`Failed to ${enable ? 'set' : 'unset'} admin for user ${user_id} in group ${group_id}: ${error}`);
            return false;
        }
    }
    // @onebot11 — 设置群聊特殊头衔
    /**
     * 设置群聊中用户的特殊头衔
     * @param group_id 群组ID
     * @param user_id 用户ID
     * @param title 特殊头衔名称
     * @returns 操作是否成功
     */
    async setTitle(group_id: number, user_id: number, title: string): Promise<boolean> {
        try {
            logger.info(`Setting title for user ${user_id} in group ${group_id} to "${title}"`);
            // 调用napcat API设置群组特殊头衔
            await this.napcat.set_group_special_title({
                group_id: group_id,
                user_id: user_id,
                special_title: title
            });
            return true;
        } catch (error) {
            logger.error(`Failed to set special title for user ${user_id} in group ${group_id} to "${title}": ${error}`);
            return false;
        }
    }
    // @onebot11 — 设置群组添加请求
    /**
     * 处理群组添加请求（同意或拒绝用户入群申请）
     * @param flag 请求标识符，用于标识特定的入群请求
     * @param approve 是否同意请求，true为同意，false为拒绝
     * @param reason 拒绝理由（可选），当拒绝请求时可提供拒绝原因
     * @returns 操作是否成功
     */
    async aprroveGroupJoinRequest(flag: string, approve: boolean, reason?: string): Promise<boolean> {
        try {
            logger.info(`${approve ? 'Approving' : 'Rejecting'} group join request ${flag}`);
            // 调用napcat API处理群组添加请求
            await this.napcat.set_group_add_request({
                flag: flag,
                approve: approve,
                reason: reason
            });
            return true;
        } catch (error) {
            logger.error(`Failed to ${approve ? 'approve' : 'reject'} group join request ${flag}: ${error}`);
            return false;
        }
    }

    /**
     * 拒绝群组添加请求
     * @param flag 请求标识符，用于标识特定的入群请求
     * @param reason 拒绝理由（可选），提供拒绝原因
     * @returns 操作是否成功
     */
    async rejectGroupJoinRequest(flag: string, reason?: string): Promise<boolean> {
        try {
            logger.info(`Rejecting group join request ${flag}`);
            // 调用aprroveGroupJoinRequest方法，传入false表示拒绝请求
            return await this.aprroveGroupJoinRequest(flag, false, reason);
        } catch (error) {
            logger.error(`Failed to reject group join request ${flag}: ${error}`);
            return false;
        }
    }
    /**
     * 检查用户在群组中是否为管理员
     * @param group_id 群组ID
     * @param user_id 用户ID
     * @returns 如果用户是管理员或群主则返回true，否则返回false
     */
    async isGroupAdmin(group_id: number, user_id: number): Promise<boolean> {
        try {
            // logger.info(`Checking if user ${user_id} is admin in group ${group_id}`);
            // @onebot11 — 获取群成员信息
            // 调用napcat API获取群成员信息
            const info = await this.napcat.get_group_member_info({ group_id, user_id });
            // 判断用户角色是否为管理员('admin')或群主('owner')
            return ['admin', 'owner'].includes(info.role);
        } catch (error) {
            // logger.error(`Failed to check if user ${user_id} is admin in group ${group_id}: ${error}`);
            return false;
        }
    }
    /**
     * 检查用户在群组中是否为群主
     * @param group_id 群组ID
     * @param user_id 用户ID
     * @returns 如果用户是群主则返回true，否则返回false
     */
    async isGroupOwner(group_id: number, user_id: number): Promise<boolean> {
        try {
            logger.info(`Checking if user ${user_id} is owner in group ${group_id}`);
            // @onebot11 — 获取群成员信息
            // 调用napcat API获取群成员信息
            const info = await this.napcat.get_group_member_info({ group_id, user_id });
            // 判断用户角色是否为群主('owner')
            return info.role === 'owner';
        } catch (error) {
            logger.error(`Failed to check if user ${user_id} is owner in group ${group_id}: ${error}`);
            return false;
        }
    }
    /**
     * 生成输入字符串的MD5哈希值
     * @param input 需要生成哈希值的字符串
     * @returns 输入字符串的MD5哈希值（十六进制格式）
     */
    md5(input: string): string{
        logger.info(`Generating MD5 hash for input`);
        const hash = createHash('md5');
        hash.update(input);
        return hash.digest('hex');
    }
    /**
     * 生成指定范围内的随机整数（包含边界值）
     * @param min 最小值（下界）
     * @param max 最大值（上界）
     * @returns 在[min, max]范围内的随机整数
     */
    randomInt(min: number, max: number): number {
        // 转换并验证输入为有效有限数字，否则 fallback 为 0
        const isValidNumber = (n: number) => typeof n === 'number' && isFinite(n);
        min = isValidNumber(min) ? min : 0;
        max = isValidNumber(max) ? max : 0;
        // 确保 min <= max
        if (min > max) [min, max] = [max, min];
        logger.info(`Generating random integer between ${min} and ${max}`);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    /**
     * 从数组中随机选择一个元素
     * @param array 要从中选择元素的数组
     * @returns 数组中的随机元素，如果数组为空则返回 undefined
     */
    randomItem<T>(array: T[]): T | any{
        if (array.length === 0) {
            logger.warn('Attempting to get random item from an empty array');
            return '';
        }
        logger.info(`Getting random item from array`);
        const index = this.randomInt(0, array.length - 1);
        return array[index];
    }
    /**
     * 确保输入值为数组。
     * - 若为 `null` 或 `undefined`，返回空数组；
     * - 若已是数组，原样返回；
     * - 否则将其包装为单元素数组。
     *
     * @param input 任意类型的可选值
     * @returns 输入值的数组形式
     */
    ensureArray<T>(input: T | T[] | null | undefined): T[] {
        if (input == null) {
            return [];
        }
        return Array.isArray(input) ? input : [input];
    }
    /**
     * 将命令字符串解析为 argv 数组（支持引号、空格等）
     * @param text 用户输入的命令文本
     * @returns 类似 process.argv 的字符串数组（不含 node 和脚本路径）
     */
    string2argv(text: string): string[] {
        return _string2argv(text);
    }
    /**
     * 解析 argv 数组为带选项的对象
     * @param argv 参数数组，如 ['cmd', 'arg', '--flag', 'value']
     * @returns { _: string[], ...options }
     */
    mri(argv: string[]): { _: string[]; [key: string]: any } {
        return _mri(argv);
    }
    /**
     * 获取群头像链接
     * @param group_id 群组ID
     * @param size 头像尺寸，默认为40
     * @returns 群头像的URL链接
     */
    getGroupAvatarLink(group_id: number, size: number = 40): string {
        logger.info(`Getting group avatar link for group ${group_id}`);
        return `https://p.qlogo.cn/gh/${group_id}/${group_id}/${size}`;
    }
    /**
     * 获取QQ头像链接
     * @param qq QQ号码
     * @param size 头像尺寸, 可选： 0 | 40 | 100 | 160 | 640，0 为原图
     * @returns QQ头像的URL链接
     */
    getQQAvatarLink(qq: number, size: number = 160): string {
        logger.info(`Getting QQ avatar link for QQ ${qq}`);
        return `https://q2.qlogo.cn/headimg_dl?dst_uin=${qq}&spec=${size}`;
    }
    /**
     * 获取消息中提及到的图片URL（消息或被引用消息中的图片）
     * @param e 消息处理上下文，包含消息内容的数组
     * @returns Promise<string> 图片链接URL，如果没有找到图片或出错则返回空字符串
     */
    async getImageLink(e: AllHandlers['message']): Promise<string> { 
        if (!e || !e.message) return "";
                try {
                const reply: any = e.message.find((msg: any) => msg.type === 'reply');
                if (!reply) return "";
                const msg = await this.napcat.get_msg({ message_id: reply.data.id });

                for (const segment of msg.message) {
                    if (segment.type === 'image' && segment.data && segment.data.url) {
                    return segment.data.url;
                    }
                }
                } catch {
                for (const segment of e.message) {
                    if (segment.type === 'image' && segment.data && segment.data.url) {
                    return segment.data.url;
                    }
                }
                }
                return "";
    }
    /**
     * 获取URL的动态直链地址，主要用于处理需要rkey验证的图片资源链接
     * 近似于白嫖qq的永久图床
     * @param url 原始URL地址
     * @returns Promise<string>  替换rkey后的直链URL，失败时返回空字符串
     */
    async getDynamicDirectLink(url: string): Promise<string>{
        try {
            // @napcat — 获取 rkey
            const rKeyList = await this.napcat.nc_get_rkey();
            if (!rKeyList?.length) {
                logger.error('获取 rkey 失败，无法替换');
                return "";
            }
            // 提取 appid
            const appid = url.match(/appid=(\d+)/)?.[1];
            if (!appid) {
                logger.error('无法从URL中提取appid');
                return "";
            }
            // 映射 appid 到对应的 rkey 索引
            const rkeyIndexMap: Record<string, number> = { '1406': 0, '1407': 1 };
            const rkeyIndex = rkeyIndexMap[appid];
            if (rkeyIndex === undefined) {
                logger.error(`不支持的appid:${appid}`);
                return "";
            }
            const rkey = rKeyList[rkeyIndex]?.rkey;
            if (!rkey) {
                logger.error(`对应 appid=${appid} 的 rkey 不存在`);
                return "";
            }
            logger.info(`替换URL中的rkey`);
            logger.info(`原链接:${url}`);
            url = url.replace(/&rkey=[^&]*/g, '') + `${rkey}`;
            logger.info(`获取动态直链成功:${url}`);
            // 替换或插入 rkey（推荐使用更稳健的方式：先删后加）
            return url;
        }
        catch (error) {
            logger.error(`获取直链失败:${error}`);
            return "";
        }
    }
    /**
     * 获取图片的临时直链地址，会过期
     * @param e 消息处理上下文，包含消息内容的数组
     * @returns Promise<string>  替换rkey后的直链URL，失败时返回空字符串
     */
    async getTemporaryDirectLink(e: AllHandlers['message']): Promise<string>{
        try {
            const message_id = this.getReplyMessageId(e);
            if (!message_id) return ""; // 提前返回无效情况
            // @onebot11 — 获取信息
            const new_e = await this.napcat.get_msg({
                message_id: Number(message_id)
            });
            if (!Array.isArray(new_e.message)) return "";
            // logger.info(`Extracting image link from message`);
            const imageItem = new_e.message.find(item => item.type === "image");
            // logger.info(`Image item: ${imageItem?.data?.url.trim()}`);
            return imageItem?.data?.url.trim() || "";
        }
        catch (error) {
            logger.error(`提取被引用的文本时发生错误:${error}`);
            return "";
        }
    }
    /**
     * 从消息上下文中提取回复消息的ID
     * @param e 消息处理上下文，包含消息内容的数组
     * @returns 回复消息的ID，如果没有找到回复对象或出错则返回空字符串
     */
    getReplyMessageId(e: AllHandlers['message']): string {
        try {
            if (!Array.isArray(e.message)) return "";
            // logger.info(`Extracting reply message ID from message`);
            const replyObj = e.message.find(item => item.type === "reply");
            return replyObj?.data?.id.trim() || "";
        }
        catch (error) {
            logger.error(`提取消息ID时发生错误:${error}`);
            return "";
        }
    }
    /**
     * 获取被引用的消息详细
     * @param e 消息处理上下文，包含消息内容的数组
     * @returns 被引用的消息详细
     */
    async getQuoteMessage(e: AllHandlers['message']): Promise<any> {
        if (!e || !e.message) return null;
        try {
            const reply = e.message.find((msg: any) => msg.type === 'reply');
            if (!reply || !reply.data) return null;
            
            // 使用类型断言确保TypeScript知道reply.data有id属性
            const replyId = (reply.data as { id: string }).id;
            if (!replyId) return null;
            
            const msg = await this.napcat.get_msg({ message_id: Number(replyId) });
            return msg;
        } catch (error) {
            return null;
        }
    }
    /**
     * 从消息上下文中提取第一个被@的QQ号
     * @param e 消息处理上下文，包含消息内容的数组
     * @returns 被@的QQ号，如果没有找到或出错则返回空字符串
     */
    getMessageAt(e: AllHandlers['message']): number | null {
        try {
            if (!Array.isArray(e.message)) return null;
            
            // 查找第一个at类型的消息段
            const atItem = e.message.find(item => item.type === "at");
            if (!atItem || !atItem.data) return null;
            
            // 使用类型断言来避免TypeScript错误
            const qqStr = (atItem.data as { qq?: string }).qq;
            if (!qqStr) return null;
            
            // 转换为数字并返回
            const qq = Number(qqStr);
            return isNaN(qq) ? null : qq;
        } catch (error) {
            logger.error(`提取艾特的QQ号时发生错误:${error}`);
            return null;
        }
    }
    /**
     * 从消息上下文中提取纯文本内容
     * @param e 消息处理上下文，包含消息内容的数组
     * @returns 消息中的纯文本内容，如果没有找到文本或出错则返回空字符串
     */
    getText(e: AllHandlers['message']): string {
        try {
            if (!Array.isArray(e.message)) return "";
            // logger.info(`Extracting text from message`);
            const textObj = e.message.find(item => item.type === "text");
            return textObj?.data?.text.trim() || ""; // 返回文本内容或空字符串
        }
        catch (error) {
            logger.error(`提取纯文本内容时发生错误:${error}`);
            return "";
        }
    }
    /**
     * 获取被引用消息的原始文本内容
     * @param e 消息处理上下文，包含消息内容的数组
     * @returns Promise<string> 被引用消息的原始文本内容，如果没有找到或出错则返回空字符串
     */
    async getQuotedText(e: AllHandlers['message']): Promise<string> { 
        try {
            const message_id = this.getReplyMessageId(e);
            if (!message_id) return ""; // 提前返回无效情况
            logger.info(`Getting quoted text for message ${message_id}`);
            // @onebot11 — 获取信息
            const { raw_message } = await this.napcat.get_msg({
                message_id: Number(message_id)
            });
            return raw_message || ""; // 确保总是返回字符串
        }
        catch (error) {
            logger.error(`提取被引用的文本时发生错误:${error}`);
            return "";
        }
    }
    /**
     * 发送伪造的合并转发消息（伪消息）
     *
     * @param target_id - 目标 ID，群聊时为群号，私聊时为用户 QQ 号
     * @param message - 消息内容，由 NodeSegment 构成的数组
     * @param isGroup - 是否为群聊消息
     * @returns 返回包含 message_id 和 res_id 的 Promise 对象
     *
     * @example
     * const message = [
     *   {
     *     type: 'node',
     *     data: {
     *       content: [Structs.text('这是一条伪造的消息')]
     *     }
     *   }
     * ];
     * await fakeMessage(123456, message, true);
     */
    async fakeMessage(
        target_id: number,
        message: NodeSegment[],
        isGroup: boolean
    ): Promise<{message_id: number;res_id: string;}> {
        try {
            // 动态构建发送参数
            const params = isGroup
            ? { group_id: target_id, message } // 群聊：使用 group_id
            : { user_id: target_id, message }; // 私聊：使用 user_id
            logger.info(`Sending fake message to target ${target_id}`);
            // @napcat — 发送合并转发
            return await this.napcat.send_forward_msg(params);
        } catch (error) {
            logger.error(`Failed to send fake message to target ${target_id}: ${error}`);
            throw error;
        }
    }
}

export default CyberBote