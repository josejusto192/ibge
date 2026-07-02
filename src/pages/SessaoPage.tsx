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

  // Filtros vindos da URL
  const nivelFiltro = searchParams.get('nivel') ?? null
  const bancasFiltro = searchParams.get('bancas')?.split(',').filter(Boolean) ?? []
  const anosFiltro = searchParams.get('anos')?.split(',').map(Number).filter(Boolean) ?? []
  const soNaoRespondidas = searchParams.get('soNaoRespondidas') !== 'false'

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const disciplinaDecoded = decodeURIComponent(disciplina!)

      const [{ data: trilha }, { data: respondidas }] = await Promise.all([
        supabase.from('trilhas').select('nome').eq('slug', slug!).single(),
        supabase
          .from('progresso_questoes')
          .select('questao_id')
          .eq('usuario_id', user.id),
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

    const acertou = letra === questaoAtual.gabarito_letra
    setLetraSelecionada(letra)
    setFase('respondida')

    await supabase.from('progresso_questoes').insert({
      usuario_id: user!.id,
      questao_id: questaoAtual.id,
      acertou,
    })
  }, [fase, questaoAtual, user])

  const temFiltrosAtivos = !!nivelFiltro || bancasFiltro.length > 0 || anosFiltro.length > 0 || !soNaoRespondidas

  const proximaQuestao = () => {
    if (indice + 1 >= questoes.length) {
      if (temFiltrosAtivos) {
        navigate(`/trilha/${slug}/disciplina/${disciplina}`)
      } else {
        navigate(`/trilha/${slug}/disciplina/${disciplina}/concluida`)
      }
      return
    }
    setIndice((i) => i + 1)
    setFase('aguardando')
    setLetraSelecionada(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-3 animate-bounce">📖</div>
          <p>Carregando questões...</p>
        </div>
      </div>
    )
  }

  if (questoes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-sm mx-4 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Disciplina concluída!</h2>
          <p className="text-gray-500 mb-6">Você respondeu todas as questões desta disciplina.</p>
          <button onClick={() => navigate(`/trilha/${slug}`)} className="btn-primary w-full">
            Voltar para a trilha
          </button>
        </div>
      </div>
    )
  }

  const progressoPct = Math.round((indice / questoes.length) * 100)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(`/trilha/${slug}`)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progressoPct}%` }}
              />
            </div>
            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
              {indice + 1}/{questoes.length}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate">
            {trilhaNome} · {decodeURIComponent(disciplina!)}
            {temFiltrosAtivos && (
              <span className="ml-1 text-blue-400">· filtros ativos</span>
            )}
          </p>
        </div>
      </header>

      {/* Question */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Meta tags */}
        {(questaoAtual.banca || questaoAtual.ano || questaoAtual.assunto) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {questaoAtual.banca && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {questaoAtual.banca}
              </span>
            )}
            {questaoAtual.ano && (
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {questaoAtual.ano}
              </span>
            )}
            {questaoAtual.assunto && (
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full max-w-[200px] truncate">
                {questaoAtual.assunto}
              </span>
            )}
          </div>
        )}

        {/* Enunciado */}
        <div className="card">
          <div
            className="questao-html text-gray-800 leading-relaxed text-sm"
            dangerouslySetInnerHTML={{ __html: questaoAtual.enunciado_html }}
          />
        </div>

        {/* Alternativas */}
        <div className="space-y-3">
          {questaoAtual.alternativas.map((alt) => {
            const selecionada = letraSelecionada === alt.letra
            const correta = alt.letra === questaoAtual.gabarito_letra
            const respondida = fase === 'respondida'

            let estilo = 'border-2 border-gray-200 bg-white text-gray-800 hover:border-blue-400 hover:bg-blue-50'
            if (respondida) {
              if (correta) {
                estilo = 'border-2 border-green-500 bg-green-50 text-green-800'
              } else if (selecionada) {
                estilo = 'border-2 border-red-400 bg-red-50 text-red-800'
              } else {
                estilo = 'border-2 border-gray-200 bg-gray-50 text-gray-400'
              }
            }

            return (
              <button
                key={alt.letra}
                onClick={() => registrarResposta(alt.letra)}
                disabled={respondida}
                className={`w-full text-left rounded-xl px-4 py-3 transition-all ${estilo} disabled:cursor-default`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-bold text-sm shrink-0 mt-0.5">{alt.letra})</span>
                  <span className="text-sm leading-relaxed flex-1">
                    {alt.html
                      ? <span dangerouslySetInnerHTML={{ __html: alt.html }} />
                      : alt.texto}
                  </span>
                  {respondida && correta && (
                    <span className="shrink-0 text-green-500 font-bold">✓</span>
                  )}
                  {respondida && selecionada && !correta && (
                    <span className="shrink-0 text-red-400 font-bold">✕</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Feedback + comentário */}
        {fase === 'respondida' && (
          <div
            className={`card border-l-4 ${
              letraSelecionada === questaoAtual.gabarito_letra
                ? 'border-l-green-500 bg-green-50'
                : 'border-l-red-400 bg-red-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {letraSelecionada === questaoAtual.gabarito_letra ? (
                <>
                  <span className="text-green-600 font-bold text-lg">✓</span>
                  <span className="font-semibold text-green-800">Correto!</span>
                </>
              ) : (
                <>
                  <span className="text-red-500 font-bold text-lg">✕</span>
                  <span className="font-semibold text-red-700">
                    Errado. Gabarito: {questaoAtual.gabarito_letra})
                  </span>
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

        {/* Spacer so sticky button doesn't cover content */}
        {fase === 'respondida' && <div className="h-16" />}
      </main>

      {/* Sticky next button */}
      {fase === 'respondida' && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
          <div className="max-w-xl mx-auto">
            <button onClick={proximaQuestao} className="btn-primary w-full">
              {indice + 1 >= questoes.length ? 'Concluir disciplina' : 'Próxima questão →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
