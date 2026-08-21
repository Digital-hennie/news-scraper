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

    // 1. 직접 HTML Fetch (추가 패키지 없이 순수 정규식 파싱)
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
          html.match(/<h2[^>]*id="title_area"[^>]*>([\s\S]*?)<\/h2>/i) ||
          html.match(/<h1[^>]*class="[^"]*article-head__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
          html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
          html.match(/<title>([\s\S]*?)<\/title>/i);

        if (titleMatch) {
          title = titleMatch[1]
            .replace(/ - 조선일보.*$/i, '')
            .replace(/ : 네이버.*$/i, '')
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

        // 1-3. 본문 컨테이너 정밀 매칭 (네이버, 다음, 조선일보 등)
        const bodyMatch =
          html.match(/<article[^>]*id="dic_area"[^>]*>([\s\S]*?)<\/article>/i) ||
          html.match(/<div[^>]*id="newsct_article"[^>]*>([\s\S]*?)<\/div>/i) ||
          html.match(/<div[^>]*id="articleBodyContents"[^>]*>([\s\S]*?)<\/div>/i) ||
          html.match(/<section[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
          html.match(/<div[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
          html.match(/<div[^>]*class="[^"]*article_view[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
          html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

        if (bodyMatch) {
          rawContent = bodyMatch[1];
        }

        // 1-4. 날짜 추출
        const dateMatch =
          html.match(/data-date-time="([^"]+)"/i) ||
          html.match(/<meta\s+property="article:published_time"\s+content="([^"]+)"/i);
        if (dateMatch) {
          published = dateMatch[1].split('T')[0].split(' ')[0];
        }
      }
    } catch (fetchErr) {
      console.warn('Fetch error:', fetchErr);
    }

    // 2. 라이브러리 Fallback
    if (!rawContent || rawContent.length < 100) {
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

    // 미디어 태그, 사진 캡션, 불필요 영역 정제
    raw = raw.replace(/<!--[\s\S]*?-->/g, '');
    raw = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    raw = raw.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    raw = raw.replace(/<figure\b[^<]*(?:(?!<\/figure>)<[^<]*)*<\/figure>/gi, '');
    raw = raw.replace(/<figcaption\b[^<]*(?:(?!<\/figcaption>)<[^<]*)*<\/figcaption>/gi, '');
    raw = raw.replace(/<em\b[^<]*(?:(?!<\/em>)<[^<]*)*<\/em>/gi, '');
    raw = raw.replace(/<img[^>]*>/gi, '');
    raw = raw.replace(/<\/(p|div|section|article|header|aside|li)>/gi, '\n');
    raw = raw.replace(/<(p|div|section|article|header|aside|li)[^>]*>/gi, '');
    raw = raw.replace(/<br\s*[\/]?>/gi, '\n');
    raw = raw.replace(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi, '\n### $1\n');
    raw = raw.replace(/<[^>]+>/g, '');

    // 특수 불릿 줄바꿈 분리
    raw = raw.replace(/([^\n])\s*([●■◆▲▶])\s*/g, '$1\n$2 ');

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let subheadings: string[] = [];
    let formattedParagraphs: string[] = [];
    let parsingSubhead = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 저작권 및 꼬리말 필터링
      if (
        line.includes('기자 =') ||
        line.includes('기자=') ||
        line.includes('무단 전재') ||
        line.includes('재배포 금지') ||
        line.includes('All rights reserved') ||
        line.includes('네이버에서') ||
        line.includes('구독해주세요') ||
        line.includes('사진=') ||
        line.includes('@') ||
        line.length < 2
      ) {
        continue;
      }

      // 상단 부제목 추출
      if (
        parsingSubhead &&
        (line.startsWith('‘') || line.startsWith('“') || line.startsWith('-') || line.startsWith('·') || line.length <= 45) &&
        !line.endsWith('다.') &&
        !line.startsWith('●') &&
        line !== title &&
        subheadings.length < 3
      ) {
        subheadings.push(line.replace(/^[·\-\s]+/, ''));
        continue;
      } else {
        parsingSubhead = false;
      }

      // 중간 소제목
      if (
        line.startsWith('### ') || 
        line.startsWith('●') || 
        line.startsWith('■') || 
        line.startsWith('◇') || 
        line.startsWith('◆') || 
        line.startsWith('▶') ||
        (line.length <= 35 && !line.endsWith('다.') && !line.endsWith('까?') && !line.endsWith('요.'))
      ) {
        const cleanSub = line.replace(/^###\s*|^[●■◇◆▶\s]+/, '');
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