import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import {
  BookOpen, User, Lock, LogOut, Play, CheckCircle2, XCircle,
  BarChart3, Users, FileText, Plus, Trash2, Edit3,
  Award, AlertTriangle, Calendar, ChevronRight,
  Save, Eye, EyeOff, Settings, Type, Sparkles,
  Image as ImageIcon, Upload, X
} from 'lucide-react'

// ===== 유틸 =====
const todayStr = () => new Date().toISOString().slice(0, 10)
const normKr = (s) => s.replace(/\s/g, '').trim()

export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [data, setData] = useState({
    students: [],
    vocabSets: [],
    passages: [],
    vocabResults: [],
    attempts: [],
    examSchedules: [],
    vocabAssignments: {},
    passageAssignments: {},
    settings: { teacher_password: 'teacher1234', default_pass_rate: 90 }
  })

  // 데이터 불러오기
  const reloadData = async () => {
    try {
      const [students, vocabSets, passages, vocabResults, attempts, examSchedules, vocabAssignments, passageAssignments, settings] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('vocab_sets').select('*'),
        supabase.from('passages').select('*'),
        supabase.from('vocab_results').select('*'),
        supabase.from('attempts').select('*'),
        supabase.from('exam_schedules').select('*'),
        supabase.from('vocab_assignments').select('*'),
        supabase.from('passage_assignments').select('*'),
        supabase.from('settings').select('*')
      ])

      const vAss = {}
      ;(vocabAssignments.data || []).forEach(r => {
        if (!vAss[r.student_id]) vAss[r.student_id] = []
        vAss[r.student_id].push(r.vocab_set_id)
      })

      const pAss = {}
      ;(passageAssignments.data || []).forEach(r => {
        if (!pAss[r.student_id]) pAss[r.student_id] = []
        pAss[r.student_id].push(r.passage_id)
      })

      const settingsObj = {}
      ;(settings.data || []).forEach(r => { settingsObj[r.key] = r.value })

      setData({
        students: (students.data || []).map(s => ({ ...s, passRate: s.pass_rate })),
        vocabSets: vocabSets.data || [],
        passages: (passages.data || []).map(p => ({ ...p, videoUrl: p.video_url, passageText: p.passage_text, passageImage: p.passage_image })),
        vocabResults: (vocabResults.data || []).map(r => ({ ...r, studentId: r.student_id, vocabSetId: r.vocab_set_id, isRetake: r.is_retake })),
        attempts: (attempts.data || []).map(a => ({ ...a, studentId: a.student_id, passageId: a.passage_id })),
        examSchedules: examSchedules.data || [],
        vocabAssignments: vAss,
        passageAssignments: pAss,
        settings: settingsObj
      })
    } catch (e) {
      console.error('데이터 로드 실패:', e)
    }
  }

  useEffect(() => {
    reloadData().finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5efe6' }}>
        <div className="text-stone-600">불러오는 중...</div>
      </div>
    )
  }

  if (!user) return <LoginScreen data={data} onLogin={setUser} reloadData={reloadData} />
  if (user.type === 'teacher') return <TeacherMode data={data} reloadData={reloadData} onLogout={() => setUser(null)} />
  return <StudentMode data={data} reloadData={reloadData} user={user} onLogout={() => setUser(null)} />
}

