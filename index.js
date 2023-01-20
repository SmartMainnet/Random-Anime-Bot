require('dotenv').config()
const { STICKER, BOT_API, MONGODB_URI } = process.env

const { MongoClient } = require('mongodb')
const client = new MongoClient(MONGODB_URI)

client.connect()

const db = client.db('random-anime-bot')
const users = db.collection('users')

const axios = require('axios')
const TelegramApi = require('node-telegram-bot-api')

const token = BOT_API
const bot = new TelegramApi(token, { polling: true })

const reply_markup = JSON.stringify({
  keyboard: [
    [{ text: 'Случайное аниме' }],
    [{ text: 'Фэнтези' }, { text: 'Приключения' }, { text: 'Сёнен' }],
    [{ text: 'Меха' }, { text: 'Фантастика' }, { text: 'Экшен' }],
    [{ text: 'Романтика' }, { text: 'Повседневность' }, { text: 'Драма' }],
    [{ text: 'Музыка' }, { text: 'Комедия' }, { text: 'Спорт' }],
    [{ text: 'Детектив' }, { text: 'Сверхъестественное' }, { text: 'Ужасы' }],
    [{ text: 'Игры' }, { text: 'Гарем' }, { text: 'Этти' }]
  ],
  resize_keyboard: true
})

const getAnime = async (chatId, genre, msg) => {
  axios.get(`https://anime777.ru/api/rand?genre=${genre}`).then(async res => {
    try {
      const content = (
        `${res.data.title_orig} - ${res.data.title}\n\n` +
        `- Жанр: ${res.data.material_data.anime_genres.join(', ')}\n\n` +
        `- Описание: ${res.data.material_data.description}`
      )
      
      if (content.length <= 1024) {
        await bot.sendPhoto(chatId, res.data.material_data.poster_url, { caption: content, reply_markup })
        
        await users.updateOne({ id: chatId },
          {
            $set: {
              username: msg.from.username,
              first_name: msg.from.first_name,
              last_name: msg.from.last_name,
              date_last_call: new Date(),
              last_call: genre
            },
            $inc: { number_calls: 1 },
            $push: {
              calls: {
                call: genre,
                date: new Date()
              }
            }
          }
        )
      } else {
        getAnime(chatId, genre, msg)
      }
    } catch (e) {
      await bot.sendMessage(chatId, 'Нажмите на одну из кнопок ниже\nчтобы получить случайное аниме 👇🏻', { reply_markup })

      await users.updateOne({ id: chatId },
        {
          $set: {
            username: msg.from.username,
            first_name: msg.from.first_name,
            last_name: msg.from.last_name,
            date_last_bad_call: new Date(),
            last_bad_call: genre
          },
          $inc: { number_bad_calls: 1 },
          $push: {
            bad_calls: {
              call: msg.text,
              date: new Date()
            }
          }
        }
      )
    }
  })
}

bot.setMyCommands([
  {command: '/start', description: 'Start Bot'}
])

bot.on('message', async msg => {
  const text = msg.text
  const chatId = msg.chat.id

  try {
    if (text === '/start') {
      await bot.sendSticker(chatId, STICKER)
      await bot.sendMessage(chatId,
        `👋🏻 Привет ${msg.from.first_name}${(msg.from.last_name === undefined) ? '': ` ${msg.from.last_name}`}!\n` +
        '🎂 Это Бот Для Поиска Аниме.\n' +
        '👨🏻‍💻 Автор: @SmartMainnet'
      )
      await bot.sendMessage(chatId, 'Нажмите на одну из кнопок ниже\nчтобы получить случайное аниме 👇🏻', { reply_markup })

      await users.findOne({ id: chatId }).then(async res => {
        if (!res) {
          await users.insertOne({
            id: chatId,
            username: msg.from.username,
            first_name: msg.from.first_name,
            last_name: msg.from.last_name,
            start_date: new Date()
          })
        }
      })
    } else if (text === 'Случайное аниме') {
      getAnime(chatId, '', msg)
    } else {
      getAnime(chatId, text, msg)
    }
  } catch (e) {
    await bot.sendMessage(chatId, 'Что-то пошло не так')
  }
})