import { NextResponse } from 'next/server';
import { extract } from '@extractus/article-extractor';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL을 입력해주세요.' }, { status: 400 });
    }

    let title = '';
    let rawContent = '';
    let imageUrl: string | null = null;
    let published = new Date().toISOString().split('T')[0];
    let source = '';

    // 1. 직접 HTML Fetch
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const html = await response.text();

        // 1-1. 제목 추출
        const titleMatch =
          html.match(/<h3[^>]*class="heading"[^>]*>([\s\S]*?)<\/h3>/i) ||
          html.match(/<div[^>]*class="article-head-title"[^>]*>([\s\S]*?)<\/div>/i) ||
          html.match(/<h2[^>]*id="title_area"[^>]*>([\s\S]*?)<\/h2>/i) ||
          html.match(/<h1[^>]*class="[^"]*article-head__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
          html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
          html.match(/<title>([\s\S]*?)<\/title>/i);

        if (titleMatch) {
          title = titleMatch[1]
            .replace(/ - 조선일보.*$/i, '')
            .replace(/ : 네이버.*$/i, '')
            .replace(/ - 제주의소리.*$/i, '')
            .replace(/<[^>]+>/g, '')
            .trim();
        }

        // 1-2. 대표 이미지 추출
        const imgMatch =
          html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
          html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
        if (imgMatch && imgMatch[1].startsWith('http') && !imgMatch[1].includes('favicon')) {
          imageUrl = imgMatch[1];
        }

        // 1-3. 본문 컨테이너 추출 (NDSoft, 네이버, 다음 등)
        const ndsoftMatch = html.match(/<div[^>]*id="article-view-content-div"[^>]*>([\s\S]*?)<\/div>\s*<(div|section)[^>]*id="(detail-ad|view-copyright)/i) ||
                           html.match(/<div[^>]*id="article-view-content-div"[^>]*>([\s\S]*?)<\/div>/i);
        if (ndsoftMatch) {
          rawContent = ndsoftMatch[1];
        }

        if (!rawContent) {
          const bodyMatch =
            html.match(/<article[^>]*id="dic_area"[^>]*>([\s\S]*?)<\/article>/i) ||
            html.match(/<div[^>]*id="newsct_article"[^>]*>([\s\S]*?)<\/div>/i) ||
            html.match(/<section[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
            html.match(/<div[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
            html.match(/<div[^>]*class="[^"]*article_view[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
            html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

          if (bodyMatch) {
            rawContent = bodyMatch[1];
          }
        }

        // 1-4. 날짜 추출
        const dateMatch =
          html.match(/승인\s*([0-9]{4}\.[0-9]{2}\.[0-9]{2})/i) ||
          html.match(/data-date-time="([^"]+)"/i) ||
          html.match(/<meta\s+property="article:published_time"\s+content="([^"]+)"/i) ||
          html.match(/([0-9]{4}\.[0-9]{2}\.[0-9]{2}\s+[0-9]{2}:[0-9]{2})/i);
        if (dateMatch) {
          published = dateMatch[1].split('T')[0].split(' ')[0].replace(/\./g, '-');
        }
      }
    } catch (fetchErr) {
      console.warn('Fetch error:', fetchErr);
    }

    // 2. Fallback
    if (!rawContent || rawContent.length < 80) {
      const article = await extract(url);
      if (article) {
        title = title || article.title || '';
        rawContent = article.content || '';
        imageUrl = imageUrl || article.image || null;
        published = article.published || published;
        source = article.source || '';
      }
    }

    if (!rawContent) {
      return NextResponse.json({ error: '기사 본문을 가져올 수 없습니다.' }, { status: 500 });
    }

    let raw = rawContent;

    // 미디어 태그, 캡션 박스, 스크립트, 광고 노이즈 제거[cite: 1]
    raw = raw.replace(/<!--[\s\S]*?-->/g, '');
    raw = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    raw = raw.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    raw = raw.replace(/<figure\b[^<]*(?:(?!<\/figure>)<[^<]*)*<\/figure>/gi, '');
    raw = raw.replace(/<figcaption\b[^<]*(?:(?!<\/figcaption>)<[^<]*)*<\/figcaption>/gi, '');
    raw = raw.replace(/<table\b[^<]*(?:(?!<\/table>)<[^<]*)*<\/table>/gi, '');
    raw = raw.replace(/<img[^>]*>/gi, '');

    // 줄바꿈 태그 변환[cite: 1]
    raw = raw.replace(/<\/(p|div|section|article|header|aside|li|tr|h[1-6])>/gi, '\n');
    raw = raw.replace(/<(p|div|section|article|header|aside|li|tr|h[1-6])[^>]*>/gi, '');
    raw = raw.replace(/<br\s*[\/]?>/gi, '\n');
    
    // 혹시 남아있는 모든 HTML 태그 및 덜 닫힌 태그 조각 완전 제거[cite: 1]
    raw = raw.replace(/<[^>]*>/g, '');
    raw = raw.replace(/id="[^"]*"/gi, '');
    raw = raw.replace(/class="[^"]*"/gi, '');
    raw = raw.replace(/itemprop="[^"]*"/gi, '');

    // 특수 불릿 줄바꿈 분리[cite: 1]
    raw = raw.replace(/([^\n])\s*([●■◆▲▶])\s*/g, '$1\n$2 ');

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let subheadings: string[] = [];
    let formattedParagraphs: string[] = [];
    let parsingSubhead = true;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // 저작권, 기자 서명, 네비게이션, 포털 반응(좋아요 등) 문구 필터링[cite: 1]
      if (
        line.includes('article-view') ||
        line.includes('articleBody') ||
        line.includes('글자크기 설정') ||
        line.includes('좋아요') ||
        line.includes('훈훈해요') ||
        line.includes('슬퍼요') ||
        line.includes('화나요') ||
        line.includes('다른기사 보기') ||
        line.includes('개의 댓글') ||
        line.includes('기자 =') ||
        line.includes('기자=') ||
        line.includes('기자') && line.length < 10 ||
        line.includes('무단전재') ||
        line.includes('무단 전재') ||
        line.includes('재배포 금지') ||
        line.includes('재배포금지') ||
        line.includes('All rights reserved') ||
        line.includes('네이버에서') ||
        line.includes('구독해주세요') ||
        line.includes('사진=') ||
        line.includes('출처=') ||
        line.includes('@jejusori.net') ||
        line.includes('@') ||
        line.startsWith('작성자') ||
        line === '●' ||
        line.length < 2
      ) {
        continue;
      }

      // 기사 최상단 부제목 추출[cite: 1]
      if (
        parsingSubhead &&
        (line.startsWith('‘') || line.startsWith('“') || line.startsWith('-') || line.startsWith('·') || line.startsWith('###') || line.startsWith('●') || (line.length <= 45 && !line.endsWith('다.'))) &&
        line !== title &&
        subheadings.length < 2
      ) {
        subheadings.push(line.replace(/^[·\-\s#●■◆]+/, ''));
        continue;
      } else {
        parsingSubhead = false;
      }

      // 본문 중간 소제목 감지[cite: 1]
      if (
        line.startsWith('●') || 
        line.startsWith('■') || 
        line.startsWith('◇') || 
        line.startsWith('◆') || 
        line.startsWith('▶') ||
        (line.length <= 35 && !line.endsWith('다.') && !line.endsWith('까?') && !line.endsWith('요.'))
      ) {
        const cleanSub = line.replace(/^[●■◇◆▶\s]+/, '');
        formattedParagraphs.push(`<h3>● ${cleanSub}</h3>`);
      } else {
        formattedParagraphs.push(`<p>${line}</p>`);
      }
    }

    return NextResponse.json({
      id: Date.now().toString(),
      title: title || '제목 없음',
      subheading: subheadings.length > 0 ? subheadings.join('\n') : null,
      content: formattedParagraphs.join('') || '<p>본문 내용이 없습니다.</p>',
      image: imageUrl,
      url: url,
      source: source || '뉴스',
      published: published
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '스크랩 실패' }, { status: 500 });
  }
}