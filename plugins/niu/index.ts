import axios from "axios";
import { type Plugin, Structs, events, logger,napcat, masters } from "../../core/index.js";
import fs from 'fs'
import path from 'path'

const enableGroups: number[] = []; // 启用的群号
// 是否开启浏览器渲染
const isRendered = false

interface ImpartItem {
  length: number
  injectedValue: number
  injectedCount: number
  ejaculatedValue: number
  ejaculateCount: number
  lastEjaculateAt: number
  masturbateCount: number
  charm: number // 新增的魅力值字段
}

const defaultItem: ImpartItem = {
  length: 6,
  injectedValue: 0,
  injectedCount: 0,
  ejaculatedValue: 0,
  ejaculateCount: 0,
  lastEjaculateAt: 0,
  masturbateCount: 0,
  charm: 0 // 初始化魅力值为0
}

const INTERVAL = 1 * 60 * 60 * 1000 // 1 hours

// 自定义状态管理替代 valtio
class SimpleStore<T> {
  private state: T;
  private listeners: Array<(state: T) => void> = [];
  private filePath: string;

  constructor(initialState: T, filePath: string) {
    this.state = initialState;
    this.filePath = filePath;
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        this.state = { ...this.state, ...data };
      }
    } catch (err) {
      logger.error(`Failed to load db file: ${JSON.stringify(err)}`);
    }
  }

  public getState(): T {
    return this.state;
  }

  public setState(updater: (state: T) => T) {
    this.state = updater(this.state);
    this.persist();
    this.notifyListeners();
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.state));
    } catch (err) {
      logger.error(`Failed to save db file: ${JSON.stringify(err)}`);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  public subscribe(listener: (state: T) => void) {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public update(updater: (state: T) => T) {
    this.setState(updater);
  }
}
const name = 'niu'

const plugin: Plugin = {
  name: name,
  version: '1.5.0',
  description: '赛博银趴插件，尽情释放你的 DNA 🧬',
  
  handlers: {
    message: async (e) => {
      // 检查是否是群消息
      if (e.message_type !== 'group') return
      if (!enableGroups.includes(e.group_id)) return
      
      // 提取消息中的纯文本内容
      const text = e.message
        .filter(msg => msg.type === 'text')
        .map(element => element.data.text)
        .join('')
        .trim();
      if (!text) return

      // 初始化数据库
      const dbFilePath = path.join(process.cwd(), "plugins", name, 'cyber-yinpa-db.json')
      
      // 初始化数据
      let initialData: [number, ImpartItem][] = []
      try {
        if (fs.existsSync(dbFilePath)) {
          initialData = JSON.parse(fs.readFileSync(dbFilePath, 'utf-8'))
        }
      } catch (err) {
        logger.error(`Failed to load db file:${JSON.stringify(err)}`)
      }
      
      // 使用自定义状态管理替代 valtio
      const db = new SimpleStore({ data: initialData }, dbFilePath);
      
      // 模拟原来的 update 方法
      const updateDb = (updater: (data: [number, ImpartItem][]) => [number, ImpartItem][]) => {
        db.update(state => ({
          ...state,
          data: updater(state.data)
        }));
      }

      function isInInterval(last: number): boolean {
        return Date.now() - last < INTERVAL
      }

      function nextTime(last: number): string {
        if (!last || !isInInterval(last)) return '现在，透 TM 的！！！'
        const res = (last + INTERVAL - Date.now()) / 1000 / 60
        const min = Math.floor(res)
        const sec = Math.floor((res - min) * 60)
        return min ? `${min} 分 ${sec} 秒后` : `${sec} 秒后`
      }

      const dbState = db.getState();
      const senderItem = dbState.data.find(([key]) => key === e.sender.user_id)?.[1] || { ...defaultItem };
      const atSender = Structs.at(e.sender.user_id)
      
      // 获取QQ头像链接的函数
      const getQQAvatarLink = (userId: number, size: number = 640) => {
        return `http://q1.qlogo.cn/g?b=qq&nk=${userId}&s=${size}`
      }
      
      const senderAvatar = Structs.image(getQQAvatarLink(e.sender.user_id, 160))
      const members: number[] = []

      // 简化版的牛牛详情展示
      async function getNiuNiuDetailByItem(item: ImpartItem, id = e.sender.user_id, nickname = e.sender.nickname?? '某不知名群友') {
        const remainingTime = nextTime(item.lastEjaculateAt)
        const sorted = dbState.data.slice().sort((a, b) => b[1].length - a[1].length).filter(([, { length }]) => length > 6)
        let idx = sorted.findIndex(([key]) => key === id)
        idx = idx === -1 ? sorted.length - 1 : idx

        // isRendered
        if(isRendered) {
          const userInfo = {
            userId: id,
            nickname: nickname,
            rank:  idx + 1,
            percent: sorted.length > 1 ? (((sorted.length - idx - 1) / (sorted.length - 1)) * 100).toFixed(2) : "0",
            cooldownTime: remainingTime,
            length: item.length,
            injectedCount: item.injectedCount,
            ejaculateCount: item.ejaculateCount,
            charm: item.charm || 0,
            injectedValue: item.injectedValue,
            ejaculatedValue: item.ejaculatedValue
          };
          const payload = {
            filename: '/niu-info.vue',
            width: 1000,     // 截图宽度
            height: 450,     // 截图高度
            scale: 3,        // 缩放比例
            type: "png",     // 图片格式 (png/jpeg)
            fullPage: true,   // 是否完整页面截图
            props: {
              userInfo
            }
          }
          const response = await axios.post('http://127.0.0.1:65003/api/screenshot', payload, {
            responseType: 'arraybuffer'
          })
          return [Structs.image(Buffer.from(await response.data))]

        }
        
        // 返回简化文本信息
        const str = `〓 牛牛信息 〓\n` +
               `QQ: ${id}\n` +
               `昵称: ${nickname}\n` +
               `长度: ${item.length} 厘米\n` +
               `排名: ${idx + 1}/${sorted.length}\n` +
               `释放次数: ${item.ejaculateCount}\n` +
               `被透次数: ${item.injectedCount}\n` +
               `魅力值: ${item.charm || 0}\n` +  // 显示魅力值
               `下次可操作时间: ${remainingTime}`
        return [Structs.text(str)]
      }
      // 获取牛牛排行榜
      async function getNiuNiuRanking(isCurrentGroup: boolean, dbState: any) {
        if(!('group_id' in e)) return [Structs.text('无法获取群信息')]

        if (isRendered) { 
          /**
           *   niuRankList: {
              userId: number
              nickname: string
              item: {
                length: number
                injectedCount: number //注入次数
                ejaculateCount: number //释放次数
                charm: number //魅力
              }
              rank: number // 排行
              percent: number // 占比
            }[]
          */
          const filtered = dbState.data
            .filter(([id, item]: [number, ImpartItem]) => {
              const matchGroup = isCurrentGroup ? members.includes(id) : true
              return item.length > 6 && matchGroup
            })
            .map(([id, item]: [number, ImpartItem]) => ({ id, item }))
            .sort((a: { item: ImpartItem }, b: { item: ImpartItem }) => b.item.length - a.item.length)
              
          const totalCount = filtered.length
          const top20 = filtered.slice(0, 20)
        
          const niuRankList = []
          for(let index = 0; index < top20.length; index++) {
            const entry = top20[index]
            const memberInfo = await napcat.get_group_member_info({ group_id: e.group_id, user_id: entry.id }).catch(() => null)
            niuRankList.push({
              userId: entry.id,
              nickname: memberInfo?.card || memberInfo?.nickname || '某不知名牛子王',
              item: {
                length: entry.item.length,
                injectedCount: entry.item.injectedCount,
                ejaculateCount: entry.item.ejaculateCount,
                charm: entry.item.charm || 0
              },
              rank: index + 1,
              percent: totalCount > 0 ? parseFloat(((totalCount - index - 1) / (totalCount - 1) * 100).toFixed(2)) : 0
            })
          }
          const payload = {
            filename: '/niu-rank.vue',
            width: 1000,     // 截图宽度
            height: 1200,     // 截图高度
            scale: 3,        // 缩放比例
            type: "png",     // 图片格式 (png/jpeg)
            fullPage: true,   // 是否完整页面截图
            props: {
              niuRankList
            }
          }
          const response = await axios.post('http://127.0.0.1:65003/api/screenshot', payload, {
            responseType: 'arraybuffer'
          })

          return [Structs.image(Buffer.from(await response.data))]
        }
        const top = dbState.data
          .filter(([id, item]: [number, ImpartItem]) => {
            const matchGroup = isCurrentGroup ? members.includes(id) : true
            return item.length > 6 && matchGroup
          })
          .map(([id, item]: [number, ImpartItem]) => ({ id, item }))
          .sort((a: { item: ImpartItem }, b: { item: ImpartItem }) => b.item.length - a.item.length) // 按长度降序排序
          .slice(0, 20)

        // 生成排行榜文本
        let rankText = '〓 牛牛排行榜 〓\n'
        top.forEach((entry: { id: number, item: ImpartItem }, index: number) => {
          rankText += `${index + 1}. ${entry.id} - ${entry.item.length}厘米\n`
        })
        
        if (top.length === 0) {
          rankText += '暂无数据'
        }

        return [Structs.text(rankText)]
      }

      // 获取RBQ排行榜
      function getRbqRanking(isCurrentGroup: boolean, dbState: any) {
        const top = dbState.data
          .filter(([id, item]: [number, ImpartItem]) => {
            const matchGroup = isCurrentGroup ? members.includes(id) : true
            return item.injectedCount > 0 && matchGroup
          })
          .map(([id, item]: [number, ImpartItem]) => ({ id, item }))
          .sort((a: { item: ImpartItem }, b: { item: ImpartItem }) => b.item.injectedCount - a.item.injectedCount) // 按注入次数降序排序

        // 生成排行榜文本
        let rankText = '〓 RBQ排行榜 〓\n'
        top.slice(0, 10).forEach((entry: { id: number, item: ImpartItem }, index: number) => {
          rankText += `${index + 1}. ${entry.id} - 被注入${entry.item.injectedCount}次\n`
        })
        
        if (top.length === 0) {
          rankText += '暂无数据'
        }

        return rankText
      }

      if (['赛博银趴'].includes(text)) {
        return events.reply(e,
          '〓 欢迎来到赛博银趴 〓\n\n食用方法:\n\n1. 打搅/打胶: 释放你的 DNA 🧬\n2. 我的牛牛: 查看你的牛牛状态\n3. 透/草 @某人: 给某人注入 DNA 🧬\n4. 透群友: 随机糟蹋一个群友\n5. 他的牛牛/金针菇 @某人: 查看他人牛牛\n6. 群牛牛榜/牛牛榜: 查看牛牛排行榜\n\n注意: 每次释放后需要冷却 1 小时才能再次释放。',
          true,
        )
      }

      if (/^打[胶搅叫脚角]$/.test(text)) {
        if (isInInterval(senderItem.lastEjaculateAt)) {
          return events.reply(e,
            `你已经榨不出任何东西啦，等会再来吧。杂鱼～ 杂鱼～（冷却至 ${nextTime(senderItem.lastEjaculateAt)}）`,
            true,
          )
        }

        const value = Math.floor(Math.random() * 100) + 1
        const randomGrow = Math.floor(Math.random() * 100 + 10) / 1000

        updateDb((data) => {
          const index = data.findIndex(([key]) => key === e.sender.user_id)
          if (index === -1) {
            const newItem = { 
              ...defaultItem,
              lastEjaculateAt: Date.now() // 新用户第一次操作后也需要设置冷却时间
            }
            data.push([e.sender.user_id, newItem])
          } else {
            data[index][1].ejaculateCount++
            data[index][1].ejaculatedValue += value
            data[index][1].masturbateCount++
            data[index][1].lastEjaculateAt = Date.now()
            data[index][1].length = Math.round((randomGrow + data[index][1].length) * 1000) / 1000
          }
          return [...data];
        })

        const updatedDbState = db.getState();
        const sender = updatedDbState.data.find(([key]) => key === e.sender.user_id)!

        return events.reply(e,
          `打胶结束，真舒服! 你释放了 ${value} 毫升 DNA 🧬！牛牛变长了 ${randomGrow} 厘米！目前长度 ${sender[1].length} 厘米。`,
          true,
        )
      }

      if (/^[我俺]的((牛子)|(牛牛)|(鸡鸡))$/.test(text)) {
        return events.reply(e, await getNiuNiuDetailByItem(senderItem))
      }

      if (/^(本?群)?小?((牛牛)|(牛子))(排行)?榜$/.test(text)) {
        const isCurrentGroup = text.includes('群')
        // 群成员信息需要通过API获取
        
        const dbState = db.getState();
        const rankText = await getNiuNiuRanking(isCurrentGroup, dbState)
        return events.reply(e, rankText)
      }

      if (/^(本?群)?小?((rbq)|([男南楠蓝][娘梁凉]))(排行)?榜$/i.test(text)) {
        const isCurrentGroup = text.includes('群')
        const dbState = db.getState();
        const rankText = getRbqRanking(isCurrentGroup, dbState)
        return events.reply(e, rankText)
      }

      if (/^[透草超焯]群友$/.test(text)) {
        if (isInInterval(senderItem.lastEjaculateAt)) {
          return events.reply(e,
            [atSender, ` 你已经榨不出任何东西啦，杂鱼～杂鱼～（冷却至 ${nextTime(senderItem.lastEjaculateAt)})`],
            true,
          )
        }
        
        // 获取群成员需要API调用，这里简化处理
        const info = await napcat.get_group_member_list({group_id: e.group_id});
        const groupMembers = info.map(member => member.user_id);
        const randomGroupUserId = groupMembers[Math.floor(Math.random() * groupMembers.length)]
        const nickname = '某不知名群友'
        const atTarget = Structs.at(randomGroupUserId)
        const targetAvatar = Structs.image(getQQAvatarLink(randomGroupUserId, 160))

        const isMi = masters.includes(randomGroupUserId)
        const isSelf = randomGroupUserId === e.sender.user_id
        const isSuccess = isMi || isSelf ? true : Math.random() < 0.8

        if (!isSuccess) {
          return events.reply(e,
            [
              senderAvatar,
              '可惜可惜 ，',
              atSender,
              ' 技不如人，一不小心被 ',
              atTarget,
              ' 反透了！ 呜呜呜... 牛牛没有发生任何变化...',
            ],
            true,
          )
        }

        const length = Math.floor(Math.random() * 100 + 1) / 1000
        const value = Math.floor(Math.random() * 100) + 1
        // 判断是否增加魅力值
        const shouldIncreaseCharm = value > 50 && length > 0.05;



        updateDb((data) => {
          const newData = [...data];
          
          const index = newData.findIndex(([key]) => key === randomGroupUserId)

          if (index === -1) {
            newData.push([randomGroupUserId, { 
              ...defaultItem,
              injectedCount: 1,
              injectedValue: value
            }])
          } else {
            newData[index][1].injectedCount++
            newData[index][1].injectedValue += value
            // 如果满足条件则魅力值加1
            if (shouldIncreaseCharm) {
              newData[index][1].charm = (newData[index][1].charm || 0) + 1;
            }
          }

          const senderIndex = newData.findIndex(([key]) => key === e.sender.user_id)

          if (senderIndex === -1) {
            const newItem = {
              ...defaultItem,
              length: Math.round((length + defaultItem.length) * 1000) / 1000,
              ejaculateCount: 1,
              ejaculatedValue: value,
              lastEjaculateAt: Date.now()
            }
            newData.push([e.sender.user_id, newItem])
          } else {
            newData[senderIndex][1].length = Math.round((length + newData[senderIndex][1].length) * 1000) / 1000
            newData[senderIndex][1].ejaculateCount++
            newData[senderIndex][1].ejaculatedValue += value
            newData[senderIndex][1].lastEjaculateAt = Date.now()
          }
          
          return newData;
        })

        const updatedDbState = db.getState();
        const sender = updatedDbState.data.find(([key]) => key === e.sender.user_id)!

        return events.reply(e,
          [
            targetAvatar,
            '好耶！ ',
            atSender,
            ' 提起长枪，一口气给 ',
            atTarget,
            ' 注入了 ',
            String(value),
            ` 毫升 DNA 🧬！牛牛变长了 ${length} 厘米，目前长度 ${sender[1].length} 厘米！`,
          ],
          true,
        )
      }

      // 以下需要 @ 或者回复某人
      // 解析被@的用户ID
      let id: number | null = null
      if (e.message.some(msg => msg.type === 'at')) {
        const atElement = e.message.find(msg => msg.type === 'at')
        if (atElement && 'qq' in atElement.data) {
          id = Number(atElement.data.qq)
        }
      }
      if (!id) return

      const nickname = '某不知名牛子王'
      const atTarget = Structs.at(id)
      const targetAvatar = Structs.image(getQQAvatarLink(id, 160))
      const targetItem = dbState.data.find(([key]) => key === id)?.[1] || { ...defaultItem };

      if (/^[他她它]的小?((牛子)|(牛牛)|(金针菇)|(鸡鸡))$/.test(text)) {
        // getUserProfile 需要API调用，这里简化处理
        return events.reply(e, await getNiuNiuDetailByItem(targetItem, id, nickname))
      }

      
      if (/^[透草超焯]$/.test(text)) {
        
        if (isInInterval(senderItem.lastEjaculateAt)) {
          return events.reply(e,
            [atSender, ` 你已经榨不出任何东西啦，杂鱼～杂鱼～（冷却至 ${nextTime(senderItem.lastEjaculateAt)})`],
            true,
          )
        }

        const isMi = masters.includes(id)
        const isSelf = id === e.sender.user_id
        const isSuccess = isMi || isSelf ? true : Math.random() < 0.8
        logger.info(`${e.sender.user_id} 透 ${id}成功了吗：${isSuccess}`)
        logger.info(`${isMi} || ${isSelf}`)
        if (!isSuccess) {
          return events.reply(e,
            [
              senderAvatar,
              '可惜可惜 ，',
              atSender,
              ' 技不如人，一不小心被 ',
              atTarget,
              ' 反透了！ 呜呜呜... 牛牛没有发生任何变化... 再试试！',
            ],
            true,
          )
        }

        const length = Math.floor(Math.random() * 100 + 1) / 1000
        const value = Math.floor(Math.random() * 100) + 1

        // 判断是否增加魅力值
        const shouldIncreaseCharm = value > 50 && length > 0.05;



        updateDb((data) => {
          const newData = [...data];
          
          const index = newData.findIndex(([key]) => key === id)

          if (index === -1) {
            newData.push([id, { 
              ...defaultItem,
              injectedCount: 1,
              injectedValue: value
            }])
          } else {
            newData[index][1].injectedCount++
            newData[index][1].injectedValue += value
            // 如果满足条件则魅力值加1
            if (shouldIncreaseCharm) {
              newData[index][1].charm = (newData[index][1].charm || 0) + 1;
            }
          }

          const senderIndex = newData.findIndex(([key]) => key === e.sender.user_id)

          if (senderIndex === -1) {
            const newItem = {
              ...defaultItem,
              length: Math.round((length + defaultItem.length) * 1000) / 1000,
              ejaculateCount: 1,
              ejaculatedValue: value,
              lastEjaculateAt: Date.now()
            }
            newData.push([e.sender.user_id, newItem])
          } else {
            newData[senderIndex][1].length = Math.round((length + newData[senderIndex][1].length) * 1000) / 1000
            newData[senderIndex][1].ejaculateCount++
            newData[senderIndex][1].ejaculatedValue += value
            newData[senderIndex][1].lastEjaculateAt = Date.now()
          }
          
          return newData;
        })

        const updatedDbState = db.getState();
        const sender = updatedDbState.data.find(([key]) => key === e.sender.user_id)!

        return events.reply(e,
          [
            targetAvatar,
            '好耶！ ',
            atSender,
            ' 提起长枪，一口气给 ',
            atTarget,
            ' 注入了 ',
            String(value),
            ` 毫升 DNA 🧬！牛牛变长了 ${length} 厘米，目前长度 ${sender[1].length} 厘米！`,
          ],
          true,
        )
      }
    }
  }
};

export default plugin