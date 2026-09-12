const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

// 1. Папка для базы данных (выносим из корня, чтобы express.static её не видел)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)){
    fs.mkdirSync(DATA_DIR);
}
const DB_FILE = path.join(DATA_DIR, 'news.json');

// 2. Включаем CORS на полную мощность
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 3. Отдаем HTML-страницы
app.use(express.static(__dirname));

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

// 4. API Эндпоинты с жестким обходом CORB
app.get('/api/news', (req, res) => {
    try {
        const news = readData();
        news.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Заголовки, которые гарантированно пробивают CORB
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        return res.status(200).send(JSON.stringify(news));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Поставить или убрать лайк
app.post('/api/news/:id/like', (req, res) => {
    const articleId = parseInt(req.params.id);
    const { action } = req.body; // action может быть 'like' или 'unlike'

    try {
        const news = readData();
        const article = news.find(item => item.id === articleId);

        if (!article) {
            return res.status(404).json({ error: 'Новость не найдена' });
        }

        // Обновляем счетчик на сервере
        if (action === 'like') {
            article.likes = (article.likes || 0) + 1;
        } else if (action === 'unlike') {
            article.likes = Math.max(0, (article.likes || 0) - 1); // не уходим в минус
        }

        writeData(news);

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(JSON.stringify({ success: true, likes: article.likes }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`Сервер работает на http://localhost:${PORT}`);
});
