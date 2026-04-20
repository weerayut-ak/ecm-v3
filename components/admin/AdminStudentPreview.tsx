'use client'
import { useState, useMemo } from 'react'
import { TrendingUp, Users, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Profile { id:string; full_name:string; nickname:string|null; grade:string|null; student_id:string|null }
interface Quiz { id:string; title:string }
interface Sub { id:string; quiz_id:string; score:number|null; is_passed:boolean|null; submitted_at:string; student:Profile|null }

export default function AdminStudentPreview({ students, quizzes, submissions }: { students:Profile[]; quizzes:Quiz[]; submissions:Sub[] }) {
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all')
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name'|'score'>('name')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')

  // Build score map: student_id -> quiz_id -> submission
  const scoreMap = useMemo(() => {
    const m: Record<string, Record<string, Sub>> = {}
    submissions.forEach(s => {
      if (!s.student?.id) return
      if (!m[s.student.id]) m[s.student.id] = {}
      // Keep latest
      if (!m[s.student.id][s.quiz_id] || new Date(s.submitted_at) > new Date(m[s.student.id][s.quiz_id].submitted_at)) {
        m[s.student.id][s.quiz_id] = s
      }
    })
    return m
  }, [submissions])

  const grades = ['all', ...Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort()]

  const filtered = useMemo(() => {
    let list = students.filter(s => selectedGrade === 'all' || s.grade === selectedGrade)
    if (sortBy === 'score') {
      list = [...list].sort((a, b) => {
        const aScore = selectedQuiz !== 'all' ? (scoreMap[a.id]?.[selectedQuiz]?.score ?? -1) : avgScore(a.id)
        const bScore = selectedQuiz !== 'all' ? (scoreMap[b.id]?.[selectedQuiz]?.score ?? -1) : avgScore(b.id)
        return sortDir === 'asc' ? aScore - bScore : bScore - aScore
      })
    } else {
      list = [...list].sort((a, b) => sortDir === 'asc' ? a.full_name.localeCompare(b.full_name, 'th') : b.full_name.localeCompare(a.full_name, 'th'))
    }
    return list
  }, [students, selectedGrade, sortBy, sortDir, scoreMap, selectedQuiz])

  function avgScore(studentId: string): number {
    const subs = Object.values(scoreMap[studentId] ?? {})
    if (!subs.length) return -1
    return subs.reduce((a, s) => a + (s.score ?? 0), 0) / subs.length
  }

  function toggleSort(col: 'name'|'score') {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: 'name'|'score' }) => sortBy === col
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : <span style={{ opacity: 0.3 }}><ChevronDown size={12} /></span>

  // Grade summary stats
  const gradeSummary = ['à¸¡.1','à¸¡.2','à¸¡.3'].map(g => {
    const gs = students.filter(s => s.grade?.startsWith(g))
    const allSubs = gs.flatMap(s => Object.values(scoreMap[s.id] ?? {}))
    const avg = allSubs.length ? Math.round(allSubs.reduce((a, s) => a + (s.score ?? 0), 0) / allSubs.length) : null
    const passed = allSubs.filter(s => s.is_passed).length
    return { grade: g, count: gs.length, avg, passed, total: allSubs.length }
  })

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>à¸£à¸²à¸¢à¸‡à¸²à¸™à¸„à¸°à¹à¸™à¸™à¸™à¸±à¸à¹€à¸£à¸µà¸¢à¸™</h1>

      {/* Grade summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {gradeSummary.map(g => (
          <div key={g.grade} className="card" style={{ border: selectedGrade === g.grade ? '1.5px solid var(--blue)' : '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}
            onClick={() => setSelectedGrade(selectedGrade === g.grade ? 'all' : g.grade)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: selectedGrade === g.grade ? 'var(--blue)' : 'var(--text)' }}>{g.grade}</span>
              <span className="badge badge-blue">{g.count} à¸„à¸™</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div className="stat-card" style={{ padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>{g.avg !== null ? `${g.avg}%` : '-'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>à¹€à¸‰à¸¥à¸µà¹ˆà¸¢</div>
              </div>
              <div className="stat-card" style={{ padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{g.total > 0 ? Math.round((g.passed / g.total) * 100) : 0}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>à¸œà¹ˆà¸²à¸™</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 160 }} value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
          {grades.filter(Boolean).map(g => <option key={g} value={g as string}>{g === 'all' ? 'à¸—à¸¸à¸à¸Šà¸±à¹‰à¸™à¹€à¸£à¸µà¸¢à¸™' : g}</option>)}
        </select>
        <select className="input" style={{ flex: 1, minWidth: 200 }} value={selectedQuiz} onChange={e => setSelectedQuiz(e.target.value)}>
          <option value="all">à¹à¸ªà¸”à¸‡à¸—à¸¸à¸à¹à¸šà¸šà¸—à¸”à¸ªà¸­à¸š (à¸„à¸°à¹à¸™à¸™à¹€à¸‰à¸¥à¸µà¹ˆà¸¢)</option>
          {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
      </div>

      {/* Score table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>à¸™à¸±à¸à¹€à¸£à¸µà¸¢à¸™ <SortIcon col="name" /></span>
                </th>
                <th>à¸£à¸°à¸”à¸±à¸šà¸Šà¸±à¹‰à¸™</th>
                {selectedQuiz === 'all' ? (
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('score')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>à¸„à¸°à¹à¸™à¸™à¹€à¸‰à¸¥à¸µà¹ˆà¸¢ <SortIcon col="score" /></span>
                  </th>
                ) : quizzes.filter(q => q.id === selectedQuiz).map(q => (
                  <th key={q.id} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('score')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{q.title} <SortIcon col="score" /></span>
                  </th>
                ))}
                <th>à¸—à¸³à¹à¸¥à¹‰à¸§</th>
                <th>à¸œà¹ˆà¸²à¸™</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥</td></tr>}
              {filtered.map(s => {
                const subs = scoreMap[s.id] ?? {}
                const avg = Object.values(subs).length > 0 ? Math.round(Object.values(subs).reduce((a, sub) => a + (sub.score ?? 0), 0) / Object.values(subs).length) : null
                const quizSub = selectedQuiz !== 'all' ? subs[selectedQuiz] : null
                const displayScore = selectedQuiz !== 'all' ? quizSub?.score : avg
                const passed = Object.values(subs).filter(sub => sub.is_passed).length

                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {s.full_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.nickname ? `(${s.nickname})` : ''} {s.student_id ?? ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.grade ? <span className="badge badge-blue">{s.grade}</span> : '-'}</td>
                    <td>
                      {displayScore !== null && displayScore !== undefined ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress" style={{ width: 56 }}>
                            <div className="progress-fill" style={{ width: `${displayScore}%`, background: displayScore >= 70 ? 'var(--green)' : displayScore >= 50 ? 'var(--amber)' : 'var(--red)' }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: displayScore >= 70 ? 'var(--green)' : displayScore >= 50 ? 'var(--amber)' : 'var(--red)' }}>
                            {typeof displayScore === 'number' ? displayScore.toFixed(0) : displayScore}%
                          </span>
                          {quizSub && (
                            <span className={`badge ${quizSub.is_passed ? 'badge-green' : 'badge-red'}`}>
                              {quizSub.is_passed ? 'âœ“' : 'âœ—'}
                            </span>
                          )}
                        </div>
                      ) : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸—à¸³</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{Object.keys(subs).length} à¸Šà¸¸à¸”</td>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 600, color: passed > 0 ? 'var(--green)' : 'var(--text-3)' }}>
                        {passed}/{Object.keys(subs).length}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)' }}>
          à¹à¸ªà¸”à¸‡ {filtered.length} à¸„à¸™
        </div>
      </div>
    </div>
  )
}

