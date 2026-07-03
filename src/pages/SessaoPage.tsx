import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Alternativa {
  letra: string
  texto: string
  html: string | null
  correta: boolean
}

interface Questao {
  id: string
  enunciado_html: string
  alternativas: Alternativa[]
  gabarito_letra: string
  comentario_html: string | null
  disciplina: string
  assunto: string | null
  tem_imagem: boolean
  banca: string | null
  ano: number | null
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
      const respondidaIds = new Set(
        ((respondidas ?? []) as { questao_id: string }[]).map((r) => r.questao_id)
      )

      let query = supabase
        .from('questoes')
        .select('id, enunciado_html, alternativas, gabarito_letra, comentario_html, disciplina, assunto, tem_imagem, banca, ano')
        .eq('disciplina', disciplinaDecoded)
        .eq('anulada', false)
        .eq('desatualizada', false)
        .order('assunto', { ascending: true })
        .order('id', { ascending: true })

      if (nivelFiltro) query = query.eq('nivel_escolaridade', nivelFiltro)
      if (bancasFiltro.length > 0) query = query.in('banca', bancasFiltro)
      if (anosFiltro.length > 0) query = query.in('ano', anosFiltro)

      const { data: todasQuestoes } = await query
      const questoesFiltradas = soNaoRespondidas
        ? ((todasQuestoes ?? []) as Questao[]).filter((q) => !respondidaIds.has(q.id))
        : ((todasQuestoes ?? []) as Questao[])

