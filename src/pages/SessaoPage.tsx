import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { IconX, IconCheck, IconArrowRight, IconBook } from '../components/Icons'

interface Alternativa { letra: string; texto: string; html: string | null; correta: boolean }
interface Questao {
  id: string; enunciado_html: string; alternativas: Alternativa[]; gabarito_letra: string
  comentario_html: string | null; disciplina: string; assunto: string | null; tem_imagem: boolean; banca: string | null; ano: number | null
}

type FaseResposta = 'aguardando' | 'respondida'

export function SessaoPage() {
  const { slug, disciplina } = useParams<{ slug: string; disciplina: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [indice, setIndice] = useState(0)
  const [fase, setFase] = useState<FaseResposta>('aguardando')
  const [letraSelecionada, setLetraSelecionada] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [trilhaNome, setTrilhaNome] = useState('')

  const questaoAtual = questoes[indice]
  const nivelFiltro = searchParams.get('nivel') ?? null
  const bancasFiltro = searchParams.get('bancas')?.split(',').filter(Boolean) ?? []
  const anosFiltro = searchParams.get('anos')?.split(',').map(Number).filter(Boolean) ?? []
  const soNaoRespondidas = searchParams.get('soNaoRespondidas') !== 'false'
  const temFiltrosAtivos = !!nivelFiltro || bancasFiltro.length > 0 || anosFiltro.length > 0 || !soNaoRespondidas

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const disciplinaDecoded = decodeURIComponent(disciplina!)
      const [{ data: trilha }, { data: respondidas }] = await Promise.all([
        supabase.from('trilhas').select('nome').eq('slug', slug!).single(),
        supabase.from('progresso_questoes').select('questao_id').eq('usuario_id', user.id),
      ])
      setTrilhaNome((trilha as { nome: string } | null)?.nome ?? '')
      const respondidaIds = new Set(((respondidas ?? []) as { questao_id: string }[]).map((r) => r.questao_id))
      let query = supabase.from('questoes')
        .select('id, enunciado_html, alternativas, gabarito_letra, comentario_html, disciplina, assunto, tem_imagem, banca, ano')
        .eq('disciplina', disciplinaDecoded).eq('anulada', false).eq('desatualizada', false)
        .order('assunto', { ascending: true }).order('id', { ascending: true })
      if (nivelFiltro) query = query.eq('nivel_escolaridade', nivelFiltro)
      if (bancasFiltro.length > 0) query = query.in('banca', bancasFiltro)
      if (anosFiltro.length > 0) query = query.in('ano', anosFiltro)
      const { data } = await query
      const filtradas = soNaoRespondidas ? ((data ?? []) as Questao[]).filter((q) => !respondidaIds.has(q.id)) : (data ?? []) as Questao[]
      setQuestoes(filtradas)
      setLoading(false)
    }
    load()
  }, [slug, disciplina, user])

  const registrarResposta = useCallback(async (letra: string) => {
    if (fase === 'respondida' || !questaoAtual) return
    setLetraSelecionada(letra)
    setFase('respondida')
    await supabase.from('progresso_questoes').insert({ usuario_id: user!.id, questao_id: questaoAtual.id, acertou: letra === questaoAtual.gabarito_letra })
  }, [fase, questaoAtual, user])

  const proximaQuestao = () => {
    if (indice + 1 >= questoes.length) {
      navigate(temFiltrosAtivos ? `/trilha/${slug}/disciplina/${disciplina}` : `/trilha/${slug}/disciplina/${disciplina}/concluida`)
      return
    }
    setIndice((i) => i + 1); setFase('aguardando'); setLetraSelecionada(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#081529' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse" style={{ background: 'rgba(245,195,59,0.1)', border: '1px solid rgba(245,195,59,0.2)' }}>
            <IconBook size={20} color="#F5C33B" />
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Carregando questões...</p>
        </div>
      </div>
    )
  }

  if (questoes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#081529' }}>
        <div className="rounded-2xl p-8 max-w-sm w-full text-center" style={{ background: '#0C1E3D', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(245,195,59,0.1)', border: '1px solid rgba(245,195,59,0.2)' }}>
            <IconCheck size={20} color="#F5C33B" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Tudo respondido!</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>Você respondeu todas as questões desta disciplina com os filtros selecionados.</p>
          <button onClick={() => navigate(`/trilha/${slug}`)} className="btn-primary w-full">Voltar para a trilha</button>
        </div>
      </div>
    )
  }

  const progressoPct = Math.round((indice / questoes.length) * 100)
  const acertou = letraSelecionada === questaoAtual?.gabarito_letra

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#081529' }}>
      {/* Header */}
      <header style={{ background: '#0C1E3D', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-2.5">
            <button
              onClick={() => navigate(`/trilha/${slug}/disciplina/${disciplina}${nivelFiltro ? `?nivel=${nivelFiltro}` : ''}`)}
              className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            >
              <IconX size={14} />
            </button>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressoPct}%`, background: 'linear-gradient(90deg, #F5C33B 0%, #D4A017 100%)' }} />
            </div>
            <span className="text-xs font-semibold text-white shrink-0">
              {indice + 1}<span style={{ color: 'rgba(255,255,255,0.3)' }}>/{questoes.length}</span>
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {trilhaNome} · {decodeURIComponent(disciplina!)}
            {temFiltrosAtivos && <span style={{ color: '#F5C33B' }}> · filtros ativos</span>}
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {/* Tags */}
        {(questaoAtual.banca || questaoAtual.ano || questaoAtual.assunto) && (
          <div className="flex flex-wrap gap-1.5">
            {questaoAtual.banca && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(245,195,59,0.1)', color: '#F5C33B', border: '1px solid rgba(245,195,59,0.2)' }}>{questaoAtual.banca}</span>
            )}
            {questaoAtual.ano && (
              <span className="px-2.5 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>{questaoAtual.ano}</span>
            )}
            {questaoAtual.assunto && (
              <span className="px-2.5 py-1 rounded-lg text-xs max-w-[220px] truncate" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>{questaoAtual.assunto}</span>
            )}
          </div>
        )}

        {/* Enunciado */}
        <div className="rounded-xl p-5" style={{ background: '#0C1E3D', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="questao-html text-white leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: questaoAtual.enunciado_html }} />
        </div>

        {/* Alternativas */}
        <div className="space-y-2">
          {questaoAtual.alternativas.map((alt) => {
            const selecionada = letraSelecionada === alt.letra
            const correta = alt.letra === questaoAtual.gabarito_letra
            const respondida = fase === 'respondida'
            let style: React.CSSProperties = { background: '#0C1E3D', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.85)' }
            if (respondida) {
              if (correta) style = { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)', color: '#bbf7d0' }
              else if (selecionada) style = { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#fecaca' }
              else style = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }
            }
            return (
              <button key={alt.letra} onClick={() => registrarResposta(alt.letra)} disabled={respondida} className="w-full text-left rounded-xl px-4 py-3 transition-all disabled:cursor-default" style={style}>
                <div className="flex items-start gap-3">
                  <span className="font-bold text-sm shrink-0 mt-0.5 w-5" style={{ color: respondida && correta ? '#4ade80' : respondida && selecionada ? '#f87171' : '#F5C33B' }}>
                    {alt.letra})
                  </span>
                  <span className="text-sm leading-relaxed flex-1">
                    {alt.html ? <span dangerouslySetInnerHTML={{ __html: alt.html }} /> : alt.texto}
                  </span>
                  {respondida && correta && <IconCheck size={16} color="#4ade80" className="shrink-0 mt-0.5" />}
                  {respondida && selecionada && !correta && <IconX size={16} color="#f87171" className="shrink-0 mt-0.5" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {fase === 'respondida' && (
          <div className="rounded-xl p-4" style={acertou
            ? { background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' }
            : { background: 'rgba(239,68,68,0.08)', borderLeft: '3px solid #ef4444' }
          }>
            <div className="flex items-center gap-2 mb-1.5">
              {acertou
                ? <><IconCheck size={15} color="#4ade80" /><span className="font-semibold text-sm" style={{ color: '#86efac' }}>Resposta correta!</span></>
                : <><IconX size={15} color="#f87171" /><span className="font-semibold text-sm" style={{ color: '#fca5a5' }}>Gabarito: {questaoAtual.gabarito_letra})</span></>
              }
            </div>
            {questaoAtual.comentario_html && (
              <div className="questao-html text-sm leading-relaxed pt-3 mt-1" style={{ color: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(255,255,255,0.07)' }}
                dangerouslySetInnerHTML={{ __html: questaoAtual.comentario_html }} />
            )}
          </div>
        )}

        {fase === 'respondida' && <div className="h-16" />}
      </main>

      {fase === 'respondida' && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-3" style={{ background: '#0C1E3D', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="max-w-xl mx-auto">
            <button onClick={proximaQuestao} className="btn-primary w-full flex items-center justify-center gap-2">
              {indice + 1 >= questoes.length ? 'Concluir disciplina' : 'Próxima questão'}
              <IconArrowRight size={16} color="#081529" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
