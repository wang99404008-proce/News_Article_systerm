const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
// ... 其他原本的引入與設定 (例如 cors, app = express() 等)

// 1. 確保 uploads 資料夾存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 2. 讓 uploads 資料夾可以對外提供靜態檔案存取
app.use('/uploads', express.static(uploadsDir));

// 3. 設定 Multer 儲存上傳的圖片
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// ==========================================
// 🖼️ CG 圖卡相關 API 路由
// ==========================================

// A. 取得所有上傳的 CG 圖卡清單
app.get('/api/v1/images', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ success: false, message: '無法讀取圖卡資料夾' });
    }

    // 動態取得當前伺服器網址 (自動適應 Render 的 https 與網域名稱)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const imageList = files
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => ({
        filename: file,
        url: `${baseUrl}/uploads/${file}`
      }));

    res.json({ success: true, data: imageList });
  });
});

// B. 上傳單張 CG 圖卡
app.post('/api/v1/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '請選擇要上傳的圖片' });
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

  res.json({
    success: true,
    message: '上傳成功',
    data: {
      filename: req.file.filename,
      url: imageUrl
    }
  });
});

// C. 修改 CG 圖卡檔名
app.patch('/api/v1/images/:filename', (req, res) => {
  const oldFilename = req.params.filename;
  const { newFilename } = req.body;

  if (!newFilename || !newFilename.trim()) {
    return res.status(400).json({ success: false, message: '新檔名不能為空' });
  }

  const oldPath = path.join(uploadsDir, oldFilename);
  const ext = path.extname(oldFilename);
  
  // 確保新檔名帶有副檔名
  const targetNewName = newFilename.endsWith(ext) ? newFilename : newFilename + ext;
  const newPath = path.join(uploadsDir, targetNewName);

  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ success: false, message: '找不到原始檔案' });
  }

  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: '修改檔名失敗' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    res.json({
      success: true,
      message: '修改檔名成功',
      data: {
        filename: targetNewName,
        url: `${baseUrl}/uploads/${targetNewName}`
      }
    });
  });
});