      setQuestoes(questoesFiltradas)
      setLoading(false)
    }
    load()
  }, [slug, disciplina, user])

  const registrarResposta = useCallback(async (letra: string) => {
    if (fase === 'respondida' || !questaoAtual) return
    setLetraSelecionada(letra)
    setFase('respondida')
    await supabase.from('progresso_questoes').insert({
      usuario_id: user!.id,
      questao_id: questaoAtual.id,
      acertou: letra === questaoAtual.gabarito_letra,
    })
  }, [fase, questaoAtual, user])

  const proximaQuestao = () => {
    if (indice + 1 >= questoes.length) {
      navigate(temFiltrosAtivos
        ? `/trilha/${slug}/disciplina/${disciplina}`
        : `/trilha/${slug}/disciplina/${disciplina}/concluida`
      )
      return
    }
    setIndice((i) => i + 1)
    setFase('aguardando')
    setLetraSelecionada(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gold-400 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">📖</span>
          </div>
          <p className="text-navy-300">Carregando questões...</p>
        </div>
      </div>
    )
  }

  if (questoes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Tudo respondido!</h2>
          <p className="text-gray-500 mb-6">Você respondeu todas as questões desta disciplina com os filtros selecionados.</p>
          <button onClick={() => navigate(`/trilha/${slug}`)} className="btn-primary w-full">
            Voltar para a trilha
          </button>
        </div>
      </div>
    )
  }

  const progressoPct = Math.round((indice / questoes.length) * 100)
  const acertou = letraSelecionada === questaoAtual?.gabarito_letra

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-navy-900 px-4 pt-4 pb-3">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(`/trilha/${slug}/disciplina/${disciplina}${nivelFiltro ? `?nivel=${nivelFiltro}` : ''}`)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-navy-800 hover:bg-navy-700 text-white text-lg transition-colors shrink-0"
            >
              ✕
            </button>
            <div className="flex-1 h-2.5 bg-navy-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-400 rounded-full transition-all duration-300"
                style={{ width: `${progressoPct}%` }}
              />
            </div>
            <span className="text-sm text-navy-300 font-semibold whitespace-nowrap">
              {indice + 1}<span className="text-navy-600">/{questoes.length}</span>
            </span>
          </div>
          <p className="text-xs text-navy-500 truncate">
            {trilhaNome} · {decodeURIComponent(disciplina!)}
            {temFiltrosAtivos && <span className="text-gold-400 ml-1">· filtros ativos</span>}
          </p>
        </div>
      </header>

      {/* Questão */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {/* Tags */}
        {(questaoAtual.banca || questaoAtual.ano || questaoAtual.assunto) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {questaoAtual.banca && (
              <span className="bg-navy-100 text-navy-700 px-2.5 py-1 rounded-lg font-semibold">
                {questaoAtual.banca}
              </span>
            )}
            {questaoAtual.ano && (
              <span className="bg-navy-100 text-navy-600 px-2.5 py-1 rounded-lg">
                {questaoAtual.ano}
              </span>
            )}
            {questaoAtual.assunto && (
              <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg max-w-[200px] truncate">
                {questaoAtual.assunto}
              </span>
            )}
          </div>
        )}

        {/* Enunciado */}
        <div className="bg-white border border-navy-100 rounded-2xl p-5 shadow-sm">
          <div
            className="questao-html text-navy-900 leading-relaxed text-sm"
            dangerouslySetInnerHTML={{ __html: questaoAtual.enunciado_html }}
          />
        </div>

        {/* Alternativas */}
        <div className="space-y-2.5">
          {questaoAtual.alternativas.map((alt) => {
            const selecionada = letraSelecionada === alt.letra
            const correta = alt.letra === questaoAtual.gabarito_letra
            const respondida = fase === 'respondida'

            let estilo = 'border-2 border-navy-100 bg-white text-navy-800 hover:border-navy-400 hover:bg-navy-50'
            if (respondida) {
              if (correta) estilo = 'border-2 border-green-500 bg-green-50 text-green-900'
              else if (selecionada) estilo = 'border-2 border-red-400 bg-red-50 text-red-900'
              else estilo = 'border-2 border-navy-100 bg-gray-50 text-gray-400'
            }

            return (
              <button
                key={alt.letra}
                onClick={() => registrarResposta(alt.letra)}
                disabled={respondida}
                className={`w-full text-left rounded-xl px-4 py-3 transition-all ${estilo} disabled:cursor-default`}
              >
                <div className="flex items-start gap-3">
                  <span className={`font-bold text-sm shrink-0 mt-0.5 w-5 ${
                    respondida && correta ? 'text-green-600' : respondida && selecionada ? 'text-red-500' : 'text-navy-500'
                  }`}>
                    {alt.letra})
                  </span>
                  <span className="text-sm leading-relaxed flex-1">
                    {alt.html ? <span dangerouslySetInnerHTML={{ __html: alt.html }} /> : alt.texto}
                  </span>
                  {respondida && correta && <span className="shrink-0 text-green-500 font-bold">✓</span>}
                  {respondida && selecionada && !correta && <span className="shrink-0 text-red-400 font-bold">✕</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {fase === 'respondida' && (
          <div className={`rounded-2xl p-5 border-l-4 ${
            acertou
              ? 'bg-green-50 border-l-green-500'
              : 'bg-red-50 border-l-red-400'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {acertou ? (
                <>
                  <span className="text-green-600 text-xl font-bold">✓</span>
                  <span className="font-bold text-green-800">Correto!</span>
                </>
              ) : (
                <>
                  <span className="text-red-500 text-xl font-bold">✕</span>
                  <span className="font-bold text-red-700">Gabarito: {questaoAtual.gabarito_letra})</span>
                </>
              )}
            </div>
            {questaoAtual.comentario_html && (
              <div
                className="questao-html text-sm text-gray-700 leading-relaxed mt-3 pt-3 border-t border-gray-200"
                dangerouslySetInnerHTML={{ __html: questaoAtual.comentario_html }}
              />
            )}
          </div>
        )}

        {fase === 'respondida' && <div className="h-16" />}
      </main>

      {/* Botão próxima */}
      {fase === 'respondida' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-navy-100 px-4 py-4 shadow-lg">
          <div className="max-w-xl mx-auto">
            <button onClick={proximaQuestao} className="btn-primary w-full text-base">
              {indice + 1 >= questoes.length ? 'Concluir disciplina' : 'Próxima questão →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
