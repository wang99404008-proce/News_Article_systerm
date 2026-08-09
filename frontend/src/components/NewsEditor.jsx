import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api/v1/articles`;

const getTodayString = () => new Date().toISOString().split('T')[0];

const NEWS_FORMATS = [
  { id: '', name: '-- 請選擇新聞格式 --' },
  { id: 'SOT', name: 'SOT (帶音影音稿)' },
  { id: 'VO', name: 'VO (旁白新聞)' },
  { id: 'VONS', name: 'VONS (旁白+現場音)' },
  { id: 'NS', name: 'NS (純現場音)' },
  { id: 'LIVE', name: 'LIVE (現場連線稿)' },
  { id: 'PKG', name: 'PKG (專題包裝稿)' },
  { id: 'INT', name: 'INT / BITE (純訪談片段)' },
  { id: 'CG', name: 'CG (全圖表新聞)' },
  { id: 'READ', name: 'READ (棚內純讀稿)' },
];

const SOT_TEMPLATE = `
<p>(記者名：陳怡臻) SLUG：化石館復古食1200-sot</p>
<p>台南左鎮是台灣化石研究的發源地，當地的左鎮化石園區，今年啟用新的故事館，結合社區，透過懷舊美食與竹藝玩具，吸引民眾來了解化石與當地的西拉雅族歷史！</p>
<p>(培)</p>
<p>&lt;</p>
<p>(*mac:化石館復古食1200.mov*)</p>
<p>/*SUPER:<br/>解說者｜段洪坤//<br/>我們若從14世紀來看//<br/>從這張圖//<br/>這4個是最主要的社<br/>*/</p>
<p>左鎮曾是西拉雅族重要聚集地，曾經的部落生活，互動遊戲能體驗，</p>
<p>/*SUPER1:<br/>你的動作要再大一點//<br/>你可以找標靶<br/>*/</p>
<p>/*SUPER:<br/>參觀者｜林同學//<br/>(有沒有更了解西拉雅) 有//<br/>就跟泰雅族和其他原住民//<br/>特色不一樣<br/>*/</p>
<p>左鎮的菜寮溪，不隻有西拉雅族，更有豐富化石，從化石挖掘者開始的探索之旅，在左鎮化石園區新啟用的故事館呈現！</p>
<p>/*SUPER:<br/>台南左鎮化石園區人員｜賴冠彥//<br/>陳春木先生作為左鎮//<br/>當地化石的發掘者//<br/>我們就是以他來做脈絡<br/>*/</p>
<p>當地挖出”早?中國犀牛”著名，成立7年的園區，結合社區推動懷舊食材，</p>
<p>/*SUPER1:<br/>讓牛奶去縮汁//<br/>然後持續攪拌<br/>*/</p>
<p>/*SUPER:<br/>大左鎮共榮發展協會常務理事｜黃彫棠//<br/>我們用很棒的原料//<br/>是葛鬱金粉以前叫做粉薯粉//<br/>現在年輕人研發新口味//<br/>讓小朋友接受度比較高<br/>*/</p>
<p>軟糯雪花薯，食材之一的葛鬱金粉，曾是當地家戶必備，</p>
<p>/*SUPER:<br/>民眾｜江美華//<br/>小時候都是水滾下去攪拌//<br/>滿懷念 這次叫我女兒//<br/>幫我採一些 帶回台北種<br/>*/</p>
<p>復刻早期記憶的還有竹製小青蛙，</p>
<p>Ns 玩青蛙</p>
<p>簡單的竹工藝，卻讓祖孫一同歡樂，用笑聲打破時空藩籬！</p>
<p>/*REPORT:<br/>台南報導//<br/>陳怡臻 王昭中<br/>*/</p>
<p>&gt;</p>
<p>台南 陳怡臻</p>
`;

export default function NewsEditor({ initialArticle, allArticles = [], onSelectArticle, onSaveSuccess, onCreateNew, onRemoveFromRundownByItem, onArticleStatusChange }) {
  const [activeTab, setActiveTab] = useState('WRITE');
  const [isDropTarget, setIsDropTarget] = useState(false);

  const [title, setTitle] = useState(initialArticle?.title || '');
  const [airDate, setAirDate] = useState(initialArticle?.airDate || getTodayString());
  const [newsFormat, setNewsFormat] = useState(initialArticle?.newsFormat || 'SOT');
  const [reviewStatus, setReviewStatus] = useState(initialArticle?.reviewStatus || 'PENDING');
  const [reviewer, setReviewer] = useState(initialArticle?.reviewer || '');

  const [saveStatus, setSaveStatus] = useState('即時暫存中');
  const [articleStatus, setArticleStatus] = useState(initialArticle?.status || 'DRAFT');
  const [articleId, setArticleId] = useState(initialArticle?.id || null);
  const [selectedText, setSelectedText] = useState('');
  const [commentCount, setCommentCount] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const [errors, setErrors] = useState({});

  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ inline: true, allowBase64: true })],
    content: initialArticle?.contentHtml || '',
    onUpdate: ({ editor }) => {
      const currentHtml = editor.getHTML();
      const localData = {
        title,
        contentHtml: currentHtml,
        airDate,
        newsFormat,
        reviewer,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`news_draft_temp_${articleId || 'new'}`, JSON.stringify(localData));
      setSaveStatus(`⚡ 本地暫存已更新 (${new Date().toLocaleTimeString()})`);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ');
      setSelectedText(text.trim());
    },
  });

  const handleEditorDrop = (e) => {
    e.preventDefault();
    const videoData = e.dataTransfer.getData('mamVideo');
    if (videoData && editor) {
      try {
        const video = JSON.parse(videoData);
        const realDuration = video.duration || 30;
        const videoTag = `<p style="background: #e0f2fe; color: #0369a1; padding: 6px 10px; border-radius: 6px; font-weight: bold; border: 1px solid #bae6fd; display: inline-block; margin: 6px 0;">🎬 [影音素材] ${video.filename} (長度: ${realDuration}s)</p>`;
        editor.chain().focus().insertContent(videoTag).run();
      } catch (err) {
        console.error('解析拖入影片失敗:', err);
      }
    }
  };

  useEffect(() => {
    if (!editor) return;
    const handleEditorClick = (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        const src = e.target.getAttribute('src');
        if (src) setPreviewImageUrl(src);
      }
    };
    const editorDom = editor.view.dom;
    editorDom.addEventListener('click', handleEditorClick);
    return () => editorDom.removeEventListener('click', handleEditorClick);
  }, [editor]);

  useEffect(() => {
    if (initialArticle) {
      setArticleId(initialArticle.id);
      setTitle(initialArticle.title || '');
      setAirDate(initialArticle.airDate || getTodayString());
      setNewsFormat(initialArticle.newsFormat || 'SOT');
      setReviewStatus(initialArticle.reviewStatus || 'PENDING');
      setReviewer(initialArticle.reviewer || '');
      setArticleStatus(initialArticle.status || 'DRAFT');
    } else {
      setArticleId(null);
      setTitle('');
      setAirDate(getTodayString());
      setNewsFormat('SOT');
      setReviewer('');
      setArticleStatus('DRAFT');
    }
    setErrors({});
  }, [initialArticle]);

  useEffect(() => {
    if (!editor) return;
    if (initialArticle) {
      editor.commands.setContent(initialArticle.contentHtml || '');
    } else {
      editor.commands.setContent('');
    }
  }, [editor, initialArticle]);

  const handleSlugClickToEdit = (article) => {
    if (onSelectArticle) onSelectArticle(article);
    setActiveTab('WRITE');
  };

  const handleDeleteArticle = async (e, id, artTitle) => {
    e.stopPropagation();
    if (!window.confirm(`確定要刪除新聞「${artTitle || '無標題新聞'}」嗎？`)) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        if (articleId === id && onCreateNew) onCreateNew();
        window.location.reload();
      }
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleLibraryDragStart = (e, article) => {
    e.dataTransfer.setData('source', 'LIBRARY');
    e.dataTransfer.setData('article', JSON.stringify(article));
  };

  const handleCurrentArticleDragStart = (e) => {
    const currentArticlePayload = {
      id: articleId || `temp_${Date.now()}`,
      title: title || '（無標題新聞）',
      contentHtml: editor ? editor.getHTML() : '',
      airDate,
      newsFormat,
      reviewStatus,
      reviewer,
      status: articleStatus
    };
    e.dataTransfer.setData('source', 'LIBRARY');
    e.dataTransfer.setData('article', JSON.stringify(currentArticlePayload));
  };

  const handleDropToDroppedTab = async (e) => {
    e.preventDefault();
    setIsDropTarget(false);
    const source = e.dataTransfer.getData('source');
    if (source === 'RUNDOWN_ITEM') {
      const rundownItemData = e.dataTransfer.getData('rundownItem');
      if (rundownItemData) {
        const item = JSON.parse(rundownItemData);
        if (onRemoveFromRundownByItem) onRemoveFromRundownByItem(item.rundownItemId);
        if (onSaveSuccess) onSaveSuccess({ ...item, status: 'DROPPED' });
        if (onArticleStatusChange) onArticleStatusChange(item.id, 'DROPPED');
        alert(`🚫 新聞已歸類至【抽稿區】！`);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = '請填寫新聞標題！';
    if (reviewStatus !== 'APPROVED' && !reviewer.trim()) {
      newErrors.reviewer = '請填寫審稿者姓名！';
    }
    if (!newsFormat) newErrors.newsFormat = '請選擇新聞格式！';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      alert('⚠️ 請補齊必填資訊！');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async (customReviewStatus = null, customHtml = null, customStatus = null) => {
    if (!validateForm()) return;
    const targetReviewStatus = customReviewStatus || reviewStatus;
    const targetStatus = customStatus || articleStatus;

    try {
      setSaveStatus('資料庫儲存中...');
      const htmlContent = customHtml || (editor ? editor.getHTML() : '');
      const payload = { title, contentHtml: htmlContent, airDate, newsFormat, reviewStatus: targetReviewStatus, reviewer: reviewer.trim(), status: targetStatus };

      const res = articleId 
        ? await fetch(`${API_URL}/${articleId}/draft`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      const json = await res.json();
      if (json.success) {
        setArticleId(json.data.id);
        setReviewStatus(targetReviewStatus);
        setArticleStatus(targetStatus);
        setSaveStatus(`已儲存 (${new Date().toLocaleTimeString()})`);
        if (onSaveSuccess) onSaveSuccess(json.data);
      }
    } catch (err) {
      alert('無法連線至伺服器');
    }
  };

  const handleApprove = () => {
    if (!validateForm()) return;
    setReviewStatus('APPROVED');
    let newHtml = editor ? editor.getHTML() : '';
    const reviewerTag = `<p style="color: #0284c7; font-weight: bold;">/*REVIEW: 審稿者｜${reviewer.trim()}//*/</p>`;
    if (editor && !newHtml.includes('/*REVIEW:')) {
      newHtml = reviewerTag + newHtml;
      editor.commands.setContent(newHtml);
    }
    handleSaveDraft('APPROVED', newHtml, 'DRAFT');
    setActiveTab('PLAYED');
    alert(`✅ 新聞已審核通過！`);
  };

  const handleSetDropped = () => {
    if (!window.confirm('確定要將新聞移至【抽稿區】嗎？')) return;
    setArticleStatus('DROPPED');
    handleSaveDraft(reviewStatus, null, 'DROPPED');
    if (articleId && onArticleStatusChange) onArticleStatusChange(articleId, 'DROPPED');
    setActiveTab('DROPPED');
  };

  const handlePublish = async () => {
    if (!validateForm()) return;
    try {
      const htmlContent = editor.getHTML();
      const payload = { title, contentHtml: htmlContent, airDate, newsFormat, reviewer, status: 'PUBLISHED' };
      const res = await fetch(`${API_URL}/${articleId || ''}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        setArticleStatus('PUBLISHED');
        setReviewStatus('APPROVED');
        setActiveTab('PLAYED');
        alert('🎉 新聞已正式發布！');
        if (onSaveSuccess) onSaveSuccess(json.data);
      }
    } catch (err) {
      alert('發布失敗');
    }
  };

  const addImage = useCallback(() => {
    const url = window.prompt('請輸入新聞圖片網址 (URL)：');
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const toFullWidthNum = (num) => String(num).replace(/[0-9]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0xfee0));

  const annotateToFooterOnly = useCallback(() => {
    if (!editor || !selectedText) return;
    const fullNum = toFullWidthNum(commentCount);
    const htmlContent = editor.getHTML();
    const hasCommentSection = htmlContent.includes('註解區');
    let appendHTML = !hasCommentSection ? `<br/><p style="margin: 15px 0 4px 0; font-weight: bold; color: #0f172a;">註解區</p>` : '';
    appendHTML += `<p style="margin: 0; padding: 2px 0; line-height: 1.4; color: #334155;">${fullNum}．【${selectedText}】<span style="color: #64748b;">（請在此輸入解釋說明...）</span></p>`;
    editor.chain().focus('end').insertContent(appendHTML).run();
    setCommentCount((prev) => prev + 1);
    setSelectedText('');
  }, [editor, selectedText, commentCount]);

  const handleLoadSotTemplate = () => {
    if (!editor) return;
    if (editor.getText().trim().length > 0 && !window.confirm('確定要載入「電視新聞 SOT 範本」嗎？現有內容將被覆蓋！')) return;
    editor.commands.setContent(SOT_TEMPLATE);
    setTitle('化石館復古食1200-sot');
    setNewsFormat('SOT');
  };

  const reviewArticles = allArticles.filter(a => a.status !== 'DROPPED' && a.reviewStatus !== 'APPROVED' && a.status !== 'PUBLISHED');
  const playedArticles = allArticles.filter(a => a.status !== 'DROPPED' && (a.reviewStatus === 'APPROVED' || a.status === 'PUBLISHED'));
  const droppedArticles = allArticles.filter(a => a.status === 'DROPPED');
  const filteredSearchArticles = allArticles.filter(a => (a.title || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ maxWidth: '100%', fontFamily: 'sans-serif', backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative' }}>
      
      <style>{`
        .ProseMirror img {
          max-width: 220px !important;
          max-height: 120px !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
          border-radius: 6px !important;
          border: 2px solid #cbd5e1 !important;
          background-color: #0f172a !important;
          margin: 6px 8px !important;
          display: inline-block !important;
          vertical-align: middle !important;
          cursor: zoom-in !important;
          transition: all 0.2s ease-in-out !important;
        }
        .ProseMirror img:hover { transform: scale(1.03); border-color: #0284c7; }
      `}</style>

      {previewImageUrl && (
        <div onClick={() => setPreviewImageUrl(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: '#ffffff', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px' }}>✕ 關閉預覽</div>
          <div style={{ maxWidth: '90vw', maxHeight: '85vh', backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', border: '2px solid #38bdf8' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImageUrl} alt="預覽" style={{ maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain', display: 'block' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', marginBottom: '14px', flexWrap: 'wrap', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setActiveTab('WRITE')} style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 'bold', border: 'none', borderBottom: activeTab === 'WRITE' ? '3px solid #0284c7' : '3px solid transparent', backgroundColor: activeTab === 'WRITE' ? '#f0f9ff' : 'transparent', color: activeTab === 'WRITE' ? '#0284c7' : '#64748b', cursor: 'pointer' }}>✍️ 編輯區</button>
          <button onClick={() => setActiveTab('REVIEW')} style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 'bold', border: 'none', borderBottom: activeTab === 'REVIEW' ? '3px solid #ea580c' : '3px solid transparent', backgroundColor: activeTab === 'REVIEW' ? '#fff7ed' : 'transparent', color: activeTab === 'REVIEW' ? '#ea580c' : '#64748b', cursor: 'pointer' }}>⏳ 待審稿 ({reviewArticles.length})</button>
          <button onClick={() => setActiveTab('PLAYED')} style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 'bold', border: 'none', borderBottom: activeTab === 'PLAYED' ? '3px solid #16a34a' : '3px solid transparent', backgroundColor: activeTab === 'PLAYED' ? '#f0fdf4' : 'transparent', color: activeTab === 'PLAYED' ? '#16a34a' : '#64748b', cursor: 'pointer' }}>✅ 已審/已播 ({playedArticles.length})</button>
          <button onClick={() => setActiveTab('DROPPED')} style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 'bold', border: 'none', borderBottom: activeTab === 'DROPPED' ? '3px solid #dc2626' : '3px solid transparent', backgroundColor: activeTab === 'DROPPED' ? '#fef2f2' : 'transparent', color: activeTab === 'DROPPED' ? '#dc2626' : '#64748b', cursor: 'pointer' }}>🚫 抽稿 ({droppedArticles.length})</button>
          <button onClick={() => setActiveTab('SEARCH')} style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 'bold', border: 'none', borderBottom: activeTab === 'SEARCH' ? '3px solid #334155' : '3px solid transparent', backgroundColor: activeTab === 'SEARCH' ? '#f1f5f9' : 'transparent', color: activeTab === 'SEARCH' ? '#334155' : '#64748b', cursor: 'pointer' }}>🔍 稿件庫</button>
        </div>
        {onCreateNew && <button onClick={() => { onCreateNew(); setActiveTab('WRITE'); }} style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>➕ 開新稿</button>}
      </div>

      {activeTab === 'WRITE' && (
        <div>
          <div draggable onDragStart={handleCurrentArticleDragStart} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', cursor: 'grab', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 'bold' }}>🖐️ 編輯：{title || '新草稿'}</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              
              {/* 💡 點擊加入排播按鈕：自動解除抽稿並加入 Rundown */}
              <button 
                onClick={() => {
                  if (!articleId) {
                    alert('⚠️ 請先點擊「存檔」產生稿件編號後，才能加入 Rundown！');
                    return;
                  }

                  const targetNewStatus = articleStatus === 'DROPPED' ? 'DRAFT' : articleStatus;
                  setArticleStatus(targetNewStatus);
                  if (onArticleStatusChange && articleId) {
                    onArticleStatusChange(articleId, targetNewStatus);
                  }

                  const currentArticlePayload = {
                    id: articleId,
                    title: title || '（無標題新聞）',
                    contentHtml: editor ? editor.getHTML() : '',
                    airDate,
                    newsFormat,
                    reviewStatus,
                    reviewer,
                    status: targetNewStatus,
                    rundownItemId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    playStatus: 'UNPLAYED',
                    type: 'NEWS'
                  };

                  if (window.handleDirectAddToRundown) {
                    window.handleDirectAddToRundown(currentArticlePayload);
                  } else {
                    alert('✅ 稿件已成功加入排播！');
                  }
                }} 
                style={{ padding: '5px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ＋加入排播
              </button>

              <button onClick={handleSetDropped} style={{ padding: '5px 10px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>🚫 抽稿</button>
              <button onClick={handleApprove} style={{ padding: '5px 10px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>✅ 通過審稿</button>
              <button onClick={() => handleSaveDraft()} style={{ padding: '5px 10px', backgroundColor: '#334155', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>💾 存檔</button>
              <button onClick={handlePublish} style={{ padding: '5px 10px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>🚀 發布</button>
            </div>
          </div>

          <input type="text" placeholder="請輸入新聞標題 (Slug)..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '18px', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '12px', boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="審稿者" value={reviewer} onChange={(e) => setReviewer(e.target.value)} style={{ padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '110px' }} />
            <select value={newsFormat} onChange={(e) => setNewsFormat(e.target.value)} style={{ padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              {NEWS_FORMATS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input type="date" value={airDate} onChange={(e) => setAirDate(e.target.value)} style={{ padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>

          <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '6px 6px 0 0', display: 'flex', gap: '8px', border: '1px solid #cbd5e1', borderBottom: 'none', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={addImage} style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>📷 插入圖片</button>
            {selectedText && <button onClick={annotateToFooterOnly} style={{ padding: '4px 10px', backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>➕ 加入註解</button>}
            <button onClick={handleLoadSotTemplate} style={{ padding: '4px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>📺 載入 SOT 範本</button>
          </div>

          <div onDragOver={(e) => e.preventDefault()} onDrop={handleEditorDrop}>
            <EditorContent editor={editor} style={{ border: '1px solid #cbd5e1', borderRadius: '0 0 6px 6px', padding: '16px', minHeight: '380px', backgroundColor: '#fff', lineHeight: '1.6' }} />
          </div>
        </div>
      )}

      {activeTab === 'REVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {reviewArticles.length === 0 ? <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>⏳ 目前無待審核稿件</div> : reviewArticles.map(art => (
            <div key={art.id} draggable onDragStart={(e) => handleLibraryDragStart(e, art)} onClick={() => handleSlugClickToEdit(art)} style={{ padding: '10px 14px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', cursor: 'grab', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🖐️ {art.title} ({art.newsFormat})</span>
              <button onClick={(e) => handleDeleteArticle(e, art.id, art.title)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>刪除</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'PLAYED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {playedArticles.length === 0 ? <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>✅ 目前無已審/已播稿件</div> : playedArticles.map(art => (
            <div key={art.id} draggable onDragStart={(e) => handleLibraryDragStart(e, art)} onClick={() => handleSlugClickToEdit(art)} style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'grab', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>✅ {art.title} ({art.newsFormat})</span>
              <button onClick={(e) => handleDeleteArticle(e, art.id, art.title)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>刪除</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'DROPPED' && (
        <div onDragOver={(e) => { e.preventDefault(); setIsDropTarget(true); }} onDrop={handleDropToDroppedTab} style={{ minHeight: '300px', padding: '10px', border: isDropTarget ? '2px dashed red' : '1px solid transparent' }}>
          <div style={{ color: 'red', fontSize: '12px', marginBottom: '8px' }}>🚫 拖曳 Rundown 抽稿項目至此回收：</div>
          {droppedArticles.map(art => (
            <div key={art.id} draggable onDragStart={(e) => handleLibraryDragStart(e, art)} onClick={() => handleSlugClickToEdit(art)} style={{ padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', marginBottom: '6px', cursor: 'grab' }}>
              🚫 {art.title}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'SEARCH' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="搜尋全部稿件標題..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
            {filteredSearchArticles.map(art => (
              <div key={art.id} onClick={() => handleSlugClickToEdit(art)} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>{art.title}</span>
                <span style={{ fontSize: '11px', color: '#0284c7' }}>{art.newsFormat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}