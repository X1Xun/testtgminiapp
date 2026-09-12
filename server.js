const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

// Папка для базы данных
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)){
    fs.mkdirSync(DATA_DIR);
}
const DB_FILE = path.join(DATA_DIR, 'news.json');

// Включаем CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Обязательно подключаем обработчик JSON-тела запросов ДО статических файлов и API
app.use(express.json());

function readData() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return data ? JSON.parse(data) : [];
}

function writeData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- API ЭНДПОИНТЫ (Должны идти выше, чем express.static) ---

// 1. Получить все новости
app.get('/api/news', (req, res) => {
    try {
        const news = readData();
        news.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(JSON.stringify(news));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 2. Добавить новость
app.post('/api/news', (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Заголовок и текст обязательны' });
    }
    try {
        const news = readData();
        const newArticle = {
            id: Date.now(),
            title,
            content,
            likes: 0,
            createdAt: new Date().toISOString()
        };
        news.push(newArticle);
        writeData(news);
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(JSON.stringify({ success: true, id: newArticle.id }));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 3. Обработка лайков
app.post('/api/news/:id/like', (req, res) => {
    const articleId = parseInt(req.params.id);
    const { action } = req.body;

    try {
        const news = readData();
        const article = news.find(item => item.id === articleId);

        if (!article) {
            return res.status(404).json({ error: 'Новость не найдена' });
        }

        if (action === 'like') {
            article.likes = (article.likes || 0) + 1;
        } else if (action === 'unlike') {
            article.likes = Math.max(0, (article.likes || 0) - 1);
        }

        writeData(news);

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(JSON.stringify({ success: true, likes: article.likes }));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// СТАТИКА (Раздача HTML страниц) — строго в самом низу!
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Сервер работает на порту ${PORT}`);
});
