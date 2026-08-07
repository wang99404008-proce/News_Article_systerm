const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { execSync } = require('child_process');

let articleRoutes;
try {
  articleRoutes = require('./routes/articles');
} catch (e) {
  articleRoutes = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const cleanExpiredCGImages = () => {
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  try {
    const files = fs.readdirSync(uploadDir);
    files.forEach((file) => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > TWO_WEEKS_MS) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ 已自動清理超過 14 天過期的 CG 圖卡：${file}`);
      }
    });
  } catch (error) {
    console.error('清理過期 CG 圖片時發生錯誤:', error);
  }
};

cleanExpiredCGImages();
setInterval(cleanExpiredCGImages, 24 * 60 * 60 * 1000);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `news_cg_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('上傳失敗：僅允許上傳圖片檔案！'), false);
    }
  },
});

app.use('/uploads', express.static(uploadDir));

const videoDir = path.join(__dirname, 'videos');
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}
app.use('/videos', express.static(videoDir));

const ensureWebCompatibleVideo = (filePath, filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (['.mp4', '.webm', '.ogg'].includes(ext)) {
    return filename;
  }

  const baseName = path.basename(filename, ext);
  const proxyFilename = `${baseName}_proxy.mp4`;
  const proxyPath = path.join(videoDir, proxyFilename);

  if (!fs.existsSync(proxyPath)) {
    try {
      console.log(`🔄 偵測到專業廣電格式 [${filename}]，正在自動轉出網頁預覽 Proxy...`);
      const ffmpegCmd = process.platform === 'darwin' ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
      execSync(`"${ffmpegCmd}" -i "${filePath}" -c:v libx264 -preset ultrafast -crf 28 -c:a aac "${proxyPath}"`, {
        stdio: 'inherit'
      });
      console.log(`✅ 轉檔完成：${proxyFilename}`);
    } catch (err) {
      console.error(`❌ 影片轉檔失敗 (${filename})`, err.message);
      return null;
    }
  }

  return proxyFilename;
};

// 🎥 取得影片清單 API (自動透過 ffprobe 讀取真實帶長 duration)
app.get('/api/v1/mam-videos', (req, res) => {
  try {
    const files = fs.readdirSync(videoDir);
    const rawFiles = files.filter((file) => !file.endsWith('_proxy.mp4'));

    const videoList = rawFiles
      .filter((file) => /\.(mp4|mov|avi|mkv|webm|mxf)$/i.test(file))
      .map((file) => {
        const filePath = path.join(videoDir, file);
        const stats = fs.statSync(filePath);

        const webPlayableFilename = ensureWebCompatibleVideo(filePath, file);
        if (!webPlayableFilename) return null;

        const proxyPath = path.join(videoDir, webPlayableFilename);

        let durationSeconds = 30;
        try {
          const ffprobeCmd = process.platform === 'darwin' ? '/opt/homebrew/bin/ffprobe' : 'ffprobe';
          const output = execSync(`"${ffprobeCmd}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${proxyPath}"`).toString().trim();
          const parsedDuration = parseFloat(output);
          if (!isNaN(parsedDuration)) {
            durationSeconds = Math.round(parsedDuration);
          }
        } catch (e) {
          console.warn(`無法讀取影片帶長 (${file})，使用預設值`);
        }

        return {
          filename: file,
          url: `${req.protocol}://${req.get('host')}/videos/${webPlayableFilename}`,
          size: stats.size,
          duration: durationSeconds, // 💡 實際影片帶長 (秒)
          createdAt: stats.mtime,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt);

    return res.json({ success: true, data: videoList });
  } catch (error) {
    console.error('讀取電腦影片清單失敗:', error);
    return res.status(500).json({ success: false, message: '讀取電腦影片清單失敗' });
  }
});

app.post('/api/v1/upload-image', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '請選擇檔案' });
    }
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    return res.json({ success: true, message: '上傳成功', url: imageUrl, filename: req.file.originalname });
  });
});

app.get('/api/v1/images', (req, res) => {
  try {
    cleanExpiredCGImages();
    const files = fs.readdirSync(uploadDir);
    const imageList = files
      .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map((file) => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          url: `${req.protocol}://${req.get('host')}/uploads/${file}`,
          createdAt: stats.mtime,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    return res.json({ success: true, data: imageList });
  } catch (error) {
    return res.status(500).json({ success: false, message: '讀取失敗' });
  }
});

app.patch('/api/v1/images/:filename', (req, res) => {
  const oldFilename = req.params.filename;
  const { newFilename } = req.body;
  if (!newFilename || !newFilename.trim()) {
    return res.status(400).json({ success: false, message: '新檔名不得為空' });
  }
  const oldPath = path.join(uploadDir, oldFilename);
  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ success: false, message: '找不到檔案' });
  }
  const ext = path.extname(oldFilename);
  const sanitizedNewName = newFilename.endsWith(ext) ? newFilename : `${newFilename}${ext}`;
  const newPath = path.join(uploadDir, sanitizedNewName);

  try {
    fs.renameSync(oldPath, newPath);
    const newUrl = `${req.protocol}://${req.get('host')}/uploads/${sanitizedNewName}`;
    return res.json({ success: true, message: '修改成功', data: { filename: sanitizedNewName, url: newUrl } });
  } catch (error) {
    return res.status(500).json({ success: false, message: '修改失敗' });
  }
});

if (articleRoutes) {
  app.use('/api/v1', articleRoutes);
}

app.get('/', (req, res) => {
  res.send('📺 新聞編播系統運行中...');
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動: http://localhost:${PORT}`);
});