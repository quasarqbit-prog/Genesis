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

## API
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/register` | Регистрация `{ username, password }` |
| POST | `/api/login` | Вход → `{ token, user }` |
| GET | `/api/user/profile` | Профиль (Bearer JWT) |
| PUT | `/api/user/profile` | Сохранить анкету расы / stats |
| GET | `/api/health` | Проверка API + БД |

## Socket.io
- `presence:update` `{ online }`
- `chat:message` `{ username, text, at }`
- Аутентификация сокета: `io({ auth: { token } })`
