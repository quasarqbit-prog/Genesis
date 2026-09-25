# Genesis Web — клиент + сервер

## Стек
- Frontend: `index.html`, `styles.css`, `script.js` (+ assets)
- Backend: Node.js 20 · Express · Socket.io · MariaDB (`server.js`)
- Прокси: Nginx

## Локальный запуск
1. Установите MariaDB и выполните `sql/schema.sql`.
2. Скопируйте `.env.example` → `.env` и заполните пароли / `JWT_SECRET`.
3. ```bash
   npm install
   npm run dev
   ```
4. Откройте `http://localhost:3000` (в dev Express раздаёт статику).

## Деплой на VPS (Cityhost)
```bash
cd /var/www/mygame
git pull
cp -n .env.example .env   # один раз, потом правите вручную
npm install
# применить схему, если ещё не применяли:
# mysql -u root -p < sql/schema.sql

# Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl reload nginx

# PM2
pm2 restart game-server || pm2 start server.js --name game-server
pm2 save
```

На проде `NODE_ENV=production` — статику отдаёт Nginx, Node слушает только API/Socket на `:3000`.

## Minecraft-мод (вход по паролю сайта)
В `.env` на VPS задай длинный секрет и перезапусти PM2:

```bash
# /var/www/mygame/.env
MOD_API_KEY=длинный_секретный_ключ
```

В конфиге мода на **Minecraft-сервере**:
- `apiKey` = тот же ключ (только сервер мода; клиенту ключ не отдаётся)
- `apiBaseUrl` = адрес сайта без `/` в конце (например `http://148.251.218.142`)

Проверка пароля идёт **с клиента игрока** на сайт (`POST /api/mc/player-verify`), затем сервер мода принимает HMAC-подпись. Так авторизация работает даже если игровой хостинг режет исходящий HTTP с машины сервера.

Старый серверный эндпоинт `POST /api/mc/verify` (с `x-mod-key`) тоже остаётся.

## Обновление мода (jar)
1. Залей один `.jar` вручную в папку Drive (`GDRIVE_MOD_FOLDER_ID`).
2. На сайте (founder) нажми **Уведомить об обновлении** — у всех появится значок обновления.
3. Игроки качают через **Установить мод**.

Сервисный аккаунт Google для этого не нужен: папка должна быть доступна по ссылке.

## Онлайн на сервере (голубая рамка)
Сайт сам знает, кто на сайте (Socket.io). Кто **в игре** — сообщает мод.

`POST /api/mc/online`  
Заголовок: `x-mod-key: <MOD_API_KEY>`  
Тело — **полный** список ников, которые сейчас на Minecraft-сервере:

```json
{ "nicks": ["Steve", "Alex"] }
```

Допустимо и так: `{ "players": ["Steve"] }` или `{ "nicks": [{ "nick": "Steve" }] }`.

Ответ: `{ "ok": true, "serverOnlineIds": [1, 2] }`.

Правила для мода:
1. Вызывать при входе/выходе игрока и периодически (например раз в 15–30 с) с актуальным списком.
2. Пустой список `{ "nicks": [] }` — все считаются оффлайн в игре.
3. Ники должны совпадать с `mc_nick` на сайте (регистр не важен). Незарегистрированные ники игнорируются.
4. Ключ только на **сервере мода**, не в клиенте.

Приоритет рамок на сайте:
1. **Голубая** — онлайн в игре (`is-server`)
2. **Салатовая** — только на сайте (`is-site`)
Если и там и там — показывается только игра.

## Чаты (сайт + мод)
Вкладки **Мои чаты** (ЛС + группы, только по добавлению) и **Общие чаты** (вступление свободное).

Мод (заголовок `x-mod-key`, в query/body — `nick` игрока):

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/mc/chat/rooms?nick=&scope=mine\|public` | Список чатов |
| POST | `/api/mc/chat/rooms` | Создать `{ nick, type, name?, memberIds?\|memberNicks? }` |
| POST | `/api/mc/chat/rooms/:id/join` | Вступить в общий `{ nick }` |
| GET | `/api/mc/chat/rooms/:id/messages?nick=&after=` | История |
| POST | `/api/mc/chat/messages` | Отправить `{ nick, roomId\|roomSlug, text, audienceNicks? }` |
| GET | `/api/mc/chat/sync?nick=&after=` | Новые сообщения во всех чатах игрока |
| GET | `/api/mc/chat/directory` | Список ников для создания |

Системные общие чаты (создаются при старте сервера):
- `roomSlug: "minecraft"` — общий чат Minecraft
- `roomSlug: "proximity"` — «По близости»: на сайте только просмотр; писать из мода с `audienceNicks` (отправитель + кто рядом)

Сайт → мод: мод периодически дергает `sync`. Мод → сайт: `POST .../messages` (сразу видно на сайте через Socket.io).

## API
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/register` | Регистрация `{ username, password }` |
| POST | `/api/login` | Вход → `{ token, user }` |
| GET | `/api/user/profile` | Профиль (Bearer JWT) |
| PUT | `/api/user/profile` | Сохранить анкету роли / stats |
| GET | `/api/health` | Проверка API + БД |

## Socket.io
- `presence:update` `{ online, onlineIds, serverOnlineIds }`
- Аутентификация сокета: `io({ auth: { token } })`
