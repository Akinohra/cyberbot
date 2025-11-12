import { type Plugin, events, napcat, Structs } from "../../core/index.js";
import axios from 'axios'
import list from './list.json' assert { type: 'json' };
const enableGroups:number[] = [123456789];// 启用的群号
const baseUrl = 'http://192.168.10.124:2233'

const plugin: Plugin = {
  name: 'meme',  // name必须与此插件文件夹命名一致, 不然可能会出问题
  version: '1.0.0',
  description: '',
  
  handlers: {
    message: async (context) => {
      //过滤未启用群
      if('group_id' in context && !enableGroups.includes(context.group_id)) return;
      // 过滤其他插件指令，以免冲突
      const text = events.getText(context)
      if (text === 'meme') {
        // 菜单列表
        const menuUrl = 'https://p.qpic.cn/gdynamic/9exXyUf4HDZI3o3OUB9nySxvu2DGqThT69nKoTuQagg/0'
        return events.reply(context, [Structs.image(menuUrl), '\nmeme [关键词]: 预览和查看用法'])
      }
      if (text.startsWith('meme')) {
        const key = text.replace('meme', '').trim()
        const target = list.find((e) => events.ensureArray(e.name).some((e) => e === key))

        if (!target) return events.reply(context, '未找到该 meme')

        const keys = events.ensureArray(target.name)
        const imageUrl = `${baseUrl}/memes/${target.key}/preview`

        const imageDesc = Array.isArray(target.images)
          ? `[${target.images.join('～')} 张图片]`
          : `${target.images === 0 ? '' : `[${target.images} 张图片]`}`

        const textDesc = Array.isArray(target.texts)
          ? `[${target.texts.join('～')} 个文本, 空格分割]`
          : `${target.texts === 0 ? '' : `[${target.texts} 个文本, 空格分割]`}`

        const argsDesc = target.args.length ? `${target.args.map((e) => `--${e}=参数值`).join(',')}` : ''
        const usage = keys.map((key) => `${key} ${imageDesc} ${textDesc} ${argsDesc}`.trim()).join('\n')

        events.reply(context, [Structs.image(imageUrl)])
        events.reply(context,`〓 用法举例 〓\n\n${usage}\n\n〓 配置详情 〓\n\n${JSON.stringify(target, null, 2)}`)
        return
      }

      const quoteMsg = (await events.getQuoteMessage(context))

      const quoteId = quoteMsg ? quoteMsg.sender.user_id : null
      const quoteIdAvatar = quoteId ? events.getQQAvatarLink(quoteId) : ''
      const senderAvatar = events.getQQAvatarLink(context.sender.user_id)

      const atIds = events.getMessageAt(context)
      const atIdAvatars = atIds.map((e) => events.getQQAvatarLink(e))

      const quoteImages = quoteMsg
        ? quoteMsg.message
            .filter((e:any) => e.type === 'image')
            .map((e:any) => e.data.url)
            .filter(Boolean)
        : []
      const messageImages = context.message
        .filter((e) => e.type === 'image')
        .map((e) => e.data.url)
        .filter(Boolean)
      const images = (
        messageImages.length
          ? messageImages
          : [senderAvatar, ...quoteImages, ...atIdAvatars, quoteIdAvatar].filter(Boolean)
      ) as string[]
      const { _, ...options } = events.mri(events.string2argv(text))
      const [name, ...texts] = _
      const target = list.find((e) => {
        const isNameMatch = events.ensureArray(e.name).some((e) => e === name)
        const isTextMatch = Array.isArray(e.texts)
          ? texts.length >= e.texts[0] && texts.length <= e.texts[1]
          : texts.length >= e.texts
        const isImageMatch = Array.isArray(e.images)
          ? images.length >= e.images[0] && images.length <= e.images[1]
          : images.length >= e.images
        return isNameMatch && isTextMatch && isImageMatch
      })
      if (!target) return
      const form = new FormData()
      // 如果目标 meme 只需要一张图，排除自己头像
      if (target.images === 1 && !messageImages.length && images.length > 1) images.shift()
      if (!Array.isArray(target.images)) images.length = target.images
      if (!Array.isArray(target.texts)) texts.length = target.texts
      if (target.args.length === 0) {
        for (const key in options) delete options[key]
      }
      for (const image of images) {
        const response = await fetch(image)
        const blob = await response.blob()
        form.append('images', blob)
      }
      for (const text of texts) {
        form.append('texts', text)
      }
      form.append('args', JSON.stringify({ circle: true, ...options }))
      console.log(target, images, texts, options)
      const { data } = await axios.post(`${baseUrl}/memes/${target.key}`, form, { responseType: 'arraybuffer' })
      const { message_id } = await events.reply(context, [Structs.image(Buffer.from(data))])
      // 10s后撤回消息
      setTimeout(() => {
          events.delete_msg(message_id);
      }, 10000);
    },
  },
};

export default plugin;