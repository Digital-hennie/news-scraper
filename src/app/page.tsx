'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Printer, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Newspaper,
  HelpCircle,
  Coffee,
  X
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  subheading?: string | null;
  content: string;
  image: string | null;
  url: string;
  source?: string;
  published?: string;
}

const decodeHtml = (html: string) => {
  if (!html) return '';
  return html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
};

export default function Home() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `신문스크랩_페이지_${currentPage + 1}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        * {
          font-family: 'Nanum Myeongjo', 'Batang', serif !important;
        }
      }
    `,
  });

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '스크랩에 실패했습니다.');

      data.title = decodeHtml(data.title);
      if (data.subheading) data.subheading = decodeHtml(data.subheading);
      data.content = decodeHtml(data.content);

      setArticles((prev) => [...prev, data]);
      setUrlInput('');
    } catch (err: any) {
      alert(err.message || '기사를 가져오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setArticles((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === articles.length - 1) return;
    setArticles((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const removeArticle = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  const handleContentEdit = (id: string, field: 'title' | 'subheading' | 'content', value: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  // 1페이지당 기사 최대 4개 수용 분할 알고리즘
  const pages: Article[][] = useMemo(() => {
    if (articles.length === 0) return [];

    const result: Article[][] = [];
    let currentBatch: Article[] = [];
    let currentScore = 0;

    const PAGE_CAPACITY = 3600; // 4개 수용을 위해 용량 확대
    const SINGLE_ARTICLE_THRESHOLD = 2600;

    for (let i = 0; i < articles.length; i++) {
      const art = articles[i];
      const plainText = art.content.replace(/<[^>]+>/g, '');
      const score = plainText.length + (art.image ? 150 : 0) + ((art.subheading?.length || 0) * 1.0);

      if (score >= SINGLE_ARTICLE_THRESHOLD) {
        if (currentBatch.length > 0) {
          result.push(currentBatch);
          currentBatch = [];
          currentScore = 0;
        }
        result.push([art]);
        continue;
      }

      // 최대 4개까지 한 페이지에 수용
      if (
        (currentScore + score > PAGE_CAPACITY && currentBatch.length >= 2) ||
        currentBatch.length >= 4
      ) {
        result.push(currentBatch);
        currentBatch = [art];
        currentScore = score;
      } else {
        currentBatch.push(art);
        currentScore += score;
      }
    }

    if (currentBatch.length > 0) {
      result.push(currentBatch);
    }

    return result;
  }, [articles]);

  const safeCurrentPage = Math.min(currentPage, Math.max(0, pages.length - 1));
  const activePageArticles = pages[safeCurrentPage] || [];

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-6 px-4 font-sans relative">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap');

        .newspaper-font {
          font-family: 'Nanum Myeongjo', 'Batang', serif !important;
          letter-spacing: -0.025em;
        }

        .newspaper-text p {
          text-indent: 0.85em;
          margin-bottom: 0.24em;
          text-align: justify;
          word-break: keep-all;
          overflow-wrap: break-word;
        }

        .newspaper-text h3 {
          display: block;
          width: 100%;
          font-weight: 800;
          margin-top: 0.4em;
          margin-bottom: 0.15em;
          color: #0f172a;
          line-height: 1.25;
          font-size: 0.86em;
          text-indent: 0 !important;
          text-align: left !important;
          break-after: avoid;
        }
      `}</style>

      {/* 헤더 바 */}
      <header className="w-full max-w-7xl mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-neutral-200">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-neutral-800" />
          <h1 className="text-lg font-bold text-neutral-800">신문 기사 아카이브 및 A4조판 서비스 페이지 @Digital-Hennie</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 bg-neutral-100 text-neutral-700 border border-neutral-300 px-3 py-2 rounded-lg hover:bg-neutral-200 transition-colors shadow-sm font-medium text-xs cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-neutral-600" />
            <span>이용방법 안내</span>
          </button>

          <button
            onClick={() => setShowCoffeeModal(true)}
            className="flex items-center gap-1.5 bg-amber-400 text-amber-950 font-bold px-3 py-2 rounded-lg hover:bg-amber-500 transition-colors shadow-sm text-xs cursor-pointer"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-950" />
            <span>개발자 커피 후원</span>
          </button>

          <button
            onClick={() => handlePrint()}
            disabled={activePageArticles.length === 0}
            className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 disabled:bg-neutral-300 transition-colors shadow-sm font-medium text-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>현재 페이지 PDF 인쇄/저장</span>
          </button>
        </div>
      </header>

      {/* 이용방법 안내 모달 */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-neutral-900">서비스 이용안내 및 주의사항</h2>
              </div>
              <button onClick={() => setShowGuideModal(false)} className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs leading-relaxed text-neutral-600">
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5">
                <p className="font-bold text-neutral-900 mb-1">📌 비상업적 개인 프로젝트 안내</p>
                <p>본 서비스는 <strong>Digital-Hennie</strong>가 자발적으로 만든 <strong>비상업적 조판 도구</strong>입니다. 마음껏 이용하시되 상업적으로 이용하지 말아주세요.</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-blue-900">
                <p className="font-bold mb-1">💡 기사 본문 불러오기 오류 팁</p>
                <p>일부 언론사의 경우 보안 정책으로 본문 스크랩이 원활하지 않을 수 있습니다. 이때는 <strong>'네이버 뉴스'</strong> 검색 결과 링크를 통해 불러오시면 안정적으로 등록됩니다.</p>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-amber-900">
                <p className="font-bold mb-1">💬 의견 및 개선 아이디어</p>
                <p>이용하시면서 더 좋은 개선 아이디어나 의견이 생기면 언제든 메일로 연락해 주세요.</p>
                <p className="font-semibold mt-1">📧 <a href="mailto:artmk@naver.com" className="underline">artmk@naver.com</a></p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 개발자 커피 후원 모달 */}
      {showCoffeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 text-center">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-neutral-900 flex items-center gap-1.5 text-sm">
                <Coffee className="w-4 h-4 text-amber-500" />
                개발자에게 커피 한 잔 후원하기
              </h3>
              <button onClick={() => setShowCoffeeModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
              더 나은 서비스 개발과 지속적인 서버 유지 관리에 큰 힘이 됩니다. 감사합니다! ☕
            </p>

            <div className="flex justify-center mb-4">
              <div className="p-2 border border-neutral-200 rounded-xl bg-neutral-50 shadow-inner">
                <img
                  src="/kakaopay-qr.png"
                  alt="카카오페이 후원 QR코드"
                  className="w-48 h-48 object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-48 h-48 flex items-center justify-center text-xs text-neutral-400 text-center p-2">public/kakaopay-qr.png<br/>이미지를 확인해주세요</div>';
                    }
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setShowCoffeeModal(false)}
              className="w-full bg-neutral-900 text-white py-2 rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 작업 영역 */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 좌측 패널 */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <form onSubmit={handleAddArticle} className="bg-white p-3 rounded-xl shadow-sm border border-neutral-200 flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-neutral-500 tracking-wide uppercase">신문 기사 URL 추가</label>
            <div className="flex gap-2">
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://news.naver.com/..."
                className="flex-1 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:bg-neutral-300 flex items-center gap-1"
              >
                {loading ? '추출중...' : <><Plus className="w-3.5 h-3.5" /> 추가</>}
              </button>
            </div>
          </form>

          <div className="bg-white p-3 rounded-xl shadow-sm border border-neutral-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-semibold text-neutral-500 tracking-wide uppercase">
                스크랩 목록 ({articles.length}개)
              </span>
              <span className="text-[10px] text-neutral-400">위/아래 이동으로 순서 조정</span>
            </div>

            {articles.length === 0 ? (
              <div className="text-center py-6 text-neutral-400 text-xs border border-dashed border-neutral-200 rounded-lg">
                기사 URL을 입력해 추가해주세요.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto pr-1">
                {articles.map((art, idx) => {
                  const plain = art.content.replace(/<[^>]+>/g, '');
                  return (
                    <div
                      key={art.id}
                      className="p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 flex items-center justify-between gap-2 text-xs hover:border-neutral-300 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-800 truncate">{art.title}</p>
                        <span className="text-[10px] text-blue-600 font-medium">{plain.length}자 {art.image ? '· 사진' : ''} {art.subheading ? '· 부제' : ''}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30"
                          title="위로 이동"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          disabled={idx === articles.length - 1}
                          className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30"
                          title="아래로 이동"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeArticle(art.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 우측: A4 뷰어 */}
        <div className="lg:col-span-8 flex flex-col items-center gap-3">
          <div className="w-full flex justify-center overflow-x-auto p-1">
            <div
              ref={printRef}
              className="newspaper-font bg-white shadow-2xl border border-neutral-300 print:border-none print:shadow-none box-border flex flex-col justify-between"
              style={{
                width: '210mm',
                height: '297mm',
                minWidth: '210mm',
                minHeight: '297mm',
                padding: '8mm 10mm',
              }}
            >
              {/* 마스트헤드 */}
              <div className="border-b border-neutral-900 pb-0.5 mb-1 flex items-baseline gap-2">
                <h2 className="text-xs font-black tracking-tight text-neutral-900 newspaper-font">NEWS ARCHIVE</h2>
                <span className="text-[8px] text-neutral-400">|</span>
                <p className="text-[8px] text-neutral-500">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              {/* 기사 렌더링 컨테이너 */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {activePageArticles.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-neutral-300 newspaper-font text-xs">
                    배치된 기사가 없습니다.
                  </div>
                ) : (
                  <div className="h-full w-full flex flex-col gap-2 overflow-hidden">
                    {/* [CASE 4] 기사가 4개일 때: 2x2 격자 조판 */}
                    {activePageArticles.length === 4 ? (
                      <div className="grid grid-cols-2 grid-rows-2 gap-2.5 h-full overflow-hidden min-h-0">
                        {activePageArticles.map((art) => {
                          const formattedDate = formatShortDate(art.published);
                          return (
                            <article key={art.id} className="flex flex-col border-b border-r last:border-b-0 odd:border-r border-neutral-200 pb-1 pr-1 overflow-hidden min-h-0">
                              <div className="flex items-baseline gap-1 mb-0.5 flex-wrap">
                                <h3
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleContentEdit(art.id, 'title', e.currentTarget.innerText)}
                                  className="newspaper-font font-bold text-neutral-950 leading-tight outline-none focus:bg-neutral-50 tracking-tight inline text-[0.80rem]"
                                >
                                  {art.title}
                                </h3>
                                {formattedDate && (
                                  <span className="text-[7px] text-neutral-500 font-normal newspaper-font">
                                    ({formattedDate})
                                  </span>
                                )}
                              </div>

                              {art.subheading && (
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleContentEdit(art.id, 'subheading', e.currentTarget.innerText)}
                                  className="newspaper-font font-semibold text-neutral-700 bg-neutral-50 border-l-2 border-neutral-400 px-1 py-0.5 mb-1 outline-none focus:bg-neutral-100 whitespace-pre-line tracking-tight text-[0.65rem] leading-tight"
                                >
                                  {art.subheading}
                                </div>
                              )}

                              <div className="newspaper-font newspaper-text flex-1 text-neutral-800 outline-none focus:bg-neutral-50 overflow-hidden text-[0.67rem] leading-[1.38]">
                                {art.image && (
                                  <div className="float-right ml-1.5 mb-1 p-0.5 border border-neutral-200 bg-white max-w-[70px]">
                                    <img
                                      src={art.image}
                                      alt="기사 사진"
                                      className="w-full h-auto object-contain block max-h-20"
                                    />
                                  </div>
                                )}
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleContentEdit(art.id, 'content', e.currentTarget.innerHTML)}
                                  dangerouslySetInnerHTML={{ __html: art.content }}
                                />
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : activePageArticles.length === 3 ? (
                      /* [CASE 3] 기사가 3개일 때: 상단 2개 + 하단 1개 */
                      <>
                        <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden min-h-0 border-b border-neutral-300 pb-2">
                          {activePageArticles.slice(0, 2).map((art) => {
                            const formattedDate = formatShortDate(art.published);
                            return (
                              <article key={art.id} className="flex flex-col overflow-hidden min-h-0">
                                <div className="flex items-baseline gap-1 mb-0.5 flex-wrap">
                                  <h3
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => handleContentEdit(art.id, 'title', e.currentTarget.innerText)}
                                    className="newspaper-font font-bold text-neutral-950 leading-tight outline-none focus:bg-neutral-50 tracking-tight inline text-[0.85rem]"
                                  >
                                    {art.title}
                                  </h3>
                                  {formattedDate && (
                                    <span className="text-[7.5px] text-neutral-500 font-normal newspaper-font">
                                      ({formattedDate})
                                    </span>
                                  )}
                                </div>

                                {art.subheading && (
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => handleContentEdit(art.id, 'subheading', e.currentTarget.innerText)}
                                    className="newspaper-font font-semibold text-neutral-700 bg-neutral-50 border-l-2 border-neutral-500 px-1.5 py-0.5 mb-1 outline-none focus:bg-neutral-100 whitespace-pre-line tracking-tight text-[0.67rem] leading-snug"
                                  >
                                    {art.subheading}
                                  </div>
                                )}

                                <div className="newspaper-font newspaper-text flex-1 text-neutral-800 outline-none focus:bg-neutral-50 overflow-hidden text-[0.70rem] leading-[1.40]">
                                  {art.image && (
                                    <div className="float-right ml-2 mb-1 p-0.5 border border-neutral-200 bg-white max-w-[80px]">
                                      <img
                                        src={art.image}
                                        alt="기사 사진"
                                        className="w-full h-auto object-contain block max-h-24"
                                      />
                                    </div>
                                  )}
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => handleContentEdit(art.id, 'content', e.currentTarget.innerHTML)}
                                    dangerouslySetInnerHTML={{ __html: art.content }}
                                  />
                                </div>
                              </article>
                            );
                          })}
                        </div>

                        {/* 하단 3번째 기사 */}
                        {activePageArticles[2] && (() => {
                          const art = activePageArticles[2];
                          const formattedDate = formatShortDate(art.published);
                          return (
                            <article key={art.id} className="flex flex-col flex-1 overflow-hidden min-h-0 pt-0.5">
                              <div className="flex items-baseline gap-1 mb-0.5 flex-wrap">
                                <h3
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleContentEdit(art.id, 'title', e.currentTarget.innerText)}
                                  className="newspaper-font font-bold text-neutral-950 leading-tight outline-none focus:bg-neutral-50 tracking-tight inline text-[0.88rem]"
                                >
                                  {art.title}
                                </h3>
                                {formattedDate && (
                                  <span className="text-[7.5px] text-neutral-500 font-normal newspaper-font">
                                    ({formattedDate})
                                  </span>
                                )}
                              </div>

                              {art.subheading && (
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleContentEdit(art.id, 'subheading', e.currentTarget.innerText)}
                                  className="newspaper-font font-semibold text-neutral-700 bg-neutral-50 border-l-2 border-neutral-500 px-1.5 py-0.5 mb-1 outline-none focus:bg-neutral-100 whitespace-pre-line tracking-tight text-[0.68rem] leading-snug"
                                >
                                  {art.subheading}
                                </div>
                              )}

                              <div className="newspaper-font newspaper-text flex-1 columns-2 gap-3 text-neutral-800 outline-none focus:bg-neutral-50 overflow-hidden text-[0.71rem] leading-[1.42]">
                                {art.image && (
                                  <div className="float-right ml-2 mb-1 p-0.5 border border-neutral-200 bg-white max-w-[85px]">
                                    <img
                                      src={art.image}
                                      alt="기사 사진"
                                      className="w-full h-auto object-contain block max-h-24"
                                    />
                                  </div>
                                )}
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleContentEdit(art.id, 'content', e.currentTarget.innerHTML)}
                                  dangerouslySetInnerHTML={{ __html: art.content }}
                                />
                              </div>
                            </article>
                          );
                        })()}
                      </>
                    ) : (
                      /* [CASE 1, 2] 기사가 1개 또는 2개일 때 */
                      activePageArticles.map((art) => {
                        const count = activePageArticles.length;
                        const formattedDate = formatShortDate(art.published);
                        const fontSize = count === 1 ? '0.78rem' : '0.73rem';
                        const lineHeight = count === 1 ? '1.55' : '1.45';
                        const titleSize = count === 1 ? '1.20rem' : '1.02rem';

                        return (
                          <article
                            key={art.id}
                            className="flex flex-col flex-1 border-b border-neutral-300 pb-2 last:border-b-0 overflow-hidden min-h-0"
                          >
                            <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                              <h3
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => handleContentEdit(art.id, 'title', e.currentTarget.innerText)}
                                className="newspaper-font font-bold text-neutral-950 leading-snug outline-none focus:bg-neutral-50 tracking-tight inline"
                                style={{ fontSize: titleSize }}
                              >
                                {art.title}
                              </h3>
                              {formattedDate && (
                                <span className="text-[7.5px] text-neutral-500 font-normal newspaper-font">
                                  ({formattedDate})
                                </span>
                              )}
                            </div>

                            {art.subheading && (
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => handleContentEdit(art.id, 'subheading', e.currentTarget.innerText)}
                                className="newspaper-font font-semibold text-neutral-700 bg-neutral-50 border-l-2 border-neutral-500 px-2 py-0.5 mb-1 outline-none focus:bg-neutral-100 whitespace-pre-line tracking-tight text-[0.70rem] leading-snug"
                              >
                                {art.subheading}
                              </div>
                            )}

                            <div 
                              className="newspaper-font newspaper-text flex-1 columns-2 gap-3.5 text-neutral-800 outline-none focus:bg-neutral-50 overflow-hidden"
                              style={{ fontSize, lineHeight }}
                            >
                              {art.image && (
                                <div 
                                  className="float-right ml-2 mb-1 p-0.5 border border-neutral-200 bg-white"
                                  style={{ maxWidth: count === 1 ? '110px' : '90px' }}
                                >
                                  <img
                                    src={art.image}
                                    alt="기사 사진"
                                    className="w-full h-auto object-contain block max-h-32"
                                  />
                                </div>
                              )}

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => handleContentEdit(art.id, 'content', e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{ __html: art.content }}
                              />
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* 푸터 */}
              <div className="border-t border-neutral-300 pt-1 mt-1 flex justify-between items-center text-[7.5px] text-neutral-400 newspaper-font">
                <span>© 2026 Digital-Hennie. All rights reserved. (artmk@naver.com)</span>
                <span>Page {safeCurrentPage + 1}</span>
              </div>
            </div>
          </div>

          {/* 하단 페이지네이션 */}
          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-neutral-200">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={safeCurrentPage === 0}
              className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: Math.min(9, Math.max(1, pages.length)) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  safeCurrentPage === i
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
              disabled={safeCurrentPage >= pages.length - 1}
              className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}