import { useEffect, useMemo, useState } from 'react';
import { Funnel, MagnifyingGlass, X } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router-dom';
import type { QuestaoRow } from '../lib/database.types';
import {
  fetchModulo,
  fetchModuloQuestoesAdmin,
  addQuestaoToModulo,
  removeQuestaoFromModulo,
  reorderModuloQuestoes,
  searchQuestoes,
  fetchFiltrosQuestoes,
  type QuestaoSearchFilters,
  type FiltrosQuestoes,
} from '../lib/adminQueries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ErrorState, LoadingCards } from '../components/Feedback';
import AdminLayout from './AdminLayout';

const FILTROS_VAZIOS: FiltrosQuestoes = { bancas: [], disciplinas: [], cargos: [], niveis: [], orgaos: [] };

export default function AdminModuloPage() {
  const { moduloId } = useParams();
  const id = Number(moduloId);

  const [titulo, setTitulo] = useState('');
  const [trilhaId, setTrilhaId] = useState<number | null>(null);
  const [assigned, setAssigned] = useState<{ ordem: number; questao: QuestaoRow }[] | null>(null);
  const [filters, setFilters] = useState<QuestaoSearchFilters>({ apenas: 'todas' });
  const [texto, setTexto] = useState('');
  const [assunto, setAssunto] = useState('');
  const [tipo, setTipo] = useState('');
  const [area, setArea] = useState('');
  const [ano, setAno] = useState('');
  const textoDeb = useDebouncedValue(texto);
  const assuntoDeb = useDebouncedValue(assunto);
  const tipoDeb = useDebouncedValue(tipo);
  const areaDeb = useDebouncedValue(area);
  const anoDeb = useDebouncedValue(ano);
  const [opcoes, setOpcoes] = useState<FiltrosQuestoes>(FILTROS_VAZIOS);
  const [optionsError, setOptionsError] = useState(false);
  const [results, setResults] = useState<QuestaoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchLoading, setSearchLoading] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [searchTick, setSearchTick] = useState(0);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      texto: textoDeb.trim() || undefined,
      assunto: assuntoDeb.trim() || undefined,
      tipo: tipoDeb.trim() || undefined,
      area: areaDeb.trim() || undefined,
      ano: /^\d{4}$/.test(anoDeb) ? Number(anoDeb) : undefined,
    }),
    [filters, textoDeb, assuntoDeb, tipoDeb, areaDeb, anoDeb],
  );
  const activeFilters =
    [
      filters.disciplina,
      filters.banca,
      filters.orgao,
      filters.cargo,
      filters.nivel_escolaridade,
      filters.imagem,
      filters.situacao,
    ].filter(Boolean).length +
    [texto, assunto, tipo, area, ano].filter((value) => value.trim()).length +
    (filters.apenas !== 'todas' ? 1 : 0);

  function changeFilter(key: keyof QuestaoSearchFilters, value: string) {
    setPage(0);
    setSelecionadas(new Set());
    setFilters((previous) => ({ ...previous, [key]: value || undefined }));
  }

  function changeText(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
    setSelecionadas(new Set());
  }

  function clearFilters() {
    setFilters({ apenas: 'todas' });
    setTexto('');
    setAssunto('');
    setTipo('');
    setArea('');
    setAno('');
    setPage(0);
    setSelecionadas(new Set());
  }

  function refreshAssigned() {
    fetchModuloQuestoesAdmin(id).then(setAssigned);
  }

  useEffect(() => {
    fetchModulo(id).then((m) => {
      setTitulo(m.titulo);
      setTrilhaId(m.trilha_id);
    });
    refreshAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let alive = true;
    fetchFiltrosQuestoes()
      .then((options) => {
        if (alive) setOpcoes(options);
      })
      .catch(() => {
        if (alive) setOptionsError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setSearchLoading(true);
    setSearchError('');
    searchQuestoes(effectiveFilters, page)
      .then((result) => {
        if (!alive) return;
        setResults(result.rows);
        setTotal(result.total);
      })
      .catch(() => {
        if (alive) setSearchError('Não foi possível buscar as questões. Seus filtros foram mantidos.');
      })
      .finally(() => {
        if (alive) setSearchLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [effectiveFilters, page, searchTick]);

  const assignedIds = new Set((assigned ?? []).map((a) => a.questao.id));

  async function handleAdd(q: QuestaoRow) {
    setAddError(null);
    try {
      await addQuestaoToModulo(id, q.id, assigned?.length ?? 0);
      refreshAssigned();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erro ao adicionar questão.');
    }
  }

  function toggleSelecionada(questaoId: string) {
    setSelecionadas((s) => {
      const next = new Set(s);
      if (next.has(questaoId)) next.delete(questaoId);
      else next.add(questaoId);
      return next;
    });
  }

  async function handleAddSelecionadas() {
    const ids = [...selecionadas];
    if (!ids.length || adding) return;
    setAdding(true);
    setAddError(null);
    let ordem = assigned?.length ?? 0;
    try {
      for (const questaoId of ids) {
        await addQuestaoToModulo(id, questaoId, ordem++);
      }
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erro ao adicionar questões.');
    } finally {
      setSelecionadas(new Set());
      setAdding(false);
      refreshAssigned();
    }
  }

  async function handleRemove(questaoId: string) {
    await removeQuestaoFromModulo(id, questaoId);
    refreshAssigned();
  }

  async function move(index: number, dir: -1 | 1) {
    if (!assigned) return;
    const ids = assigned.map((a) => a.questao.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await reorderModuloQuestoes(id, ids);
    refreshAssigned();
  }

  return (
    <AdminLayout>
      <Link to={`/admin/trilhas/${trilhaId}`} className="text-sm font-bold text-gray-500 hover:text-gray-800">
        ‹ Voltar para a trilha
      </Link>
      <h1 className="mt-2 text-xl font-extrabold text-gray-900">Módulo: {titulo}</h1>

      <div className="module-curation-grid">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">
            Questões no módulo ({assigned?.length ?? 0})
          </h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {(assigned ?? []).map((a, i) => (
              <div key={a.questao.id} className="flex items-start gap-2 border-t border-gray-100 p-3 first:border-t-0">
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    disabled={i === (assigned?.length ?? 0) - 1}
                    onClick={() => move(i, 1)}
                    className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-semibold text-gray-800">{a.questao.enunciado}</div>
                  <div className="mt-1 text-xs text-gray-400">
                    {a.questao.banca} · {a.questao.ano} · {a.questao.disciplina}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(a.questao.id)}
                  className="flex-none text-xs font-bold text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            ))}
            {assigned?.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-400">Nenhuma questão neste módulo ainda.</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">Buscar no banco de questões</h2>
          <section className="admin-search-panel module-search-panel" aria-label="Filtros para adicionar questões">
            <label className="search-field">
              <MagnifyingGlass size={19} aria-hidden="true" />
              <input
                aria-label="Buscar no enunciado"
                placeholder="Buscar no enunciado…"
                value={texto}
                onChange={(event) => changeText(setTexto, event.target.value)}
              />
            </label>
            <div className="module-filter-heading">
              <span>
                <Funnel size={16} aria-hidden="true" /> Refinar questões {activeFilters > 0 && <b>{activeFilters}</b>}
              </span>
              {activeFilters > 0 && (
                <button type="button" onClick={clearFilters}>
                  <X size={14} /> Limpar
                </button>
              )}
            </div>
            <div className="module-filter-grid">
              {(
                [
                  { key: 'disciplina', label: 'Disciplina', values: opcoes.disciplinas },
                  { key: 'banca', label: 'Banca', values: opcoes.bancas },
                  { key: 'orgao', label: 'Órgão', values: opcoes.orgaos },
                ] as const
              ).map(({ key, label, values }) => (
                <label key={key}>
                  {label}
                  <select value={filters[key] || ''} onChange={(event) => changeFilter(key, event.target.value)}>
                    <option value="">Todos</option>
                    {values.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                Ano
                <input
                  type="number"
                  inputMode="numeric"
                  min="1900"
                  max="2100"
                  placeholder="Ex.: 2024"
                  value={ano}
                  onChange={(event) => changeText(setAno, event.target.value)}
                />
              </label>
              <label>
                Revisão
                <select value={filters.apenas || 'todas'} onChange={(event) => changeFilter('apenas', event.target.value)}>
                  <option value="todas">Todas</option>
                  <option value="revisadas">Revisadas</option>
                  <option value="nao_revisadas">Aguardando revisão</option>
                </select>
              </label>
            </div>
            {ano && !/^\d{4}$/.test(ano) && (
              <p className="module-filter-hint" role="status">
                Digite os quatro dígitos do ano para aplicar esse filtro.
              </p>
            )}
            <details className="module-more-filters">
              <summary>Mais filtros: cargo, escolaridade, assunto e outros</summary>
              <div className="module-filter-grid">
                {(
                  [
                    { key: 'cargo', label: 'Cargo', values: opcoes.cargos },
                    { key: 'nivel_escolaridade', label: 'Escolaridade', values: opcoes.niveis },
                  ] as const
                ).map(({ key, label, values }) => (
                  <label key={key}>
                    {label}
                    <select value={filters[key] || ''} onChange={(event) => changeFilter(key, event.target.value)}>
                      <option value="">Todos</option>
                      {values.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <label>
                  Assunto
                  <input
                    placeholder="Buscar assunto"
                    value={assunto}
                    onChange={(event) => changeText(setAssunto, event.target.value)}
                  />
                </label>
                <label>
                  Tipo de questão
                  <input placeholder="Buscar tipo" value={tipo} onChange={(event) => changeText(setTipo, event.target.value)} />
                </label>
                <label>
                  Área
                  <input placeholder="Buscar área" value={area} onChange={(event) => changeText(setArea, event.target.value)} />
                </label>
                <label>
                  Imagens
                  <select value={filters.imagem || ''} onChange={(event) => changeFilter('imagem', event.target.value)}>
                    <option value="">Todas</option>
                    <option value="com">Com imagem</option>
                    <option value="sem">Sem imagem</option>
                  </select>
                </label>
                <label>
                  Situação
                  <select value={filters.situacao || ''} onChange={(event) => changeFilter('situacao', event.target.value)}>
                    <option value="">Todas</option>
                    <option value="regulares">Regulares</option>
                    <option value="anuladas">Anuladas</option>
                    <option value="desatualizadas">Desatualizadas</option>
                  </select>
                </label>
              </div>
            </details>
            {optionsError && (
              <p role="status" className="module-options-error">
                As opções não carregaram; busca e filtros de texto continuam disponíveis.
              </p>
            )}
          </section>

          {selecionadas.size > 0 && (
            <button
              onClick={handleAddSelecionadas}
              disabled={adding}
              className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? 'Adicionando…' : `Adicionar selecionadas (${selecionadas.size})`}
            </button>
          )}

          {addError && <div className="mt-2 text-sm font-semibold text-red-600">{addError}</div>}

          <div className="mt-2 max-h-[560px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
            {searchLoading ? (
              <LoadingCards />
            ) : searchError ? (
              <ErrorState message={searchError} retry={() => setSearchTick((tick) => tick + 1)} />
            ) : (
              results.map((q) => {
                const already = assignedIds.has(q.id);
                return (
                  <div key={q.id} className="flex items-start gap-2 border-t border-gray-100 p-3 first:border-t-0">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 flex-none"
                      disabled={already || !q.revisado || adding}
                      checked={selecionadas.has(q.id)}
                      onChange={() => toggleSelecionada(q.id)}
                      title={
                        already ? 'Já no módulo' : !q.revisado ? 'Revise antes de adicionar' : 'Selecionar pra adicionar em lote'
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-semibold text-gray-800">{q.enunciado}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span>{[q.banca, q.ano, q.disciplina, q.orgao, q.cargo].filter(Boolean).join(' · ')}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-bold ${q.revisado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {q.revisado ? 'Revisada' : 'Não revisada'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-1">
                      <Link
                        to={`/admin/questoes/${q.id}?modulo=${id}`}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Revisar
                      </Link>
                      <button
                        disabled={already || !q.revisado}
                        onClick={() => handleAdd(q)}
                        className="text-xs font-bold text-blue-600 hover:underline disabled:cursor-default disabled:text-gray-300 disabled:no-underline"
                      >
                        {already ? 'Já no módulo' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {!searchLoading && !searchError && results.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-400">Nenhuma questão encontrada para esses filtros.</div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span role="status">
              {searchLoading ? 'Buscando questões…' : `${total.toLocaleString('pt-BR')} questões encontradas`}
            </span>
            <div className="flex gap-2">
              <button
                disabled={searchLoading || !!searchError || page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="font-bold disabled:opacity-30"
              >
                ‹ Anterior
              </button>
              <button
                disabled={searchLoading || !!searchError || (page + 1) * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="font-bold disabled:opacity-30"
              >
                Próxima ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
