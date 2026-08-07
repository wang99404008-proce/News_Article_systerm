const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// 1. 取得所有文章
router.get('/articles', async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { author: true }
    });
    return res.json({ success: true, data: articles });
  } catch (error) {
    console.error('取得文章列表失敗:', error);
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 2. 建立新文章草稿
router.post('/articles', async (req, res) => {
  try {
    const { title, contentHtml, airDate, newsFormat, reviewStatus } = req.body || {};
    
    let author = await prisma.user.findFirst();
    if (!author) {
      author = await prisma.user.create({
        data: {
          email: 'editor@news.com',
          name: '新聞編輯',
        },
      });
    }

    const newArticle = await prisma.article.create({
      data: {
        title: title || '未命名快訊草稿',
        contentHtml: contentHtml || '',
        status: 'DRAFT',
        reviewStatus: reviewStatus || 'PENDING',
        newsFormat: newsFormat || 'SOT',
        authorId: author.id,
        airDate: airDate || new Date().toISOString().split('T')[0],
      },
    });

    console.log(`📝 新增草稿成功！ID: ${newArticle.id}`);
    return res.json({ success: true, data: newArticle });
  } catch (error) {
    console.error('建立草稿失敗:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. 儲存/更新草稿與審稿狀態
router.patch('/articles/:id/draft', async (req, res) => {
  const { id } = req.params;
  const { title, contentHtml, airDate, newsFormat, reviewStatus } = req.body;

  try {
    const updatedArticle = await prisma.article.update({
      where: { id },
      data: {
        title: title || '未命名新聞',
        contentHtml: contentHtml || '',
        airDate: airDate || new Date().toISOString().split('T')[0],
        newsFormat: newsFormat || 'SOT',
        reviewStatus: reviewStatus || 'PENDING',
        updatedAt: new Date(),
      },
    });

    console.log(`💾 儲存草稿成功！ID: ${id}`);
    return res.json({ success: true, data: updatedArticle });
  } catch (error) {
    console.error('更新草稿失敗:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. 正式發布新聞 API
router.post('/articles/:id/publish', async (req, res) => {
  const { id } = req.params;
  const { title, contentHtml, airDate, newsFormat } = req.body;

  try {
    const publishedArticle = await prisma.article.update({
      where: { id },
      data: {
        title: title || '未命名新聞',
        contentHtml: contentHtml || '',
        airDate: airDate || new Date().toISOString().split('T')[0],
        newsFormat: newsFormat || 'SOT',
        reviewStatus: 'APPROVED',
        status: 'PUBLISHED',
        updatedAt: new Date(),
      },
    });

    console.log(`🚀 新聞已成功發布！ID: ${id}`);
    return res.json({ success: true, data: publishedArticle });
  } catch (error) {
    console.error('發布新聞失敗:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. 刪除文章 API
router.delete('/articles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.article.delete({
      where: { id },
    });
    console.log(`🗑️ 文章已成功刪除！ID: ${id}`);
    return res.json({ success: true, message: '文章已成功刪除' });
  } catch (error) {
    console.error('刪除文章失敗:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;