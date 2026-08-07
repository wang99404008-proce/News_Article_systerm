import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3000/api/v1/articles';

export default function ArticleList({ onSelectArticle, onCreateNew }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. 載入所有文章
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const json = await res.json();
      if (json.success) {
        setArticles(json.data);
      }
    } catch (err) {
      console.error('載入文章列表失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // 2. 處理刪除文章邏輯
  const handleDeleteArticle = async (id, title) => {
    // 彈出防呆二次確認視窗
    const isConfirmed = window.confirm(`確定要刪除「${title || '無標題文章'}」嗎？\n此動作無法復原！`);
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (json.success) {
        // 刪除成功後，直接從前端 State 中移除該文章，不用重新整頁重新載入
        setArticles((prev) => prev.filter((art) => art.id !== id));
      } else {
        alert('刪除失敗：' + json.message);
      }
    } catch (err) {
      console.error('刪除請求發送失敗:', err);
      alert('刪除失敗，請確認後端 Server 是否正常運作');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📰 新聞文稿清單</h2>
        <button
          onClick={onCreateNew}
          style={{
            padding: '10px 18px',
            backgroundColor: '#2e7d32',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          ➕ 撰寫新文章
        </button>
      </div>

      {loading ? (
        <div>載入中...</div>
      ) : articles.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px', color: '#666' }}>
          目前還沒有任何文章，點擊右上角新增第一篇吧！
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {articles.map((art) => (
            <div
              key={art.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '16px 20px',
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ flex: 1, paddingRight: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#fff',
                      backgroundColor: art.status === 'PUBLISHED' ? '#2e7d32' : '#ed6c02'
                    }}
                  >
                    {art.status === 'PUBLISHED' ? '已發布' : '草稿'}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
                    {art.title || '（無標題文章）'}
                  </h3>
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                  作者：{art.author?.name || '匿名'} ｜ 最後更新時間：{new Date(art.updatedAt).toLocaleString()}
                </div>
              </div>

              {/* 右側按鈕區域：包含 編輯與刪除 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onSelectArticle(art)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ✏️ 編輯
                </button>
                <button
                  onClick={() => handleDeleteArticle(art.id, art.title)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#d32f2f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🗑️ 刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}