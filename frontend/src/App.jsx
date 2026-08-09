import React, { useState, useEffect, useRef } from 'react';
import NewsEditor from './components/NewsEditor';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api/v1/articles`;

const getTodayString = () => new Date().toISOString().split('T')[0];

const TIME_SLOTS = [
  { id: '0630', name: '06:30 晨間新聞' },
  { id: '1200', name: '12:00 午間新聞' },
  { id: '1900', name: '19:00 晚間新聞' },
];

const ITEM_STATUSES = {
  UNPLAYED: { label: '未播', color: '#0284c7', bg: '#e0f2fe' },
  PLAYING: { label: '播中', color: '#16a34a', bg: '#dcfce7' },
  PLAYED: { label: '已播', color: '#64748b', bg: '#f1f5f9' },
  DROPPED: { label: '抽稿', color: '#dc2626', bg: '#fef2f2' }
};

export default function App() {
  const [articles, setArticles] = useState([]); 
  const [targetDate, setTargetDate] = useState(getTodayString());
  const [selectedSlot, setSelectedSlot] = useState('1200'); 
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); 

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileTab, setMobileTab] = useState('EDITOR');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [modalPos, setModalPos] = useState({ x: window.innerWidth - 820, y: 50 });
  const [modalSize, setModalSize] = useState({ width: 800, height: 620 });

  const isDraggingModalRef = useRef(false);
  const isResizingModalRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, w: 800, h: 620 });

  const [playingVideo, setPlayingVideo] = useState(null); 
  const [videoModalPos, setVideoModalPos] = useState({ x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 180 });
  const [videoModalSize, setVideoModalSize] = useState({ width: 520, height: 360 });

  const isDraggingVideoRef = useRef(false);
  const isResizingVideoRef = useRef(false);
  const videoDragOffsetRef = useRef({ x: 0, y: 0 });
  const videoResizeStartRef = useRef({ x: 0, y: 0, w: 520, h: 360 });

  const [uploadedImageList, setUploadedImageList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [editingFilename, setEditingFilename] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [slotMinutes, setSlotMinutes] = useState({ '0630': 15, '1200': 15, '1900': 15 });
  const [defaultBreakSeconds, setDefaultBreakSeconds] = useState(180);
  const [charToSecRate, setCharToSecRate] = useState(4);

  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  const [historySearchKeyword, setHistorySearchKeyword] = useState('');
  const [subDirectoryPath, setSubDirectoryPath] = useState('D:\\ENPS9AMAIN\\P_NEWS-3\\W\\F_舊RUNDOWN存檔區');

  const [mamVideoList, setMamVideoList] = useState([]); 

  const [rundownMapByDate, setRundownMapByDate] = useState({
    [getTodayString()]: {
      '0630': [],
      '1200': [],
      '1900': [],
    }
  });

  const [selectedArticle, setSelectedArticle] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(18);
  const [middleWidth, setMiddleWidth] = useState(32);

  const containerRef = useRef(null);
  const isResizingRef = useRef(null);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const json = await res.json();
      if (json.success) setArticles(json.data);
    } catch (err) {
      console.error('載入文章失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadedImages = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/images`);
      const json = await res.json();
      if (json.success) {
        setUploadedImageList(json.data);
        if (json.data.length > 0 && !previewImage) {
          setPreviewImage(json.data[0]);
          setEditingFilename(json.data[0].filename);
        }
      }
    } catch (err) {
      console.error('載入 CG 圖卡失敗:', err);
    }
  };

  const fetchMamVideos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/mam-videos`);
      const json = await res.json();
      if (json.success) setMamVideoList(json.data);
    } catch (err) {
      console.error('載入電腦影片清單失敗:', err);
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchUploadedImages();
    fetchMamVideos();
  }, []);

  const currentRundown = rundownMapByDate[targetDate]?.[selectedSlot] || [];
  const updateCurrentRundown = (newRundown) => {
    setRundownMapByDate((prev) => ({
      ...prev,
      [targetDate]: {
        ...(prev[targetDate] || { '0630': [], '1200': [], '1900': [] }),
        [selectedSlot]: newRundown
      }
    }));
  };

  // 💡 提供 NewsEditor「＋加入排播」按鈕的全域接收方法
  useEffect(() => {
    window.handleDirectAddToRundown = (newItem) => {
      const updated = [...currentRundown, newItem];
      updateCurrentRundown(updated);
      alert(`🎉 成功將「${newItem.title}」加入 ${targetDate} (${selectedSlot}) 的 Rundown！`);
      if (isMobile) {
        setMobileTab('RUNDOWN');
      }
    };
    return () => {
      delete window.handleDirectAddToRundown;
    };
  }, [currentRundown, targetDate, selectedSlot, isMobile]);

  useEffect(() => {
    const handleMouseMoveWindow = (e) => {
      if (isDraggingModalRef.current) {
        setModalPos({
          x: Math.min(Math.max(10, e.clientX - dragOffsetRef.current.x), window.innerWidth - 100),
          y: Math.min(Math.max(10, e.clientY - dragOffsetRef.current.y), window.innerHeight - 80)
        });
      }
      if (isResizingModalRef.current) {
        setModalSize({
          width: Math.max(420, resizeStartRef.current.w + (e.clientX - resizeStartRef.current.x)),
          height: Math.max(320, resizeStartRef.current.h + (e.clientY - resizeStartRef.current.y))
        });
      }
      if (isDraggingVideoRef.current) {
        setVideoModalPos({
          x: Math.min(Math.max(10, e.clientX - videoDragOffsetRef.current.x), window.innerWidth - 100),
          y: Math.min(Math.max(10, e.clientY - videoDragOffsetRef.current.y), window.innerHeight - 60)
        });
      }
      if (isResizingVideoRef.current) {
        setVideoModalSize({
          width: Math.max(320, videoResizeStartRef.current.w + (e.clientX - videoResizeStartRef.current.x)),
          height: Math.max(220, videoResizeStartRef.current.h + (e.clientY - videoResizeStartRef.current.y))
        });
      }
    };

    const handleMouseUpWindow = () => {
      if (isDraggingModalRef.current || isResizingModalRef.current || isDraggingVideoRef.current || isResizingVideoRef.current) {
        isDraggingModalRef.current = false;
        isResizingModalRef.current = false;
        isDraggingVideoRef.current = false;
        isResizingVideoRef.current = false;
        document.body.style.userSelect = 'auto';
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMoveWindow);
    window.addEventListener('mouseup', handleMouseUpWindow);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveWindow);
      window.removeEventListener('mouseup', handleMouseUpWindow);
    };
  }, []);

  const handleStartDragModal = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    isDraggingModalRef.current = true;
    dragOffsetRef.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y };
    document.body.style.userSelect = 'none';
  };

  const handleStartResizeModal = (e) => {
    e.stopPropagation(); e.preventDefault();
    isResizingModalRef.current = true;
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: modalSize.width, h: modalSize.height };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
  };

  const handleStartDragVideoModal = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDraggingVideoRef.current = true;
    videoDragOffsetRef.current = { x: e.clientX - videoModalPos.x, y: e.clientY - videoModalPos.y };
    document.body.style.userSelect = 'none';
  };

  const handleStartResizeVideoModal = (e) => {
    e.stopPropagation(); e.preventDefault();
    isResizingVideoRef.current = true;
    videoResizeStartRef.current = { x: e.clientX, y: e.clientY, w: videoModalSize.width, h: videoModalSize.height };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ 檔案過大！CG 圖卡大小不能超過 5MB。');
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    try {
      setUploading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/upload-image`, { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        alert('🎉 CG 圖卡上傳成功！');
        await fetchUploadedImages();
      } else {
        alert('上傳失敗：' + json.message);
      }
    } catch (err) {
      alert('上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveFilename = async () => {
    if (!previewImage || !editingFilename.trim()) return;
    try {
      setIsRenaming(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/images/${encodeURIComponent(previewImage.filename)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newFilename: editingFilename })
      });
      const json = await res.json();
      if (json.success) {
        alert('✅ 檔名修改成功！');
        await fetchUploadedImages();
        setPreviewImage(json.data);
        setEditingFilename(json.data.filename);
      } else {
        alert('修改失敗：' + json.message);
      }
    } catch (err) {
      alert('無法連線至伺服器');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleArticleStatusChange = (articleId, newStatus) => {
    setArticles((prev) => prev.map((art) => (art.id === articleId ? { ...art, status: newStatus } : art)));
    setRundownMapByDate((prevMap) => {
      const newMap = { ...prevMap };
      Object.keys(newMap).forEach(dateKey => {
        newMap[dateKey] = { ...newMap[dateKey] };
        Object.keys(newMap[dateKey]).forEach(slotKey => {
          newMap[dateKey][slotKey] = newMap[dateKey][slotKey].map(item => {
            if (item.id === articleId) {
              return { ...item, status: newStatus };
            }
            return item;
          });
        });
      });
      return newMap;
    });
  };

  // 💡 點擊抽稿按鈕：從 Rundown 移除，並將該文章標記為 DROPPED（抽稿）
  const handleDropItemFromRundown = (item, e) => {
    e.stopPropagation();
    updateCurrentRundown(currentRundown.filter(i => i.rundownItemId !== item.rundownItemId));
    if (item.id) {
      handleArticleStatusChange(item.id, 'DROPPED');
      fetch(`${API_URL}/${item.id}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, status: 'DROPPED' })
      }).catch(err => console.error(err));
    }
    alert(`🚫 已將「${item.title}」抽稿移出排播表！`);
  };

  const handleSaveSuccess = (savedArticle) => {
    setArticles((prev) => {
      const exists = prev.some((art) => art.id === savedArticle.id);
      return exists ? prev.map((art) => (art.id === savedArticle.id ? savedArticle : art)) : [savedArticle, ...prev];
    });
    setSelectedArticle(savedArticle);

    setRundownMapByDate((prevMap) => {
      const newMap = { ...prevMap };
      Object.keys(newMap).forEach(dateKey => {
        newMap[dateKey] = { ...newMap[dateKey] };
        Object.keys(newMap[dateKey]).forEach(slotKey => {
          newMap[dateKey][slotKey] = newMap[dateKey][slotKey].map(item => {
            if (item.id === savedArticle.id) {
              return {
                ...item,
                ...savedArticle,
                rundownItemId: item.rundownItemId,
                playStatus: item.playStatus
              };
            }
            return item;
          });
        });
      });
      return newMap;
    });
  };

  const handleCreateNew = () => setSelectedArticle(null);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else if (document.exitFullscreen) {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width * 100;
      if (isResizingRef.current === 'LEFT') {
        setLeftWidth(Math.min(Math.max(percent, 10), 40));
      } else if (isResizingRef.current === 'MIDDLE') {
        setMiddleWidth(Math.min(Math.max(percent - leftWidth, 15), 60));
      }
    };
    const handleMouseUp = () => { isResizingRef.current = null; document.body.style.cursor = 'default'; document.body.style.userSelect = 'auto'; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [leftWidth]);

  const startResizing = (type) => (e) => {
    e.preventDefault(); isResizingRef.current = type;
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
  };

  const rightWidth = 100 - leftWidth - middleWidth;

  const insertBreak = () => {
    const count = currentRundown.filter(item => item.type === 'BREAK').length + 1;
    updateCurrentRundown([...currentRundown, { rundownItemId: `break_${Date.now()}`, title: `-- 廣告破口 ${count} (3分00秒) --`, type: 'BREAK', playStatus: 'UNPLAYED' }]);
  };

  const toggleStatus = (rundownItemId, e) => {
    e.stopPropagation();
    const keys = Object.keys(ITEM_STATUSES);
    updateCurrentRundown(currentRundown.map(item => item.rundownItemId === rundownItemId ? { ...item, playStatus: keys[(keys.indexOf(item.playStatus || 'UNPLAYED') + 1) % keys.length] } : item));
  };

  const moveItemUp = (index, e) => {
    e.stopPropagation();
    if (index === 0) return;
    const updated = [...currentRundown];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    updateCurrentRundown(updated);
  };

  const moveItemDown = (index, e) => {
    e.stopPropagation();
    if (index === currentRundown.length - 1) return;
    const updated = [...currentRundown];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    updateCurrentRundown(updated);
  };

  const handleDrop = async (e, defaultIndex = null) => {
    e.preventDefault(); setIsDraggingOver(false);
    const source = e.dataTransfer.getData('source');
    if (source === 'LIBRARY') {
      const artData = e.dataTransfer.getData('article');
      if (artData) {
        const article = JSON.parse(artData);
        const newItem = { ...article, rundownItemId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, playStatus: 'UNPLAYED', type: 'NEWS' };
        const updated = [...currentRundown];
        updated.push(newItem);
        updateCurrentRundown(updated);

        if (article.status === 'DROPPED' && article.id) {
          handleArticleStatusChange(article.id, 'DRAFT');
          fetch(`${API_URL}/${article.id}/draft`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...article, status: 'DRAFT' })
          }).catch(err => console.error(err));
        }
      }
    }
  };

  const calculateTotalDuration = () => {
    let totalSeconds = 0;
    currentRundown.forEach(item => {
      if (item.type === 'BREAK') {
        totalSeconds += defaultBreakSeconds; 
        return;
      }
      const html = item.contentHtml || '';
      const matches = html.match(/\[影音素材\][^)]*\(長度:\s*(\d+)s\)/g);
      if (matches) {
        matches.forEach(m => {
          if (/roll/i.test(m)) { return; }
          const secMatch = m.match(/(\d+)s/);
          if (secMatch) {
            const sec = parseInt(secMatch[1], 10);
            if (!isNaN(sec)) totalSeconds += sec;
          }
        });
      } else {
        const fallbackMatches = html.match(/長度:\s*(\d+)s/g);
        if (fallbackMatches) {
          fallbackMatches.forEach(m => {
            const sec = parseInt(m.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(sec)) totalSeconds += sec;
          });
        }
      }
    });
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return { mins, secs, totalSeconds };
  };

  const rundownDuration = calculateTotalDuration();
  const currentLimitMinutes = slotMinutes[selectedSlot] || 15;
  const TARGET_LIMIT_SECONDS = currentLimitMinutes * 60; 
  const isOverTime = rundownDuration.totalSeconds > TARGET_LIMIT_SECONDS;

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const generateTwoMonthsTimeSlots = () => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      TIME_SLOTS.forEach(slot => {
        list.push({
          date: dateStr,
          slot: slot.id,
          slotName: slot.name
        });
      });
    }
    return list;
  };

  const timeSlotFilesList = generateTwoMonthsTimeSlots();

  const filteredTimeSlotFiles = timeSlotFilesList.filter(item => {
    const kw = historySearchKeyword.toLowerCase();
    if (!kw) return true;
    return item.date.includes(kw) || item.slot.includes(kw) || item.slotName.toLowerCase().includes(kw);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* 頂部 Header */}
      <header style={{ height: '48px', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 110 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ backgroundColor: isSidebarOpen ? '#0369a1' : 'transparent', color: '#ffffff', border: '1px solid #38bdf8', borderRadius: '4px', padding: '4px 10px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>⋮</button>
          <h2 style={{ margin: 0, fontSize: isMobile ? '14px' : '18px', fontWeight: 'bold' }}>📺 電視新聞編播系統</h2>
          {!isMobile && <span style={{ fontSize: '12px', background: '#0369a1', padding: '3px 10px', borderRadius: '12px' }}>📅 {targetDate} ｜ {TIME_SLOTS.find(s => s.id === selectedSlot)?.name}</span>}
        </div>
        <button onClick={toggleFullScreen} style={{ padding: '5px 12px', backgroundColor: '#0369a1', color: '#ffffff', border: '1px solid #38bdf8', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>{isFullscreen ? '退出全螢幕' : '全螢幕'}</button>
      </header>

      {/* 主體區塊 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* 左側選單 Drawer */}
        {isSidebarOpen && (
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '320px', backgroundColor: '#ffffff', zIndex: 120, boxShadow: '4px 0 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#0284c7' }}>⚙️ 控播系統控制選單</span>
              <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              
              <div onClick={() => { setActiveModal('IMAGE_UPLOAD'); setIsSidebarOpen(false); }} style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '6px', border: '1px solid #bae6fd', cursor: 'pointer' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1' }}>🖼️ 新聞 CG 圖卡管理區</div>
                <div style={{ fontSize: '11px', color: '#0369a1' }}>上傳 5MB 內圖卡，支援大圖預覽與更改檔名</div>
              </div>

              <div onClick={() => { setActiveModal('CALENDAR_LOGS'); setIsSidebarOpen(false); }} style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0', cursor: 'pointer' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d' }}>📅 播報日誌月曆檢索</div>
                <div style={{ fontSize: '11px', color: '#15803d' }}>檢視每日播報新聞清單，點擊標題直接開文稿</div>
              </div>

              <div onClick={() => { setActiveModal('TIME_CONFIG'); setIsSidebarOpen(false); }} style={{ backgroundColor: '#fff7ed', padding: '12px', borderRadius: '6px', border: '1px solid #fed7aa', cursor: 'pointer' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#c2410c' }}>⏰ 播報秒數設定</div>
                <div style={{ fontSize: '11px', color: '#c2410c' }}>管理各節新聞預定時段標準分鐘數與超時標準</div>
              </div>

              <div onClick={() => { setActiveModal('SETTINGS'); setIsSidebarOpen(false); }} style={{ backgroundColor: '#faf5ff', padding: '12px', borderRadius: '6px', border: '1px solid #e9d5ff', cursor: 'pointer' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#7e22ce' }}>⚙️ 系統參數設定</div>
                <div style={{ fontSize: '11px', color: '#7e22ce' }}>調整廣告破口預設秒數與字數轉秒數比例</div>
              </div>

              <div onClick={() => { setActiveModal('BACKUP'); setIsSidebarOpen(false); }} style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fca5a5', cursor: 'pointer' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#b91c1c' }}>🗂️ 過往歷史時段稿 (保留 2 個月)</div>
                <div style={{ fontSize: '11px', color: '#b91c1c' }}>檢索與切換過去 60 天內各日各時段的歷史時段稿</div>
              </div>

            </div>
          </div>
        )}

        {/* 浮動視窗 */}
        {activeModal && (
          <div style={{ position: 'absolute', left: `${modalPos.x}px`, top: `${modalPos.y}px`, width: `${modalSize.width}px`, height: `${modalSize.height}px`, backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 12px 35px rgba(0,0,0,0.22)', zIndex: 90, display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1' }}>
            <div onMouseDown={handleStartDragModal} style={{ padding: '12px 18px', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'move' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>
                {activeModal === 'IMAGE_UPLOAD' && '🖼️ 新聞 CG 圖卡管理與上傳區'}
                {activeModal === 'CALENDAR_LOGS' && '📅 播報日誌月曆檢索'}
                {activeModal === 'TIME_CONFIG' && '⏰ 播報秒數設定'}
                {activeModal === 'SETTINGS' && '⚙️ 系統參數設定'}
                {activeModal === 'BACKUP' && '🗂️ 過往歷史時段稿檔案總管'}
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ backgroundColor: '#0369a1', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>✕ 關閉</button>
            </div>
            
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
              {activeModal === 'TIME_CONFIG' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '13px', color: '#334155', fontWeight: 'bold' }}>設定各節播報時段的預定標準時長（分鐘）：</p>
                  {TIME_SLOTS.map(slot => (
                    <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>{slot.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          value={slotMinutes[slot.id]}
                          onChange={(e) => setSlotMinutes({ ...slotMinutes, [slot.id]: parseInt(e.target.value) || 15 })}
                          style={{ width: '70px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }}
                        />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>分鐘</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeModal === 'SETTINGS' && (
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ backgroundColor: '#fff', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontWeight: 'bold', color: '#0f172a' }}>廣告破口預設時長 (秒)：</label>
                    <input
                      type="number"
                      value={defaultBreakSeconds}
                      onChange={(e) => setDefaultBreakSeconds(parseInt(e.target.value) || 180)}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '150px', fontWeight: 'bold' }}
                    />
                  </div>

                  <div style={{ backgroundColor: '#fff', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontWeight: 'bold', color: '#0f172a' }}>主播讀稿語速比例 (字/秒)：</label>
                    <input
                      type="number"
                      value={charToSecRate}
                      onChange={(e) => setCharToSecRate(parseFloat(e.target.value) || 4)}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '150px', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              )}

              {activeModal === 'BACKUP' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', fontFamily: 'monospace' }}>
                  <input type="text" placeholder="🔍 輸入關鍵字快速過濾日期或時段..." value={historySearchKeyword} onChange={(e) => setHistorySearchKeyword(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', background: '#fff' }} />
                  <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px', backgroundColor: '#ffffff', fontSize: '12px' }}>
                    {filteredTimeSlotFiles.map((item, idx) => (
                      <div key={idx} onClick={() => { setTargetDate(item.date); setSelectedSlot(item.slot); setActiveModal(null); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', borderRadius: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 'bold' }}>
                          <span>🗂️</span>
                          <span>{item.date} {item.slot}</span>
                          <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '11px' }}>({item.slotName})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeModal === 'CALENDAR_LOGS' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <button onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else { setCalendarMonth(calendarMonth - 1); } }} style={{ padding: '6px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>◀ 上個月</button>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{calendarYear} 年 {calendarMonth + 1} 月</span>
                    <button onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else { setCalendarMonth(calendarMonth + 1); } }} style={{ padding: '6px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>下個月 ▶</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1 }}>
                    {(() => {
                      const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
                      const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
                      const cells = [];
                      for (let i = 0; i < firstDay; i++) { cells.push(<div key={`empty_${i}`} style={{ backgroundColor: '#f1f5f9', borderRadius: '4px', opacity: 0.3 }} />); }
                      for (let day = 1; day <= daysInMonth; day++) {
                        const monthStr = String(calendarMonth + 1).padStart(2, '0');
                        const dayStr = String(day).padStart(2, '0');
                        const dateKey = `${calendarYear}-${monthStr}-${dayStr}`;
                        const dayArticles = articles.filter(art => art.airDate === dateKey);
                        cells.push(
                          <div key={dateKey} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '80px', overflowY: 'auto' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', borderBottom: '1px solid #f1f5f9', paddingBottom: '2px' }}>{day}日</div>
                            {dayArticles.map(art => (
                              <div key={art.id} onClick={() => { setTargetDate(dateKey); setSelectedArticle(art); setActiveModal(null); }} style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '3px', padding: '3px 6px', fontSize: '11px', color: '#0369a1', cursor: 'pointer' }}>📰 {art.title || '(無標題)'}</div>
                            ))}
                          </div>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>
              )}

              {activeModal === 'IMAGE_UPLOAD' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                    <span style={{ fontSize: '12px', color: '#0369a1' }}>支援 5MB 內圖卡</span>
                    <label style={{ backgroundColor: '#0284c7', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                      {uploading ? '上傳中...' : '📤 上傳新 CG 圖卡'}
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
                    </label>
                  </div>
                  {uploadedImageList.length > 0 && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflowY: 'auto' }}>
                        {uploadedImageList.map((img, idx) => (
                          <div key={idx} onClick={() => { setPreviewImage(img); setEditingFilename(img.filename); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', backgroundColor: previewImage?.filename === img.filename ? '#e0f2fe' : '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>
                            <img src={img.url} alt="" style={{ width: '35px', height: '30px', objectFit: 'cover' }} />
                            <span style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.filename}</span>
                          </div>
                        ))}
                      </div>
                      {previewImage && (
                        <div style={{ width: '55%', backgroundColor: '#fff', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ height: '120px', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src={previewImage.url} alt="" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                          </div>
                          <input type="text" value={editingFilename} onChange={(e) => setEditingFilename(e.target.value)} style={{ padding: '5px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                          <button onClick={handleSaveFilename} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '5px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>儲存檔名</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div onMouseDown={handleStartResizeModal} style={{ position: 'absolute', right: 0, bottom: 0, width: '16px', height: '16px', cursor: 'nwse-resize' }} />
          </div>
        )}

        {/* 影片播放浮動視窗 */}
        {playingVideo && (
          <div style={{ position: 'absolute', left: `${videoModalPos.x}px`, top: `${videoModalPos.y}px`, width: `${videoModalSize.width}px`, height: `${videoModalSize.height}px`, backgroundColor: '#0f172a', borderRadius: '10px', zIndex: 140, display: 'flex', flexDirection: 'column', border: '1px solid #334155' }}>
            <div onMouseDown={handleStartDragVideoModal} style={{ padding: '10px', backgroundColor: '#1e293b', color: '#fff', display: 'flex', justifyContent: 'space-between', cursor: 'move' }}>
              <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎥 播放：{playingVideo.filename}</span>
              <button onClick={() => setPlayingVideo(null)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <video src={playingVideo.url} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div onMouseDown={handleStartResizeVideoModal} style={{ position: 'absolute', right: 0, bottom: 0, width: '16px', height: '16px', cursor: 'nwse-resize' }} />
          </div>
        )}

        {/* 響應式佈局切換 */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            <div style={{ display: 'flex', backgroundColor: '#1e293b', color: '#fff', padding: '8px', gap: '6px', justifyContent: 'center', flexShrink: 0 }}>
              <button onClick={() => setMobileTab('SLOTS')} style={{ padding: '6px 10px', background: mobileTab === 'SLOTS' ? '#0284c7' : '#334155', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>⏰ 時段選擇</button>
              <button onClick={() => setMobileTab('RUNDOWN')} style={{ padding: '6px 10px', background: mobileTab === 'RUNDOWN' ? '#0284c7' : '#334155', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>📋 排播清單</button>
              <button onClick={() => setMobileTab('EDITOR')} style={{ padding: '6px 10px', background: mobileTab === 'EDITOR' ? '#0284c7' : '#334155', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>✍️ 文稿編輯</button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {mobileTab === 'SLOTS' && (
                <section style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  <div style={{ padding: '11px 14px', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>⏰ 選擇播報時段</div>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {TIME_SLOTS.map((slot) => (
                      <button key={slot.id} onClick={() => { setSelectedSlot(slot.id); setMobileTab('RUNDOWN'); }} style={{ padding: '12px', backgroundColor: selectedSlot === slot.id ? '#0284c7' : '#f8fafc', color: selectedSlot === slot.id ? '#fff' : '#334155', border: selectedSlot === slot.id ? 'none' : '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{slot.name}</span>
                        <span>{rundownMapByDate[targetDate]?.[slot.id]?.length || 0}條</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {mobileTab === 'RUNDOWN' && (
                <section style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                  <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', borderBottom: '2px solid #e2e8f0', backgroundColor: '#fff' }}>
                    <div style={{ padding: '10px 14px', backgroundColor: isOverTime ? '#fef2f2' : '#e0f2fe', borderBottom: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: isOverTime ? '#dc2626' : '#0369a1', fontSize: '12px' }}>
                        ⏱️ 總時長：{rundownDuration.mins}分 {rundownDuration.secs}秒 {isOverTime && '⚠️ 超時'}
                      </span>
                      <button onClick={insertBreak} style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold' }}>＋破口</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                      {currentRundown.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '20px', border: '2px dashed #e2e8f0', padding: '20px', borderRadius: '8px' }}>
                          此時段尚無排播新聞
                        </div>
                      ) : (
                        currentRundown.map((item, index) => {
                          const statusConfig = ITEM_STATUSES[item.playStatus || 'UNPLAYED'];
                          const isBreak = item.type === 'BREAK';

                          return (
                            <div
                              key={item.rundownItemId || index}
                              onClick={() => { if(!isBreak) { setSelectedArticle(item); setMobileTab('EDITOR'); } }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 10px',
                                marginBottom: '6px',
                                borderRadius: '6px',
                                borderLeft: `5px solid ${isBreak ? '#f97316' : statusConfig.color}`,
                                backgroundColor: isBreak ? '#fff7ed' : '#fff',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer'
                              }}
                            >
                              <span style={{ width: '20px', fontWeight: 'bold', color: '#0284c7', fontSize: '12px' }}>{index + 1}</span>
                              <div style={{ flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 'bold' }}>
                                {item.title}
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {!isBreak && (
                                  <button onClick={(e) => toggleStatus(item.rundownItemId, e)} style={{ padding: '2px 6px', backgroundColor: statusConfig.bg, color: statusConfig.color, border: 'none', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold' }}>
                                    {statusConfig.label}
                                  </button>
                                )}
                                {/* 💡 手機/一般點擊即抽稿按鈕 */}
                                {!isBreak && (
                                  <button onClick={(e) => handleDropItemFromRundown(item, e)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '10px' }} title="抽稿">🚫</button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); updateCurrentRundown(currentRundown.filter(i => i.rundownItemId !== item.rundownItemId)); }} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '10px' }}>✕</button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 0.8, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 14px', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}>🎥 MAM 影音資產庫</div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                      {mamVideoList.map((vid, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPlayingVideo(vid)}
                          style={{ padding: '8px 10px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}
                        >
                          <span>🎬 {vid.filename}</span>
                          <span style={{ fontSize: '10px', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 4px', borderRadius: '3px' }}>播放</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {mobileTab === 'EDITOR' && (
                <section style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '12px' }}>
                  <NewsEditor
                    key={selectedArticle?.id || 'new_article'}
                    initialArticle={selectedArticle}
                    allArticles={articles}
                    onSelectArticle={(art) => setSelectedArticle(art)}
                    onSaveSuccess={handleSaveSuccess}
                    onCreateNew={handleCreateNew}
                    onRemoveFromRundownByItem={handleRemoveFromRundownByItem}
                    onArticleStatusChange={handleArticleStatusChange}
                  />
                </section>
              )}
            </div>
          </div>
        ) : (
          <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            <section style={{ width: `${leftWidth}%`, backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '11px 14px', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>⏰ 選擇播報時段</div>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {TIME_SLOTS.map((slot) => (
                  <button key={slot.id} onClick={() => setSelectedSlot(slot.id)} style={{ padding: '12px', backgroundColor: selectedSlot === slot.id ? '#0284c7' : '#f8fafc', color: selectedSlot === slot.id ? '#fff' : '#334155', border: selectedSlot === slot.id ? 'none' : '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{slot.name}</span>
                    <span>{rundownMapByDate[targetDate]?.[slot.id]?.length || 0}條</span>
                  </button>
                ))}
              </div>
            </section>

            <div onMouseDown={startResizing('LEFT')} style={{ width: '6px', cursor: 'col-resize', backgroundColor: '#e2e8f0' }} />

            <section style={{ width: `${middleWidth}%`, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', overflow: 'hidden' }}>
              <div onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }} onDrop={(e) => handleDrop(e, currentRundown.length)} style={{ flex: 1.2, display: 'flex', flexDirection: 'column', borderBottom: '2px solid #e2e8f0', backgroundColor: isDraggingOver ? '#f0f9ff' : '#fff' }}>
                <div style={{ padding: '10px 14px', backgroundColor: isOverTime ? '#fef2f2' : '#e0f2fe', borderBottom: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: isOverTime ? '#dc2626' : '#0369a1', fontSize: '13px' }}>
                      ⏱️ 總時長：{rundownDuration.mins}分 {rundownDuration.secs}秒 
                      {isOverTime && <span style={{ marginLeft: '6px', color: '#dc2626' }}>⚠️ 超時！</span>}
                    </span>
                  </div>
                  <button onClick={insertBreak} style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>＋破口 ({Math.floor(defaultBreakSeconds/60)}分)</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                  {currentRundown.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '20px', border: '2px dashed #e2e8f0', padding: '20px', borderRadius: '8px' }}>
                      👇 此時段尚無排播新聞，請點擊文稿上方的「＋加入排播」或從右側拖拉至此！
                    </div>
                  ) : (
                    currentRundown.map((item, index) => {
                      const statusConfig = ITEM_STATUSES[item.playStatus || 'UNPLAYED'];
                      const isBreak = item.type === 'BREAK';

                      return (
                        <div
                          key={item.rundownItemId || index}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('source', 'RUNDOWN_ITEM');
                            e.dataTransfer.setData('rundownItem', JSON.stringify(item));
                          }}
                          onClick={() => !isBreak && setSelectedArticle(item)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 10px',
                            marginBottom: '6px',
                            borderRadius: '6px',
                            borderLeft: `5px solid ${isBreak ? '#f97316' : statusConfig.color}`,
                            backgroundColor: isBreak ? '#fff7ed' : '#fff',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ width: '20px', fontWeight: 'bold', color: '#0284c7', fontSize: '12px' }}>{index + 1}</span>
                          
                          <div style={{ flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 'bold' }}>
                            {item.title}
                          </div>

                          <div style={{ display: 'flex', gap: '2px', marginRight: '6px' }}>
                            <button onClick={(e) => moveItemUp(index, e)} title="往上一格" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', cursor: 'pointer' }}>▲</button>
                            <button onClick={(e) => moveItemDown(index, e)} title="往下一格" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', cursor: 'pointer' }}>▼</button>
                          </div>

                          <div style={{ display: 'flex', gap: '4px' }}>
                            {!isBreak && (
                              <button onClick={(e) => toggleStatus(item.rundownItemId, e)} style={{ padding: '2px 6px', backgroundColor: statusConfig.bg, color: statusConfig.color, border: 'none', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold' }}>
                                {statusConfig.label}
                              </button>
                            )}
                            {/* 💡 電腦版 Rundown 項目上也加上「🚫 抽稿」按鈕 */}
                            {!isBreak && (
                              <button onClick={(e) => handleDropItemFromRundown(item, e)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '3px', padding: '3px 6px', fontSize: '10px', fontWeight: 'bold' }} title="抽稿">🚫</button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); updateCurrentRundown(currentRundown.filter(i => i.rundownItemId !== item.rundownItemId)); }} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '10px' }}>✕</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ flex: 0.8, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 14px', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}>🎥 MAM 影音資產庫</div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  {mamVideoList.map((vid, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('mamVideo', JSON.stringify(vid))}
                      onClick={() => setPlayingVideo(vid)}
                      style={{ padding: '6px 10px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '4px', cursor: 'grab', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}
                    >
                      <span>🎬 {vid.filename}</span>
                      <span style={{ fontSize: '10px', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 4px', borderRadius: '3px' }}>播放 ↗</span>
                    </div>
                  ))}
                </div>
              </div>

            </section>

            <div onMouseDown={startResizing('MIDDLE')} style={{ width: '6px', cursor: 'col-resize', backgroundColor: '#e2e8f0' }} />

            <section style={{ width: `${rightWidth}%`, backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '12px' }}>
              <NewsEditor
                key={selectedArticle?.id || 'new_article'}
                initialArticle={selectedArticle}
                allArticles={articles}
                onSelectArticle={(art) => setSelectedArticle(art)}
                onSaveSuccess={handleSaveSuccess}
                onCreateNew={handleCreateNew}
                onRemoveFromRundownByItem={handleRemoveFromRundownByItem}
                onArticleStatusChange={handleArticleStatusChange}
              />
            </section>

          </div>
        )}

      </div>
    </div>
  );
}