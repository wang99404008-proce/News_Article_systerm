// server.js
const express = require('express');
const articleRoutes = require('./routes/articles');

const app = express();

// 讓 Express 能夠解析前端傳上來的 JSON 資料
app.use(express.json());

// 模擬登入使用者 Middleware（測試用）
app.use((req, res, next) => {
  req.user = { id: 'test-user-id-123' }; // 假裝已經登入
  next();
});

// 掛載 API 路由
app.use('/api/v1', articlesRouter);

// 啟動伺服器在 3000 Port
app.listen(3000, () => {
  console.log('新聞後端 API 伺服器已啟動：http://localhost:3000');
});