'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = ['#2D6A4F', '#52B788', '#F4A261', '#E76F51']

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  naver_blog: '네이버',
  kakao_channel: '카카오',
  youtube: 'YouTube',
}

const TYPE_LABELS: Record<string, string> = {
  sns_post: 'SNS',
  card_news: '카드뉴스',
  blog: '블로그',
  short_form_script: '숏폼',
}

type PlatformStat = { platform: string; views: number; likes: number; comments: number }
type DailyView = { date: string; views: number }
type TypeBreakdown = { type: string; count: number }

export default function AnalyticsCharts({
  platformStats,
  dailyViews,
  contentTypeBreakdown,
}: {
  platformStats: PlatformStat[]
  dailyViews: DailyView[]
  contentTypeBreakdown: TypeBreakdown[]
}) {
  const barData = platformStats.map((d) => ({
    ...d,
    name: PLATFORM_LABELS[d.platform] ?? d.platform,
  }))

  const pieData = contentTypeBreakdown.map((d) => ({
    name: TYPE_LABELS[d.type] ?? d.type,
    value: d.count,
  }))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-[#2D6A4F]">플랫폼별 성과</CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="views" name="조회수" fill="#2D6A4F" />
                <Bar dataKey="likes" name="좋아요" fill="#52B788" />
                <Bar dataKey="comments" name="댓글" fill="#F4A261" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-[#2D6A4F]">일별 조회수 (30일)</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyViews.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyViews}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="views"
                  name="조회수"
                  stroke="#2D6A4F"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-[#2D6A4F]">콘텐츠 유형 분포</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
