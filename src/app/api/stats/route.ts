import { NextResponse } from 'next/server';

// 메모리 기반 전역 통계 카운터
let stats = {
  totalVisits: 0,
  todayVisits: 0,
  totalScraps: 0,
  todayScraps: 0,
  lastDate: new Date().toISOString().split('T')[0],
};

function checkAndResetDaily() {
  const today = new Date().toISOString().split('T')[0];
  if (stats.lastDate !== today) {
    stats.todayVisits = 0;
    stats.todayScraps = 0;
    stats.lastDate = today;
  }
}

// 통계 조회 (GET)
export async function GET() {
  checkAndResetDaily();
  return NextResponse.json(stats);
}

// 통계 증가 처리 (POST) - action: 'visit' | 'scrap'
export async function POST(req: Request) {
  checkAndResetDaily();
  try {
    const { action } = await req.json();
    if (action === 'visit') {
      stats.totalVisits += 1;
      stats.todayVisits += 1;
    } else if (action === 'scrap') {
      stats.totalScraps += 1;
      stats.todayScraps += 1;
    }
    return NextResponse.json({ success: true, stats });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}