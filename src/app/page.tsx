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
  const [showDonateModal, setShowDonateModal] = useState(false);

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

  // Auto-packing
  const pages: Article[][] = useMemo(() => {
    if (articles.length === 0) return [];

    const result: Article[][] = [];
    let currentBatch: Article[] = [];
    let currentScore = 0;

    const PAGE_CAPACITY = 2900;
    const SINGLE_ARTICLE_THRESHOLD = 2400;

    for (let i = 0; i < articles.length; i++) {
      const art = articles[i];
      const plainText = art.content.replace(/<[^>]+>/g, '');
      const score = plainText.length + (art.image ? 200 : 0) + ((art.subheading?.length || 0) * 1.2);

      if (score >= SINGLE_ARTICLE_THRESHOLD) {
        if (currentBatch.length > 0) {
          result.push(currentBatch);
          currentBatch = [];
          currentScore = 0;
        }
        result.push([art]);
        continue;
      }

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

  const totalCharsOnPage = useMemo(() => {
    return activePageArticles.reduce((acc, art) => acc + art.content.replace(/<[^>]+>/g, '').length, 0);
  }, [activePageArticles]);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-6 px-4 font-sans relative">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap');

        .newspaper-font {
          font-family: 'Nanum Myeongjo', 'Batang', serif !important;
          letter-spacing: -0.025em;
        }

        .newspaper-text p {
          text-indent: 0.9em;
          margin-bottom: 0.35em;
          text-align: justify;
          word-break: keep-all;
          overflow-wrap: break-word;
        }

        .newspaper-text h3 {
          font-weight: 800;
          margin-top: 0.6em;
          margin-bottom: 0.3em;
          color: #0f172a;
          line-height: 1.35;
          font-size: 0.9em;
          text-indent: 0 !important;
          break-after: avoid;
        }
      `}</style>

      {/* 헤더 */}
      <header className="w-full max-w-7xl mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-neutral-200">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-neutral-800" />
          <h1 className="text-lg font-bold text-neutral-800">신문 기사 아카이브 및 A4조판 서비스 페이지 @Digital-Hennie</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* 이용방법 안내 버튼 */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 bg-neutral-100 text-neutral-700 border border-neutral-300 px-3 py-2 rounded-lg hover:bg-neutral-200 transition-colors shadow-sm font-medium text-xs cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-neutral-600" />
            <span>이용방법 안내</span>
          </button>

          {/* 카카오페이 커피 후원 모달 버튼 */}
          <button
            onClick={() => setShowDonateModal(true)}
            className="flex items-center gap-1.5 bg-[#FEE500] text-[#191919] border border-amber-300 px-3 py-2 rounded-lg hover:bg-yellow-400 transition-colors shadow-sm font-medium text-xs cursor-pointer"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-900" />
            <span>개발자 커피 후원</span>
          </button>

          {/* PDF 인쇄 버튼 */}
          <button
            onClick={() => handlePrint()}
            disabled={activePageArticles.length === 0}
            className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 disabled:bg-neutral-300 transition-colors shadow-sm font-medium text-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            현재 페이지 PDF 인쇄/저장
          </button>
        </div>
      </header>

      {/* 카카오페이 QR 후원 모달 */}
      {showDonateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center text-center">
            <div className="w-full flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-amber-700" />
                </div>
                <h2 className="text-sm font-bold text-neutral-900">개발자에게 커피 한 잔</h2>
              </div>
              <button
                onClick={() => setShowDonateModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4 text-left">
              본 서비스가 유용하셨다면 따뜻한 커피 한 잔을 후원해 주세요. 더 쾌적한 아카이브 환경을 만드는 데 큰 힘이 됩니다. ☕
            </p>

            {/* QR 이미지 컨테이너 */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 mb-4 flex flex-col items-center justify-center w-full shadow-inner">
              <div className="w-48 h-48 bg-white border border-neutral-200 rounded-xl overflow-hidden flex items-center justify-center shadow-xs">
                <img
                  src="/kakaopay-qr.png"
                  alt="카카오페이 송금 QR"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="text-xs text-neutral-400 p-3 leading-relaxed">public 폴더에<br/>kakaopay-qr.png 이미지를 넣어주세요</span>';
                    }
                  }}
                />
              </div>
              <span className="text-[11px] font-medium text-neutral-500 mt-2.5">
                카카오톡 [송금] 렌즈 또는 기본 카메라로 스캔
              </span>
            </div>

            <button
              onClick={() => setShowDonateModal(false)}
              className="w-full bg-neutral-900 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 이용방법 모달 팝업 */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">서비스 이용 가이드</h2>
                  <p className="text-[11px] text-neutral-400">편리한 신문 기사 아카이빙을 위한 안내</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs leading-relaxed text-neutral-600">
              {/* 1. 이용방법 순서 */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-neutral-800">
                <p className="font-bold text-blue-950 mb-2 flex items-center gap-1.5 text-[13px]">
                  <span>📖</span>
                  <span>이용방법</span>
                </p>
                <ol className="space-y-1.5 list-none font-medium">
                  <li className="flex items-start gap-1.5">
                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">1</span>
                    <span>스크랩하고 싶은 뉴스의 페이지 주소(URL)를 추가하여 주세요. (개별 언론사페이지보다 네이버와 같은 포털 내 뉴스페이지를 이용하시면 더욱 안정적으로 적용됩니다.)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">2</span>
                    <span>기사 길이에 따라 한 페이지에 최대 4건까지 배치됩니다.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">3</span>
                    <span>스크랩 목록에서 스크랩한 기사의 순서를 바꾸면 기사 배열 순서가 함께 바뀝니다.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">4</span>
                    <span>원하는 페이지가 완성되면 우측 상단의 <strong>[현재 페이지 PDF 인쇄/저장]</strong> 버튼을 눌러 저장 또는 인쇄합니다.</span>
                  </li>
                </ol>
              </div>

              {/* 2. 비상업적 무료 프로젝트 안내 */}
              <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3.5">
                <p className="font-semibold text-neutral-800 mb-1 flex items-center gap-1.5">
                  <span>☕</span>
                  <span>비상업적 무료 프로젝트 안내</span>
                </p>
                <p className="text-neutral-600 leading-normal">
                  본 서비스는 <strong>Digital-Hennie</strong>가 개인적인 필요와 스크랩 편의를 위해 자발적으로 만든 <strong>비상업적 아카이브 도구</strong>입니다. 학습, 연구, 개인 보관용으로 자유롭게 이용해 주시되, <strong>상업적 용도로의 무단 전재 및 활용은 삼가</strong>해 주시기 바랍니다.
                </p>
              </div>

              {/* 3. 기사 추출 팁 */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-blue-950">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>기사 본문이 잘 불러와지지 않을 때</span>
                </p>
                <p className="leading-normal">
                  일부 언론사 웹페이지의 보안 정책이나 구조적 제약으로 본문 추출이 원활하지 않을 수 있습니다. 이 경우 해당 기사의 <strong>'네이버 뉴스' 페이지 링크</strong>를 복사해 입력해 주시면 훨씬 안정적으로 기사가 조판됩니다.
                </p>
              </div>

              {/* 4. 문의 및 피드백 */}
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3.5 text-amber-950">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <span>💬</span>
                  <span>소중한 의견과 아이디어를 들려주세요</span>
                </p>
                <p className="leading-normal">
                  서비스를 이용하시면서 느끼신 개선점이나 더 좋은 레이아웃 아이디어가 있다면 언제든 편하게 메일로 전해 주세요. 여러분의 피드백으로 더 읽기 좋은 서비스를 만들어가겠습니다.
                </p>
                <p className="font-medium mt-1 text-[11px] text-amber-800">
                  문의처: <a href="mailto:artmkt@naver.com" className="underline underline-offset-2">artmkt@naver.com</a>
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

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
                padding: '9mm 11mm',
              }}
            >
              {/* 마스트헤드 */}
              <div className="border-b border-neutral-900 pb-0.5 mb-1.5 flex items-baseline gap-2">
                <h2 className="text-xs font-black tracking-tight text-neutral-900 newspaper-font">NEWS ARCHIVE</h2>
                <span className="text-[8px] text-neutral-400">|</span>
                <p className="text-[8px] text-neutral-500">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              {/* 기사 컨테이너 */}
              <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
                {activePageArticles.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-neutral-300 newspaper-font text-xs">
                    배치된 기사가 없습니다.
                  </div>
                ) : (
                  <div 
                    className={`h-full w-full flex ${
                      activePageArticles.length <= 2 ? 'flex-col' : 'grid grid-cols-2 grid-rows-2'
                    } gap-2.5 overflow-hidden`}
                  >
                    {activePageArticles.map((art) => {
                      const count = activePageArticles.length;
                      const plainLen = art.content.replace(/<[^>]+>/g, '').length;
                      const flexWeight = count === 2 ? Math.max(1, Math.round(plainLen / 180)) : 1;

                      let fontSize = '0.78rem';
                      let lineHeight = '1.58';
                      let titleSize = '1.15rem';

                      if (count === 1) {
                        fontSize = totalCharsOnPage < 1300 ? '0.86rem' : '0.80rem';
                        lineHeight = '1.65';
                        titleSize = '1.32rem';
                      } else if (count === 2) {
                        fontSize = totalCharsOnPage < 1700 ? '0.81rem' : '0.76rem';
                        lineHeight = '1.55';
                        titleSize = '1.10rem';
                      } else {
                        fontSize = '0.70rem';
                        lineHeight = '1.42';
                        titleSize = '0.92rem';
                      }

                      const formattedDate = formatShortDate(art.published);
                      const columnClass = count <= 2 ? 'columns-2 gap-4' : 'columns-1';

                      return (
                        <article
                          key={art.id}
                          style={{ flex: `${flexWeight} 1 0%` }}
                          className="flex flex-col border-b border-neutral-300 pb-2 last:border-b-0 overflow-hidden min-h-0"
                        >
                          {/* 1. 대제목 + 게재일 */}
                          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
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
                              <span className="text-[8px] text-neutral-500 font-normal tracking-normal newspaper-font">
                                ({formattedDate})
                              </span>
                            )}
                          </div>

                          {/* 2. 부제목 박스 */}
                          {art.subheading && (
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => handleContentEdit(art.id, 'subheading', e.currentTarget.innerText)}
                              className="newspaper-font font-semibold text-neutral-700 bg-neutral-50 border-l-2 border-neutral-500 px-2 py-0.5 mb-1.5 outline-none focus:bg-neutral-100 whitespace-pre-line tracking-tight"
                              style={{ fontSize: '0.73rem', lineHeight: '1.35' }}
                            >
                              {art.subheading}
                            </div>
                          )}

                          {/* 3. 본문 2단 조판 + 플로팅 이미지 */}
                          <div 
                            className={`newspaper-font newspaper-text flex-1 text-neutral-800 outline-none focus:bg-neutral-50 overflow-hidden ${columnClass}`}
                            style={{ fontSize, lineHeight }}
                          >
                            {art.image && (
                              <div 
                                className="float-right ml-2.5 mb-1.5 p-0.5 border border-neutral-200 bg-white"
                                style={{ maxWidth: count <= 2 ? '110px' : '90px' }}
                              >
                                <img
                                  src={art.image}
                                  alt="기사 사진"
                                  className="w-full h-auto object-contain block max-h-36"
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
                )}
              </div>

              {/* 푸터 */}
              <div className="border-t border-neutral-300 pt-1 mt-1 flex justify-between items-center text-[8px] text-neutral-400 newspaper-font">
                <span>© 2026 Digital-Hennie. All rights reserved. (artmkt@naver.com)</span>
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