// ===== 로그인 화면 (학생 자동 회원가입 포함) =====
function LoginScreen({ data, onLogin, reloadData }) {
  const [mode, setMode] = useState('student')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleLogin = async () => {
    setError('')
    setBusy(true)
    try {
      if (mode === 'teacher') {
        const teacherPw = data.settings.teacher_password || 'teacher1234'
        if (password === teacherPw) onLogin({ type: 'teacher', name: '선생님' })
        else setError('비밀번호가 틀렸습니다')
        return
      }

      const trimmedName = name.trim()
      if (!trimmedName || !password) {
        setError('이름과 비밀번호를 입력해주세요')
        return
      }

      const existing = data.students.find(s => s.name === trimmedName)
      if (existing) {
        if (existing.password === password) {
          onLogin({ type: 'student', id: existing.id, name: existing.name })
        } else {
          setError('비밀번호가 틀렸습니다')
        }
      } else {
        // 신규 학생 등록
        const newId = `s${Date.now()}`
        const { error: insErr } = await supabase.from('students').insert({
          id: newId,
          name: trimmedName,
          password,
          school: school.trim() || '미입력',
          grade: grade.trim() || '미입력',
          pass_rate: parseInt(data.settings.default_pass_rate) || 90
        })
        if (insErr) {
          setError('등록 실패: ' + insErr.message)
          return
        }
        await reloadData()
        onLogin({ type: 'student', id: newId, name: trimmedName })
      }
    } finally {
      setBusy(false)
    }
  }

  const isNewStudent = mode === 'student' && name.trim() && !data.students.find(s => s.name === name.trim())

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f5efe6 0%, #ebe1d0 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: '#1e3a5f' }}>
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#1e3a5f', fontFamily: 'Georgia, serif' }}>삼성영어셀레나</h1>
          <p className="text-sm tracking-widest" style={{ color: '#a08968' }}>WOW LEARNING SYSTEM</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border" style={{ borderColor: '#ebe1d0' }}>
          <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: '#f5efe6' }}>
            <button onClick={() => { setMode('student'); setError('') }} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold ${mode === 'student' ? 'bg-white shadow-sm' : ''}`} style={{ color: mode === 'student' ? '#1e3a5f' : '#a08968' }}>학생</button>
            <button onClick={() => { setMode('teacher'); setError('') }} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold ${mode === 'teacher' ? 'bg-white shadow-sm' : ''}`} style={{ color: mode === 'teacher' ? '#1e3a5f' : '#a08968' }}>선생님</button>
          </div>

          <div className="space-y-4">
            {mode === 'student' && (
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#1e3a5f' }}>이름</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a08968' }} />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full pl-10 pr-4 py-3 rounded-lg border" style={{ borderColor: '#ebe1d0', background: '#fafafa' }} placeholder="이름을 입력하세요" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#1e3a5f' }}>비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a08968' }} />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full pl-10 pr-10 py-3 rounded-lg border" style={{ borderColor: '#ebe1d0', background: '#fafafa' }} placeholder="비밀번호" />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#a08968' }}>{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>

            {isNewStudent && (
              <div className="p-3 rounded-lg text-xs" style={{ background: '#dcfce7', color: '#166534' }}>
                ✨ 새 학생으로 등록됩니다! 학교와 학년을 입력해주세요. (선택)
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} className="px-3 py-2 rounded border text-sm" style={{ borderColor: '#86efac', background: 'white', color: '#1e3a5f' }} placeholder="학교 (예: 와우중)" />
                  <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} className="px-3 py-2 rounded border text-sm" style={{ borderColor: '#86efac', background: 'white', color: '#1e3a5f' }} placeholder="학년 (예: 중2)" />
                </div>
              </div>
            )}

            {error && <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fee', color: '#c33' }}>{error}</div>}

            <button onClick={handleLogin} disabled={busy} className="w-full py-3 rounded-lg font-semibold text-white hover:opacity-90 active:scale-[0.98] disabled:opacity-50" style={{ background: '#1e3a5f' }}>
              {busy ? '처리 중...' : (isNewStudent ? '등록하고 시작하기 →' : '로그인')}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t text-center text-xs" style={{ borderColor: '#ebe1d0', color: '#a08968' }}>
            {mode === 'student' ? '처음이신가요? 이름과 비밀번호를 입력하면 자동 등록됩니다' : '학원 선생님 비밀번호로 로그인'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== 학생 모드 =====
function StudentMode({ data, reloadData, user, onLogout }) {
  const [view, setView] = useState('home')
  const [currentPassageId, setCurrentPassageId] = useState(null)
  const [vocabSetId, setVocabSetId] = useState(null)
  const [isRetake, setIsRetake] = useState(false)
  const [lastResultId, setLastResultId] = useState(null)
  const [lastAttemptId, setLastAttemptId] = useState(null)

  const student = data.students.find(s => s.id === user.id)
  if (!student) return <div className="p-8">학생 정보를 찾을 수 없어요. 다시 로그인해주세요.</div>

  const today = todayStr()
  const todayVocab = data.vocabResults.filter(r => r.studentId === user.id && r.date === today)
  const mainResult = todayVocab.find(r => !r.isRetake)
  const retakeResult = todayVocab.find(r => r.isRetake)
  const assignedVocabIds = data.vocabAssignments[user.id] || []
  const assignedVocabSets = data.vocabSets.filter(v => assignedVocabIds.includes(v.id))
  const passRate = student.passRate || 90
  const needsRetake = mainResult && mainResult.score < passRate && !retakeResult

  const assignedPIds = data.passageAssignments[user.id] || []
  const assignedPassages = data.passages.filter(p => assignedPIds.includes(p.id))
  const myAttempts = data.attempts.filter(a => a.studentId === user.id)

  // 어휘 시험 결과 화면
  if (view === 'vocabResult' && lastResultId) {
    const result = data.vocabResults.find(r => r.id === lastResultId)
    if (result) return <VocabResultScreen result={result} passRate={passRate} onDone={() => { setView('home'); setLastResultId(null) }} />
  }

  // 어휘 테스트 화면
  if (view === 'vocab' && vocabSetId) {
    const vs = data.vocabSets.find(v => v.id === vocabSetId)
    if (vs) return <VocabTestScreen vocabSet={vs} passRate={passRate} isRetake={isRetake}
      onComplete={async (results, score) => {
        const newId = `vr${Date.now()}`
        await supabase.from('vocab_results').insert({
          id: newId,
          student_id: user.id,
          vocab_set_id: vocabSetId,
          date: today,
          results,
          score,
          passed: score >= passRate,
          is_retake: isRetake
        })
        await reloadData()
        setLastResultId(newId)
        setView('vocabResult')
      }}
    />
  }

  // 지문 학습 화면
  if (view === 'study' && currentPassageId) {
    const p = data.passages.find(p => p.id === currentPassageId)
    if (p) return <StudyScreen passage={p}
      onComplete={async (answers) => {
        const newId = `a${Date.now()}`
        const results = p.questions.map((q, i) => ({ questionId: q.id, category: q.category, correct: answers[i] === q.answer }))
        await supabase.from('attempts').insert({
          id: newId,
          student_id: user.id,
          passage_id: currentPassageId,
          answers,
          results
        })
        await reloadData()
        setLastAttemptId(newId)
        setView('result')
      }}
      onBack={() => { setView('home'); setCurrentPassageId(null) }}
    />
  }

  if (view === 'result' && lastAttemptId) {
    const att = data.attempts.find(a => a.id === lastAttemptId)
    if (att) {
      const p = data.passages.find(p => p.id === att.passageId)
      return <ResultScreen attempt={att} passage={p} onDone={() => { setView('home'); setCurrentPassageId(null); setLastAttemptId(null) }} />
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5efe6' }}>
      <header className="bg-white border-b" style={{ borderColor: '#ebe1d0' }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1e3a5f' }}><BookOpen className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-xs" style={{ color: '#a08968' }}>안녕하세요!</div>
              <div className="font-bold" style={{ color: '#1e3a5f' }}>{student.name} 학생</div>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm hover:bg-stone-100" style={{ color: '#a08968' }}><LogOut className="w-4 h-4" />로그아웃</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)' }}>
          <div className="flex items-center gap-2 text-xs tracking-widest mb-2" style={{ color: '#f5cba7' }}>
            <Calendar className="w-4 h-4" />{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          <h2 className="text-2xl font-bold mb-1">오늘의 학습</h2>
          <p className="text-sm" style={{ color: '#cbd5e0' }}>{student.school} · {student.grade}</p>
        </div>

        {assignedVocabSets.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1e3a5f' }}><Type className="w-4 h-4" />오늘의 어휘 테스트</h3>
            {mainResult ? (
              <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: mainResult.passed ? '#86efac' : needsRetake ? '#fca5a5' : '#ebe1d0' }}>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: mainResult.passed ? '#dcfce7' : '#fee2e2' }}>
                    {mainResult.passed ? <CheckCircle2 className="w-6 h-6" style={{ color: '#2d7a3e' }} /> : <AlertTriangle className="w-6 h-6" style={{ color: '#c33' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold" style={{ color: '#1e3a5f' }}>{mainResult.passed ? '오늘 어휘 테스트 합격! 🎉' : `${mainResult.score}점 (합격선 ${passRate}점)`}</div>
                    <div className="text-xs mt-1" style={{ color: '#a08968' }}>
                      {mainResult.passed ? '수고했어요. 본 학습으로 넘어가세요!' : needsRetake ? '수업 끝난 후 재시험 예정이에요' : retakeResult ? `재시험: ${retakeResult.score}점 ${retakeResult.passed ? '✅ 합격' : ''}` : ''}
                    </div>
                  </div>
                  {needsRetake && (
                    <button onClick={() => { setVocabSetId(mainResult.vocabSetId); setIsRetake(true); setView('vocab') }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#c33' }}>재시험 보기</button>
                  )}
                </div>
              </div>
            ) : (
              <button onClick={() => { setVocabSetId(assignedVocabSets[0].id); setIsRetake(false); setView('vocab') }} className="w-full bg-white rounded-2xl p-5 border-2 border-dashed flex items-center gap-4 hover:shadow-md" style={{ borderColor: '#1e3a5f' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#1e3a5f' }}><Sparkles className="w-6 h-6 text-white" /></div>
                <div className="flex-1 text-left">
                  <div className="font-bold" style={{ color: '#1e3a5f' }}>어휘 테스트 시작하기</div>
                  <div className="text-xs mt-1" style={{ color: '#a08968' }}>{assignedVocabSets[0].title} · {assignedVocabSets[0].words.length}단어 · 합격선 {passRate}점</div>
                </div>
                <ChevronRight className="w-5 h-5" style={{ color: '#1e3a5f' }} />
              </button>
            )}
          </div>
        )}

        {assignedPassages.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border" style={{ borderColor: '#ebe1d0' }}>
            <div className="text-3xl mb-2">📚</div>
            <div style={{ color: '#a08968' }}>아직 배정된 학습이 없어요</div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-bold mb-3" style={{ color: '#1e3a5f' }}>지문 학습</h3>
            {assignedPassages.map(p => {
              const atts = myAttempts.filter(a => a.passageId === p.id)
              const last = atts[atts.length - 1]
              const score = last ? Math.round((last.results.filter(r => r.correct).length / last.results.length) * 100) : null
              return (
                <button key={p.id} onClick={() => { setCurrentPassageId(p.id); setView('study') }} className="w-full bg-white rounded-xl p-5 border hover:shadow-md text-left flex items-center gap-4" style={{ borderColor: '#ebe1d0' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5efe6' }}><Play className="w-5 h-5" style={{ color: '#1e3a5f' }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs mb-1" style={{ color: '#a08968' }}>{p.school} · {p.lesson}</div>
                    <div className="font-semibold" style={{ color: '#1e3a5f' }}>{p.title}</div>
                    <div className="text-xs mt-1" style={{ color: '#a08968' }}>문제 {p.questions.length}개{atts.length > 0 && ` · ${atts.length}회 풀이`}</div>
                  </div>
                  {score !== null && (
                    <div className="text-2xl font-bold" style={{ color: score >= 80 ? '#2d7a3e' : score >= 60 ? '#d97706' : '#c33' }}>{score}점</div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function VocabTestScreen({ vocabSet, passRate, isRetake, onComplete }) {
  const [questions] = useState(() => vocabSet.words.map(w => {
    let type = w.testType
    if (type === 'mixed' || !type) {
      const types = ['en2ko', 'ko2en', 'multiple']
      type = types[Math.floor(Math.random() * types.length)]
    }
    let options = null
    if (type === 'multiple') {
      const others = vocabSet.words.filter(x => x.id !== w.id)
      const shuf = [...others].sort(() => Math.random() - 0.5).slice(0, 3)
      const all = [w.korean, ...shuf.map(x => x.korean)].sort(() => Math.random() - 0.5)
      options = { list: all, answer: all.indexOf(w.korean) }
    }
    return { ...w, type, options }
  }))

  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [textIn, setTextIn] = useState('')
  const q = questions[idx]

  const handleSubmit = () => {
    let correct = false, ua = ''
    if (q.type === 'multiple') { ua = answers[idx]; correct = ua === q.options.answer }
    else if (q.type === 'en2ko') { ua = textIn.trim(); correct = normKr(ua) === normKr(q.korean) }
    else { ua = textIn.trim().toLowerCase(); correct = ua === q.english.toLowerCase() }

    const newA = { ...answers, [idx]: { userAnswer: ua, correct } }
    setAnswers(newA); setTextIn('')

    if (idx < questions.length - 1) setIdx(idx + 1)
    else {
      const cnt = Object.values(newA).filter(a => a.correct).length
      const score = Math.round((cnt / questions.length) * 100)
      const results = questions.map((qq, i) => ({ wordId: qq.id, english: qq.english, korean: qq.korean, type: qq.type, userAnswer: newA[i]?.userAnswer ?? '', correct: newA[i]?.correct || false }))
      onComplete(results, score)
    }
  }

  const canSubmit = q.type === 'multiple' ? answers[idx] !== undefined : textIn.trim().length > 0

  return (
    <div className="min-h-screen" style={{ background: '#f5efe6' }}>
      <header className="bg-white border-b sticky top-0 z-10" style={{ borderColor: '#ebe1d0' }}>
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><Type className="w-4 h-4" style={{ color: '#1e3a5f' }} /><div className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>{isRetake ? '재시험 - ' : ''}어휘 테스트</div></div>
          <div className="text-xs" style={{ color: '#a08968' }}>합격선 {passRate}점</div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="flex gap-1 mb-2">
          {questions.map((_, i) => <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i < idx ? '#2d7a3e' : i === idx ? '#1e3a5f' : '#ebe1d0' }} />)}
        </div>
        <div className="text-xs mb-6 text-center" style={{ color: '#a08968' }}>{idx + 1} / {questions.length}</div>

        <div className="bg-white rounded-2xl p-6 md:p-8 border mb-4" style={{ borderColor: '#ebe1d0' }}>
          <div className="mb-4">
            <span className="px-2 py-1 rounded text-xs font-semibold" style={{ background: '#f5efe6', color: '#1e3a5f' }}>{q.type === 'en2ko' ? '📖 뜻 쓰기' : q.type === 'ko2en' ? '✏️ 영어 쓰기' : '🔘 객관식'}</span>
          </div>

          {q.type === 'en2ko' && (<>
            <div className="text-xs mb-2" style={{ color: '#a08968' }}>다음 단어의 뜻을 쓰세요</div>
            <div className="text-3xl md:text-4xl font-bold mb-6 text-center py-6" style={{ color: '#1e3a5f', fontFamily: 'Georgia, serif' }}>{q.english}</div>
            <input autoFocus type="text" value={textIn} onChange={(e) => setTextIn(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()} placeholder="한국어 뜻을 입력하세요" className="w-full px-4 py-3 rounded-xl border-2 text-center text-lg" style={{ borderColor: '#ebe1d0' }} />
          </>)}

          {q.type === 'ko2en' && (<>
            <div className="text-xs mb-2" style={{ color: '#a08968' }}>다음 뜻에 해당하는 영어 단어를 쓰세요</div>
            <div className="text-2xl md:text-3xl font-bold mb-6 text-center py-6" style={{ color: '#1e3a5f' }}>{q.korean}</div>
            <input autoFocus type="text" value={textIn} onChange={(e) => setTextIn(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()} placeholder="영어 단어를 입력하세요" className="w-full px-4 py-3 rounded-xl border-2 text-center text-lg" style={{ borderColor: '#ebe1d0' }} />
          </>)}

          {q.type === 'multiple' && (<>
            <div className="text-xs mb-2" style={{ color: '#a08968' }}>다음 단어의 뜻으로 알맞은 것은?</div>
            <div className="text-3xl md:text-4xl font-bold mb-6 text-center py-6" style={{ color: '#1e3a5f', fontFamily: 'Georgia, serif' }}>{q.english}</div>
            <div className="space-y-2">
              {q.options.list.map((opt, i) => {
                const sel = answers[idx] === i
                return (
                  <button key={i} onClick={() => setAnswers({ ...answers, [idx]: i })} className="w-full p-4 rounded-xl border-2 text-left flex items-center gap-3" style={{ borderColor: sel ? '#1e3a5f' : '#ebe1d0', background: sel ? '#f5efe6' : 'white' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm" style={{ background: sel ? '#1e3a5f' : '#f5efe6', color: sel ? 'white' : '#a08968' }}>{['①', '②', '③', '④'][i]}</div>
                    <span style={{ color: '#1e3a5f' }}>{opt}</span>
                  </button>
                )
              })}
            </div>
          </>)}
        </div>

        <button onClick={handleSubmit} disabled={!canSubmit} className="w-full py-4 rounded-xl font-semibold text-white disabled:opacity-30" style={{ background: '#1e3a5f' }}>
          {idx < questions.length - 1 ? '다음 단어 →' : '제출하기'}
        </button>
      </main>
    </div>
  )
}

function VocabResultScreen({ result, passRate, onDone }) {
  const passed = result.score >= passRate
  const cnt = result.results.filter(r => r.correct).length

  return (
    <div className="min-h-screen" style={{ background: '#f5efe6' }}>
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 border text-center mb-4" style={{ borderColor: '#ebe1d0' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: passed ? '#dcfce7' : '#fee2e2' }}>
            {passed ? <Award className="w-8 h-8" style={{ color: '#2d7a3e' }} /> : <AlertTriangle className="w-8 h-8" style={{ color: '#c33' }} />}
          </div>
          <div className="text-5xl font-bold mb-2" style={{ color: passed ? '#2d7a3e' : '#c33' }}>{result.score}<span className="text-2xl">점</span></div>
          <div className="text-sm" style={{ color: '#a08968' }}>{cnt}/{result.results.length} 정답 · 합격선 {passRate}점</div>
          <div className="mt-3 inline-block px-3 py-1 rounded-full text-sm font-semibold" style={{ background: passed ? '#dcfce7' : '#fee2e2', color: passed ? '#2d7a3e' : '#c33' }}>
            {passed ? '✅ 합격' : result.is_retake ? '재시험 종료' : '❌ 불합격 - 수업 후 재시험'}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border mb-6" style={{ borderColor: '#ebe1d0' }}>
          <h3 className="font-bold mb-4" style={{ color: '#1e3a5f' }}>단어별 결과</h3>
          <div className="space-y-2">
            {result.results.map((r, i) => (
              <div key={i} className="p-3 rounded-xl border flex items-center gap-3" style={{ borderColor: r.correct ? '#86efac' : '#fca5a5', background: r.correct ? '#f0fdf4' : '#fef2f2' }}>
                {r.correct ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#2d7a3e' }} /> : <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#c33' }} />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ color: '#1e3a5f' }}>{r.english} <span className="text-sm font-normal" style={{ color: '#a08968' }}>= {r.korean}</span></div>
                  {!r.correct && <div className="text-xs mt-0.5" style={{ color: '#c33' }}>내 답: {r.userAnswer || '(미입력)'}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onDone} className="w-full py-4 rounded-xl font-semibold text-white" style={{ background: '#1e3a5f' }}>홈으로</button>
      </main>
    </div>
  )
}

function StudyScreen({ passage, onComplete, onBack }) {
  const hasVideo = !!passage.videoUrl
  const hasContent = !!(passage.passageText || passage.passageImage)
  const initialStage = hasVideo ? 'video' : (hasContent ? 'passage' : 'quiz')
  const [stage, setStage] = useState(initialStage)
  const [answers, setAnswers] = useState({})
  const [cur, setCur] = useState(0)
  const qs = passage.questions
  const allDone = qs.every((_, i) => answers[i] !== undefined)

  const stages = []
  if (hasVideo) stages.push('video')
  if (hasContent) stages.push('passage')
  stages.push('quiz')
  const idx = stages.indexOf(stage)
  const nextStage = stages[idx + 1]

  return (
    <div className="min-h-screen" style={{ background: '#f5efe6' }}>
      <header className="bg-white border-b sticky top-0 z-10" style={{ borderColor: '#ebe1d0' }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="text-sm font-semibold" style={{ color: '#a08968' }}>← 돌아가기</button>
          <div className="text-sm font-semibold truncate mx-2" style={{ color: '#1e3a5f' }}>{passage.title}</div>
          <div></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {stage === 'video' && hasVideo && (
          <div>
            <div className="bg-white rounded-2xl overflow-hidden border mb-4" style={{ borderColor: '#ebe1d0' }}>
              <div className="aspect-video bg-black"><iframe src={passage.videoUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={passage.title} /></div>
              <div className="p-5">
                <div className="text-xs mb-1" style={{ color: '#a08968' }}>{passage.school} · {passage.lesson}</div>
                <div className="font-bold text-lg" style={{ color: '#1e3a5f' }}>{passage.title}</div>
              </div>
            </div>
            <button onClick={() => setStage(nextStage)} className="w-full py-4 rounded-xl font-semibold text-white" style={{ background: '#1e3a5f' }}>영상 다 봤어요 → 다음</button>
          </div>
        )}

        {stage === 'passage' && hasContent && (
          <div>
            <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#ebe1d0' }}>
              <div className="text-xs mb-1" style={{ color: '#a08968' }}>{passage.school} · {passage.lesson}</div>
              <div className="font-bold text-lg mb-4" style={{ color: '#1e3a5f', fontFamily: 'Georgia, serif' }}>{passage.title}</div>
              {passage.passageImage && <div className="mb-4"><img src={passage.passageImage} alt={passage.title} className="max-w-full rounded-lg border" style={{ borderColor: '#ebe1d0' }} /></div>}
              {passage.passageText && <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: '#1e3a5f', fontFamily: 'Georgia, serif' }}>{passage.passageText}</div>}
            </div>
            <button onClick={() => setStage(nextStage)} className="w-full py-4 rounded-xl font-semibold text-white" style={{ background: '#1e3a5f' }}>지문 다 읽었어요 → 문제 풀러 가기</button>
          </div>
        )}

        {stage === 'quiz' && (
          <div>
            <div className="flex gap-1 mb-6">
              {qs.map((_, i) => <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: answers[i] !== undefined ? '#1e3a5f' : i === cur ? '#a08968' : '#ebe1d0' }} />)}
            </div>
            <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#ebe1d0' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-1 rounded text-xs font-semibold" style={{ background: '#f5efe6', color: '#1e3a5f' }}>{qs[cur].category}</span>
                <span className="text-xs" style={{ color: '#a08968' }}>{cur + 1} / {qs.length}</span>
              </div>
              <h3 className="text-lg font-semibold mb-4 whitespace-pre-wrap" style={{ color: '#1e3a5f' }}>{qs[cur].question}</h3>
              {qs[cur].questionImage && <div className="mb-5"><img src={qs[cur].questionImage} alt={`문제 ${cur + 1}`} className="max-w-full rounded-lg border" style={{ borderColor: '#ebe1d0' }} /></div>}
              <div className="space-y-2">
                {qs[cur].options.map((opt, i) => {
                  const sel = answers[cur] === i
                  return (
                    <button key={i} onClick={() => setAnswers({ ...answers, [cur]: i })} className="w-full p-4 rounded-xl border-2 text-left flex items-center gap-3" style={{ borderColor: sel ? '#1e3a5f' : '#ebe1d0', background: sel ? '#f5efe6' : 'white' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm" style={{ background: sel ? '#1e3a5f' : '#f5efe6', color: sel ? 'white' : '#a08968' }}>{['①', '②', '③', '④'][i]}</div>
                      <span style={{ color: '#1e3a5f' }}>{opt}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCur(Math.max(0, cur - 1))} disabled={cur === 0} className="flex-1 py-3 rounded-xl font-semibold border disabled:opacity-30" style={{ borderColor: '#ebe1d0', color: '#1e3a5f' }}>이전</button>
              {cur < qs.length - 1 ? (
                <button onClick={() => setCur(cur + 1)} disabled={answers[cur] === undefined} className="flex-[2] py-3 rounded-xl font-semibold text-white disabled:opacity-30" style={{ background: '#1e3a5f' }}>다음</button>
              ) : (
                <button onClick={() => onComplete(answers)} disabled={!allDone} className="flex-[2] py-3 rounded-xl font-semibold text-white disabled:opacity-30" style={{ background: '#2d7a3e' }}>제출하기</button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function ResultScreen({ attempt, passage, onDone }) {
  const cnt = attempt.results.filter(r => r.correct).length
  const score = Math.round((cnt / attempt.results.length) * 100)
  return (
    <div className="min-h-screen" style={{ background: '#f5efe6' }}>
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 border text-center mb-4" style={{ borderColor: '#ebe1d0' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: score >= 80 ? '#dcfce7' : score >= 60 ? '#fef3c7' : '#fee2e2' }}>
            <Award className="w-8 h-8" style={{ color: score >= 80 ? '#2d7a3e' : '#d97706' }} />
          </div>
          <div className="text-5xl font-bold mb-2" style={{ color: '#1e3a5f' }}>{score}<span className="text-2xl">점</span></div>
          <div className="text-sm" style={{ color: '#a08968' }}>{cnt} / {attempt.results.length} 정답</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border mb-6" style={{ borderColor: '#ebe1d0' }}>
          <h3 className="font-bold mb-4" style={{ color: '#1e3a5f' }}>문제별 결과</h3>
          <div className="space-y-3">
            {passage.questions.map((q, i) => {
              const ok = attempt.results[i].correct
              const my = attempt.answers[i]
              return (
                <div key={q.id} className="p-4 rounded-xl border" style={{ borderColor: '#ebe1d0' }}>
                  <div className="flex items-start gap-2 mb-2">
                    {ok ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#2d7a3e' }} /> : <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#c33' }} />}
                    <div className="flex-1">
                      <span className="text-xs px-2 py-0.5 rounded mr-2" style={{ background: '#f5efe6', color: '#1e3a5f' }}>{q.category}</span>
                      <span className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>{q.question}</span>
                    </div>
                  </div>
                  {!ok && (
                    <div className="ml-7 text-sm space-y-1">
                      <div style={{ color: '#c33' }}>내 답: {q.options[my]}</div>
                      <div style={{ color: '#2d7a3e' }}>정답: {q.options[q.answer]}</div>
                      {q.explanation && <div className="mt-2 p-2 rounded" style={{ background: '#f5efe6', color: '#1e3a5f' }}>💡 {q.explanation}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={onDone} className="w-full py-4 rounded-xl font-semibold text-white" style={{ background: '#1e3a5f' }}>홈으로</button>
      </main>
    </div>
  )
}

// ===== 선생님 모드 =====
function TeacherMode({ data, reloadData, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const tabs = [
    { id: 'dashboard', label: '대시보드', icon: BarChart3, color: '#1e3a5f' },
    { id: 'students', label: '학생 관리', icon: Users, color: '#7c3aed' },
    { id: 'vocab', label: '어휘 관리', icon: Type, color: '#2d7a3e' },
    { id: 'passages', label: '지문·문제', icon: FileText, color: '#d97706' },
    { id: 'exams', label: '시험 일정', icon: Calendar, color: '#c33' }
  ]

  return (
    <div className="min-h-screen" style={{ background: '#f5efe6' }}>
      <header className="bg-white border-b" style={{ borderColor: '#ebe1d0' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1e3a5f' }}><Settings className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-xs" style={{ color: '#a08968' }}>관리자 모드</div>
              <div className="font-bold" style={{ color: '#1e3a5f' }}>선생님</div>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm hover:bg-stone-100" style={{ color: '#a08968' }}><LogOut className="w-4 h-4" />로그아웃</button>
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-3 md:pb-0">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-1 md:flex">
            {tabs.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="flex md:flex-row flex-col items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-4 rounded-xl md:rounded-none text-xs md:text-sm font-semibold md:border-b-2"
                  style={{
                    background: active ? t.color : '#f5efe6',
                    color: active ? 'white' : '#1e3a5f'
                  }}>
                  <Icon className="w-4 h-4" />{t.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {tab === 'dashboard' && <Dashboard data={data} />}
        {tab === 'students' && <StudentManager data={data} reloadData={reloadData} />}
        {tab === 'vocab' && <VocabManager data={data} reloadData={reloadData} />}
        {tab === 'passages' && <PassageManager data={data} reloadData={reloadData} />}
        {tab === 'exams' && <ExamManager data={data} reloadData={reloadData} />}
      </main>
    </div>
  )
}

function Dashboard({ data }) {
  const today = todayStr()
  const todayVocab = data.vocabResults.filter(r => r.date === today && !r.isRetake)
  const failed = todayVocab.filter(r => !r.passed)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="총 학생 수" value={data.students.length} icon={Users} />
        <StatCard label="등록된 지문" value={data.passages.length} icon={FileText} />
        <StatCard label="오늘 어휘 응시" value={`${todayVocab.length}/${data.students.length}`} icon={Type} />
        <StatCard label="재시험 대상" value={failed.length} icon={AlertTriangle} highlight={failed.length > 0} />
      </div>

      {failed.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border-2" style={{ borderColor: '#fca5a5' }}>
          <h3 className="font-bold mb-3" style={{ color: '#c33' }}>오늘 재시험 필요한 학생</h3>
          <div className="flex flex-wrap gap-2">
            {failed.map(r => {
              const s = data.students.find(st => st.id === r.studentId)
              return <div key={r.id} className="px-3 py-2 rounded-lg text-sm" style={{ background: '#fee2e2', color: '#c33' }}><strong>{s?.name}</strong> · {r.score}점</div>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, highlight }) {
  return (
    <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: highlight ? '#fca5a5' : '#ebe1d0' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: '#a08968' }}>{label}</div>
        <Icon className="w-4 h-4" style={{ color: highlight ? '#c33' : '#a08968' }} />
      </div>
      <div className="text-3xl font-bold" style={{ color: highlight ? '#c33' : '#1e3a5f' }}>{value}</div>
    </div>
  )
}

function StudentManager({ data, reloadData }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', school: '', grade: '', password: '', passRate: 90 })
  const [assigning, setAssigning] = useState(null)

  const startNew = () => { setForm({ name: '', school: '', grade: '', password: '', passRate: 90 }); setEditingId(null); setShowForm(true) }
  const startEdit = (s) => { setForm({ name: s.name, school: s.school, grade: s.grade, password: s.password, passRate: s.passRate || 90 }); setEditingId(s.id); setShowForm(true) }

  const save = async () => {
    if (!form.name || !form.password) { alert('이름과 비밀번호 필수'); return }
    if (editingId) {
      await supabase.from('students').update({ name: form.name, password: form.password, school: form.school, grade: form.grade, pass_rate: parseInt(form.passRate) || 90 }).eq('id', editingId)
    } else {
      await supabase.from('students').insert({ id: `s${Date.now()}`, name: form.name, password: form.password, school: form.school, grade: form.grade, pass_rate: parseInt(form.passRate) || 90 })
    }
    await reloadData()
    setShowForm(false)
  }

  const remove = async (id) => {
    if (!confirm('정말 삭제할까요?')) return
    await supabase.from('students').delete().eq('id', id)
    await reloadData()
  }

  const togglePassage = async (sid, pid) => {
    const cur = data.passageAssignments[sid] || []
    if (cur.includes(pid)) {
      await supabase.from('passage_assignments').delete().eq('student_id', sid).eq('passage_id', pid)
    } else {
      await supabase.from('passage_assignments').insert({ student_id: sid, passage_id: pid })
    }
    await reloadData()
  }

  const toggleVocab = async (sid, vid) => {
    const cur = data.vocabAssignments[sid] || []
    if (cur.includes(vid)) {
      await supabase.from('vocab_assignments').delete().eq('student_id', sid).eq('vocab_set_id', vid)
    } else {
      await supabase.from('vocab_assignments').insert({ student_id: sid, vocab_set_id: vid })
    }
    await reloadData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>학생 관리</h2>
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#1e3a5f' }}><Plus className="w-4 h-4" />학생 추가</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#1e3a5f' }}>
          <h3 className="font-bold mb-4" style={{ color: '#1e3a5f' }}>{editingId ? '수정' : '새 학생 추가'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="비밀번호" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="학교" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="학년" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
            <input type="number" className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="합격선 (점)" value={form.passRate} onChange={(e) => setForm({ ...form, passRate: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-2 rounded-lg font-semibold text-white" style={{ background: '#1e3a5f' }}>저장</button>
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg font-semibold border" style={{ borderColor: '#ebe1d0', color: '#1e3a5f' }}>취소</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#ebe1d0' }}>
        {data.students.map(s => {
          const pAss = data.passageAssignments[s.id] || []
          const vAss = data.vocabAssignments[s.id] || []
          const exp = assigning === s.id
          return (
            <div key={s.id} className="border-b last:border-0" style={{ borderColor: '#f5efe6' }}>
              <div className="p-4 flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0" style={{ background: '#f5efe6', color: '#1e3a5f' }}>{s.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ color: '#1e3a5f' }}>{s.name}</div>
                  <div className="text-xs" style={{ color: '#a08968' }}>{s.school} · {s.grade} · 비번:{s.password} · 합격선{s.passRate}점</div>
                </div>
                <button onClick={() => setAssigning(exp ? null : s.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#f5efe6', color: '#1e3a5f' }}>학습 배정</button>
                <button onClick={() => startEdit(s)} className="p-2 rounded-lg hover:bg-stone-100"><Edit3 className="w-4 h-4" style={{ color: '#a08968' }} /></button>
                <button onClick={() => remove(s.id)} className="p-2 rounded-lg hover:bg-stone-100"><Trash2 className="w-4 h-4" style={{ color: '#c33' }} /></button>
              </div>
              {exp && (
                <div className="px-4 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-3" style={{ background: '#f5efe6' }}>
                  <div>
                    <div className="text-xs font-bold mb-2" style={{ color: '#1e3a5f' }}>📚 지문</div>
                    {data.passages.length === 0 ? <div className="text-xs" style={{ color: '#a08968' }}>등록된 지문 없음</div> :
                      data.passages.map(p => (
                        <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-white cursor-pointer mb-1">
                          <input type="checkbox" checked={pAss.includes(p.id)} onChange={() => togglePassage(s.id, p.id)} />
                          <span className="text-sm flex-1" style={{ color: '#1e3a5f' }}>{p.title}</span>
                        </label>
                      ))
                    }
                  </div>
                  <div>
                    <div className="text-xs font-bold mb-2" style={{ color: '#1e3a5f' }}>📝 어휘</div>
                    {data.vocabSets.length === 0 ? <div className="text-xs" style={{ color: '#a08968' }}>등록된 어휘 없음</div> :
                      data.vocabSets.map(v => (
                        <label key={v.id} className="flex items-center gap-2 p-2 rounded-lg bg-white cursor-pointer mb-1">
                          <input type="checkbox" checked={vAss.includes(v.id)} onChange={() => toggleVocab(s.id, v.id)} />
                          <span className="text-sm flex-1" style={{ color: '#1e3a5f' }}>{v.title} ({v.words.length}단어)</span>
                        </label>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VocabManager({ data, reloadData }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', school: '', grade: '', words: [] })
  const [bulk, setBulk] = useState('')

  const startNew = () => { setForm({ title: '', school: '', grade: '', words: [] }); setBulk(''); setEditingId(null); setShowForm(true) }
  const startEdit = (v) => { setForm({ ...v, words: [...v.words] }); setBulk(''); setEditingId(v.id); setShowForm(true) }

  const save = async () => {
    if (!form.title || form.words.length === 0) { alert('제목과 단어 필수'); return }
    if (editingId) {
      await supabase.from('vocab_sets').update({ title: form.title, school: form.school, grade: form.grade, words: form.words }).eq('id', editingId)
    } else {
      await supabase.from('vocab_sets').insert({ id: `v${Date.now()}`, title: form.title, school: form.school, grade: form.grade, words: form.words })
    }
    await reloadData()
    setShowForm(false)
  }

  const remove = async (id) => {
    if (!confirm('삭제?')) return
    await supabase.from('vocab_sets').delete().eq('id', id)
    await reloadData()
  }

  const addWord = () => setForm({ ...form, words: [...form.words, { id: `w${Date.now()}`, english: '', korean: '', testType: 'mixed' }] })
  const updWord = (i, f, v) => { const nw = [...form.words]; nw[i] = { ...nw[i], [f]: v }; setForm({ ...form, words: nw }) }
  const rmWord = (i) => setForm({ ...form, words: form.words.filter((_, x) => x !== i) })

  const bulkAdd = () => {
    if (!bulk.trim()) return
    const lines = bulk.trim().split('\n')
    const nw = lines.map((l, i) => {
      const p = l.split(/[,\t=]/).map(s => s.trim())
      if (p.length >= 2) return { id: `w${Date.now()}_${i}`, english: p[0], korean: p[1], testType: 'mixed' }
      return null
    }).filter(Boolean)
    setForm({ ...form, words: [...form.words, ...nw] })
    setBulk('')
  }

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>{editingId ? '수정' : '새 어휘 세트'}</h2>
          <button onClick={() => setShowForm(false)} className="text-sm font-semibold" style={{ color: '#a08968' }}>← 목록</button>
        </div>
        <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#ebe1d0' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input className="px-3 py-2 rounded-lg border md:col-span-3" style={{ borderColor: '#ebe1d0' }} placeholder="세트 제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="학교" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border md:col-span-2" style={{ borderColor: '#ebe1d0' }} placeholder="학년" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#ebe1d0' }}>
          <h3 className="font-bold mb-2" style={{ color: '#1e3a5f' }}>📥 일괄 입력</h3>
          <div className="text-xs mb-3" style={{ color: '#a08968' }}>한 줄에 한 단어, 쉼표로 구분 (예: reduce, 줄이다)</div>
          <textarea className="w-full px-3 py-2 rounded-lg border text-sm font-mono" style={{ borderColor: '#ebe1d0' }} rows={5} placeholder={'reduce, 줄이다\nprotect, 보호하다'} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <button onClick={bulkAdd} className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#2d7a3e' }}>일괄 추가</button>
        </div>
        <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#ebe1d0' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: '#1e3a5f' }}>단어 ({form.words.length}개)</h3>
            <button onClick={addWord} className="text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#f5efe6', color: '#1e3a5f' }}><Plus className="w-4 h-4 inline" />추가</button>
          </div>
          <div className="space-y-2">
            {form.words.map((w, i) => (
              <div key={w.id} className="flex items-center gap-2 p-2 rounded-lg border flex-wrap" style={{ borderColor: '#ebe1d0' }}>
                <span className="text-xs w-6 text-center" style={{ color: '#a08968' }}>{i + 1}</span>
                <input className="flex-1 min-w-[120px] px-2 py-1 rounded border text-sm" style={{ borderColor: '#ebe1d0' }} placeholder="English" value={w.english} onChange={(e) => updWord(i, 'english', e.target.value)} />
                <input className="flex-1 min-w-[120px] px-2 py-1 rounded border text-sm" style={{ borderColor: '#ebe1d0' }} placeholder="한국어" value={w.korean} onChange={(e) => updWord(i, 'korean', e.target.value)} />
                <select className="px-2 py-1 rounded border text-xs" style={{ borderColor: '#ebe1d0' }} value={w.testType || 'mixed'} onChange={(e) => updWord(i, 'testType', e.target.value)}>
                  <option value="mixed">섞기</option><option value="en2ko">영→한</option><option value="ko2en">한→영</option><option value="multiple">객관식</option>
                </select>
                <button onClick={() => rmWord(i)} className="p-1"><Trash2 className="w-3 h-3" style={{ color: '#c33' }} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-3 rounded-xl font-semibold text-white" style={{ background: '#1e3a5f' }}><Save className="w-4 h-4 inline mr-2" />저장</button>
          <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-semibold border" style={{ borderColor: '#ebe1d0', color: '#1e3a5f' }}>취소</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>어휘 세트</h2>
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#1e3a5f' }}><Plus className="w-4 h-4" />어휘 추가</button>
      </div>
      <div className="space-y-3">
        {data.vocabSets.length === 0 && <div className="bg-white rounded-2xl p-12 text-center border" style={{ borderColor: '#ebe1d0', color: '#a08968' }}>등록된 어휘 없음</div>}
        {data.vocabSets.map(v => (
          <div key={v.id} className="bg-white rounded-2xl p-5 border flex items-center gap-4" style={{ borderColor: '#ebe1d0' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5efe6' }}><Type className="w-5 h-5" style={{ color: '#1e3a5f' }} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-xs mb-1" style={{ color: '#a08968' }}>{v.school} · {v.grade}</div>
              <div className="font-semibold" style={{ color: '#1e3a5f' }}>{v.title}</div>
              <div className="text-xs mt-1" style={{ color: '#a08968' }}>{v.words.length}단어</div>
            </div>
            <button onClick={() => startEdit(v)} className="p-2"><Edit3 className="w-4 h-4" style={{ color: '#a08968' }} /></button>
            <button onClick={() => remove(v.id)} className="p-2"><Trash2 className="w-4 h-4" style={{ color: '#c33' }} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PassageManager({ data, reloadData }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ school: '', grade: '', lesson: '', title: '', videoUrl: '', passageText: '', passageImage: '', questions: [] })

  const startNew = () => { setForm({ school: '', grade: '', lesson: '', title: '', videoUrl: '', passageText: '', passageImage: '', questions: [] }); setEditingId(null); setShowForm(true) }
  const startEdit = (p) => {
    setForm({
      school: p.school || '', grade: p.grade || '', lesson: p.lesson || '', title: p.title || '',
      videoUrl: p.videoUrl || '', passageText: p.passageText || '', passageImage: p.passageImage || '',
      questions: p.questions.map(q => ({ ...q, options: [...q.options], questionImage: q.questionImage || '' }))
    })
    setEditingId(p.id); setShowForm(true)
  }

  const save = async () => {
    if (!form.title || !form.school) { alert('학교와 제목 필수'); return }
    const payload = {
      title: form.title, school: form.school, grade: form.grade, lesson: form.lesson,
      video_url: form.videoUrl, passage_text: form.passageText, passage_image: form.passageImage,
      questions: form.questions
    }
    if (editingId) {
      await supabase.from('passages').update(payload).eq('id', editingId)
    } else {
      await supabase.from('passages').insert({ id: `p${Date.now()}`, ...payload })
    }
    await reloadData()
    setShowForm(false)
  }

  const remove = async (id) => {
    if (!confirm('삭제?')) return
    await supabase.from('passages').delete().eq('id', id)
    await reloadData()
  }

  const addQ = () => setForm({ ...form, questions: [...form.questions, { id: `q${Date.now()}`, category: '어법', question: '', questionImage: '', options: ['', '', '', ''], answer: 0, explanation: '' }] })
  const updQ = (i, f, v) => { const nq = [...form.questions]; nq[i] = { ...nq[i], [f]: v }; setForm({ ...form, questions: nq }) }
  const updOpt = (qi, oi, v) => { const nq = [...form.questions]; const no = [...nq[qi].options]; no[oi] = v; nq[qi] = { ...nq[qi], options: no }; setForm({ ...form, questions: nq }) }
  const rmQ = (i) => setForm({ ...form, questions: form.questions.filter((_, x) => x !== i) })

  const handleImageUpload = (file, callback) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('이미지 2MB 이하만'); return }
    const reader = new FileReader()
    reader.onload = (e) => callback(e.target.result)
    reader.readAsDataURL(file)
  }

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>{editingId ? '✏️ 지문 수정' : '📝 새 지문 등록'}</h2>
          <button onClick={() => setShowForm(false)} className="text-sm font-semibold" style={{ color: '#a08968' }}>← 목록</button>
        </div>
        <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#ebe1d0' }}>
          <h3 className="font-bold mb-4" style={{ color: '#1e3a5f' }}>1. 기본 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="학교 *" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="학년" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="단원" value={form.lesson} onChange={(e) => setForm({ ...form, lesson: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="지문 제목 *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#ebe1d0' }}>
          <h3 className="font-bold mb-4" style={{ color: '#1e3a5f' }}>2. 지문 본문 (텍스트/이미지 둘 다 가능)</h3>
          <textarea className="w-full px-3 py-2 rounded-lg border text-sm leading-relaxed mb-3" style={{ borderColor: '#ebe1d0' }} rows={6} placeholder="지문 본문 텍스트" value={form.passageText} onChange={(e) => setForm({ ...form, passageText: e.target.value })} />
          {form.passageImage ? (
            <div className="relative inline-block">
              <img src={form.passageImage} alt="지문" className="max-w-full max-h-64 rounded-lg border" style={{ borderColor: '#ebe1d0' }} />
              <button onClick={() => setForm({ ...form, passageImage: '' })} className="absolute top-2 right-2 w-8 h-8 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.6)' }}><X className="w-4 h-4 mx-auto" /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed cursor-pointer" style={{ borderColor: '#ebe1d0' }}>
              <Upload className="w-5 h-5" style={{ color: '#1e3a5f' }} />
              <span className="text-sm" style={{ color: '#1e3a5f' }}>지문 이미지 업로드 (2MB 이하)</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], (img) => setForm({ ...form, passageImage: img }))} />
            </label>
          )}
          <input className="w-full mt-3 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#ebe1d0' }} placeholder="유튜브 임베드 URL (선택)" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
        </div>
        <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#ebe1d0' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: '#1e3a5f' }}>3. 문제 ({form.questions.length}개)</h3>
            <button onClick={addQ} className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#2d7a3e' }}><Plus className="w-4 h-4" />문제 추가</button>
          </div>
          <div className="space-y-4">
            {form.questions.map((q, qi) => (
              <div key={q.id} className="p-4 rounded-xl border-2" style={{ borderColor: '#ebe1d0', background: '#fafafa' }}>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white" style={{ background: '#1e3a5f' }}>Q{qi + 1}</div>
                  <select className="px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: '#ebe1d0' }} value={q.category} onChange={(e) => updQ(qi, 'category', e.target.value)}>
                    <option>어법</option><option>어휘</option><option>독해</option><option>빈칸</option><option>주제</option>
                  </select>
                  <button onClick={() => rmQ(qi)} className="ml-auto px-3 py-1 rounded-lg text-xs" style={{ background: '#fee2e2', color: '#c33' }}>삭제</button>
                </div>
                <textarea className="w-full px-3 py-2 rounded-lg border text-sm mb-3" style={{ borderColor: '#ebe1d0', background: 'white' }} placeholder="문제 내용" rows={2} value={q.question} onChange={(e) => updQ(qi, 'question', e.target.value)} />
                {q.questionImage ? (
                  <div className="relative inline-block mb-3">
                    <img src={q.questionImage} alt={`문제 ${qi + 1}`} className="max-w-full max-h-40 rounded-lg border" style={{ borderColor: '#ebe1d0' }} />
                    <button onClick={() => updQ(qi, 'questionImage', '')} className="absolute top-1 right-1 w-7 h-7 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.6)' }}><X className="w-3 h-3 mx-auto" /></button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer text-xs mb-3" style={{ borderColor: '#ebe1d0' }}>
                    <Upload className="w-4 h-4" style={{ color: '#a08968' }} /><span style={{ color: '#a08968' }}>문제 이미지 업로드 (선택)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], (img) => updQ(qi, 'questionImage', img))} />
                  </label>
                )}
                <div className="space-y-2 mb-3">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: q.answer === oi ? '#dcfce7' : 'white', border: `1px solid ${q.answer === oi ? '#86efac' : '#ebe1d0'}` }}>
                      <input type="radio" checked={q.answer === oi} onChange={() => updQ(qi, 'answer', oi)} />
                      <span className="text-sm w-6" style={{ color: '#a08968' }}>{['①', '②', '③', '④'][oi]}</span>
                      <input className="flex-1 px-2 py-1 rounded border-0 text-sm bg-transparent" style={{ color: '#1e3a5f' }} placeholder={`보기 ${oi + 1}`} value={opt} onChange={(e) => updOpt(qi, oi, e.target.value)} />
                      {q.answer === oi && <span className="text-xs font-bold" style={{ color: '#2d7a3e' }}>✓</span>}
                    </div>
                  ))}
                </div>
                <textarea className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#ebe1d0', background: 'white' }} placeholder="해설" rows={2} value={q.explanation} onChange={(e) => updQ(qi, 'explanation', e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-4 rounded-xl font-bold text-white" style={{ background: '#1e3a5f' }}><Save className="w-4 h-4 inline mr-2" />저장</button>
          <button onClick={() => setShowForm(false)} className="flex-1 py-4 rounded-xl font-semibold border-2 bg-white" style={{ borderColor: '#ebe1d0', color: '#1e3a5f' }}>취소</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>📚 지문 / 문제 관리</h2>
        <button onClick={startNew} className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-md" style={{ background: '#1e3a5f' }}><Plus className="w-5 h-5" />새 지문 + 문제 등록</button>
      </div>
      {data.passages.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed" style={{ borderColor: '#ebe1d0' }}>
          <div className="text-5xl mb-4">📝</div>
          <div className="font-bold mb-2" style={{ color: '#1e3a5f' }}>아직 등록된 지문이 없어요</div>
          <button onClick={startNew} className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white" style={{ background: '#1e3a5f' }}><Plus className="w-5 h-5" />지금 등록하기</button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.passages.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-5 border flex items-center gap-4" style={{ borderColor: '#ebe1d0' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5efe6' }}><FileText className="w-5 h-5" style={{ color: '#1e3a5f' }} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs mb-1" style={{ color: '#a08968' }}>{p.school} · {p.grade} · {p.lesson}</div>
                <div className="font-semibold" style={{ color: '#1e3a5f' }}>{p.title}</div>
                <div className="text-xs mt-1" style={{ color: '#a08968' }}>문제 {p.questions.length}개</div>
              </div>
              <button onClick={() => startEdit(p)} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: '#f5efe6', color: '#1e3a5f' }}>수정</button>
              <button onClick={() => remove(p.id)} className="p-2"><Trash2 className="w-4 h-4" style={{ color: '#c33' }} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExamManager({ data, reloadData }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ school: '', grade: '', title: '', date: '' })

  const save = async () => {
    if (!form.school || !form.title || !form.date) { alert('필수 항목 입력'); return }
    await supabase.from('exam_schedules').insert({ id: `e${Date.now()}`, ...form })
    await reloadData()
    setShowForm(false)
    setForm({ school: '', grade: '', title: '', date: '' })
  }

  const remove = async (id) => {
    if (!confirm('삭제?')) return
    await supabase.from('exam_schedules').delete().eq('id', id)
    await reloadData()
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const sorted = [...data.examSchedules].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>시험 일정</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#1e3a5f' }}><Plus className="w-4 h-4" />추가</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl p-6 border mb-4" style={{ borderColor: '#1e3a5f' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="학교" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border" style={{ borderColor: '#ebe1d0' }} placeholder="학년" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
            <input className="px-3 py-2 rounded-lg border md:col-span-2" style={{ borderColor: '#ebe1d0' }} placeholder="시험명 (예: 1학기 중간고사)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input type="date" className="px-3 py-2 rounded-lg border md:col-span-2" style={{ borderColor: '#ebe1d0' }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-2 rounded-lg font-semibold text-white" style={{ background: '#1e3a5f' }}>저장</button>
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg font-semibold border" style={{ borderColor: '#ebe1d0', color: '#1e3a5f' }}>취소</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {sorted.map(e => {
          const d = new Date(e.date); d.setHours(0, 0, 0, 0)
          const dDay = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
          return (
            <div key={e.id} className="bg-white rounded-2xl p-5 border flex items-center gap-4" style={{ borderColor: '#ebe1d0' }}>
              <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: dDay < 0 ? '#f5efe6' : dDay <= 7 ? '#fee2e2' : '#dbeafe' }}>
                <div className="text-xs font-semibold" style={{ color: dDay < 0 ? '#a08968' : dDay <= 7 ? '#c33' : '#1e40af' }}>{dDay < 0 ? '종료' : 'D-'}</div>
                <div className="text-2xl font-bold" style={{ color: dDay < 0 ? '#a08968' : dDay <= 7 ? '#c33' : '#1e40af' }}>{dDay < 0 ? '' : dDay}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs mb-1" style={{ color: '#a08968' }}>{e.school} · {e.grade}</div>
                <div className="font-semibold" style={{ color: '#1e3a5f' }}>{e.title}</div>
                <div className="text-xs mt-1" style={{ color: '#a08968' }}>{new Date(e.date).toLocaleDateString('ko-KR')}</div>
              </div>
              <button onClick={() => remove(e.id)} className="p-2"><Trash2 className="w-4 h-4" style={{ color: '#c33' }} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
