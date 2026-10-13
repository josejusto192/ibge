import { Crown, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CATEGORY_COLOR, CONQUISTAS } from '../../data/mock';
import { levelFromXp } from '../../lib/format';
import { useAppData } from '../../contexts/AppDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { fetchReferrals, fetchStats } from '../../lib/queries';
import PatternBackground from '../../components/PatternBackground';
import ReferralSheet from './ReferralSheet';
import LegalSheet, { type LegalDoc } from '../../components/sheets/LegalSheet';
import { desbloquearAudio, setSonsAtivos, som, sonsAtivos } from '../../lib/efeitos';

export default function Profile() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { usuario, activeTrilha, modules, ofensiva, updateUsuario } = useAppData();
  const [editandoMeta, setEditandoMeta] = useState(false);
  const assinaturaPaga = !!usuario?.acesso_ate && new Date(usuario.acesso_ate) > new Date();
  const [referralOpen, setReferralOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [sons, setSons] = useState(sonsAtivos);

  function alternarSons() {
    const ligar = !sons;
    setSonsAtivos(ligar);
    setSons(ligar);
    if (ligar) {
      desbloquearAudio();
      som.acerto();
    }
  }
  const [totalRespondidas, setTotalRespondidas] = useState(0);
  const [taxaAcerto, setTaxaAcerto] = useState(0);
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [referralsConfirmed, setReferralsConfirmed] = useState(0);

  useEffect(() => {
    if (!usuario) return;
    fetchStats(usuario.id).then((s) => {
      setTotalRespondidas(s.totalRespondidas);
      setTaxaAcerto(s.taxaAcerto);
      setBestAccuracy(s.porDisciplina.length ? Math.max(...s.porDisciplina.map((d) => d.pct)) : 0);
    });
    fetchReferrals(usuario.id).then((r) => setReferralsConfirmed(r.filter((f) => f.status === 'assinou').length));
  }, [usuario]);

  const level = levelFromXp(usuario?.xp ?? 0);
  const doneModules = modules.filter((m) => m.status === 'done').length;
  const ctx = {
    streak: ofensiva,
    totalQuestoes: totalRespondidas,
    bestAccuracy,
    doneModules,
    totalModules: modules.length,
    referralsConfirmed,
  };
  const badges = CONQUISTAS.map((c) => ({ ...c, earned: c.criterio(ctx), color: CATEGORY_COLOR[c.categoria] || '#1557E6' }));
  const earnedCount = badges.filter((b) => b.earned).length;

  const profileRows = [
    { label: 'Concurso alvo', value: activeTrilha?.nome ?? '—', dot: '#1557E6' },
    { label: 'Faixa etária', value: usuario?.faixa_etaria ?? '—', dot: '#FFCB2D' },
    { label: 'Questões resolvidas', value: String(totalRespondidas), dot: '#22A06B' },
    { label: 'Taxa de acerto', value: `${taxaAcerto}%`, dot: '#F5B301' },
    { label: 'Meta diária', value: `${usuario?.meta_diaria ?? 20} questões`, dot: '#9b59b6' },
  ];

  const iniciais = usuario?.nome
    ? usuario.nome
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'VC';

  async function logout() {
    await signOut();
    navigate('/login');
  }

  return (
    <>
      <PatternBackground scrollClassName="profile-scroll">
        <div
          className="p-[34px_20px_26px] text-center"
          style={{ backgroundImage: "url('/assets/bg-blue-texture.jpg')", backgroundSize: 'cover', backgroundPosition: 'center top' }}
        >
          <div className="mx-auto flex h-[82px] w-[82px] items-center justify-center rounded-full bg-yellow" style={{ border: '4px solid rgba(255,255,255,.3)' }}>
            <span className="font-display text-[32px] font-extrabold text-ink">{iniciais}</span>
          </div>
          <div className="mt-3.5 font-sans text-[20px] font-extrabold text-white">{usuario?.nome || 'Você'}</div>
          <div className="mt-1 font-sans text-[13px] font-semibold text-[#c9d7fb]">
            Nível {level} · {usuario?.xp ?? 0} XP · Liga Ouro
          </div>
        </div>

        <div className="p-[18px]">
          <div className="overflow-hidden rounded-[18px] bg-surface" style={{ boxShadow: '0 10px 28px -20px rgba(11,31,77,.4)' }}>
            {profileRows.map((p) => (
              <div key={p.label} className="flex items-center gap-3 p-[16px]" style={{ borderBottom: '1px solid #F1F3F9' }}>
                <span className="h-[9px] w-[9px] rounded-[3px]" style={{ background: p.dot }} />
                <span className="flex-1 font-sans text-[14px] font-bold text-ink">{p.label}</span>
                <span className="font-sans text-[13px] font-bold text-text2">{p.value}</span>
                {p.label === 'Meta diária' && (
                  <button
                    onClick={() => setEditandoMeta(!editandoMeta)}
                    className="border-none bg-transparent p-0 font-sans text-[12.5px] font-extrabold text-blue"
                    aria-expanded={editandoMeta}
                  >
                    {editandoMeta ? 'Fechar' : 'Alterar'}
                  </button>
                )}
              </div>
            ))}
            {editandoMeta && (
              <div className="flex flex-wrap gap-2 p-[4px_16px_16px]">
                {[10, 20, 30, 40].map((m) => (
                  <button
                    key={m}
                    onClick={async () => {
                      som.toque();
                      await updateUsuario({ meta_diaria: m }).catch(() => undefined);
                      setEditandoMeta(false);
                    }}
                    className="rounded-xl border-[1.5px] px-3 py-2 font-sans text-[12.5px] font-extrabold"
                    style={{
                      borderColor: usuario?.meta_diaria === m ? '#1557E6' : '#E3E8F4',
                      background: usuario?.meta_diaria === m ? '#EEF3FF' : '#fff',
                      color: usuario?.meta_diaria === m ? '#1557E6' : '#0B1F4D',
                    }}
                  >
                    {m} questões
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/assinar')}
            className="mt-3.5 flex w-full items-center gap-3.5 rounded-2xl border-[1.5px] p-4 text-left"
            style={{ borderColor: assinaturaPaga ? '#b6e6cd' : '#f3dd8e', background: assinaturaPaga ? '#E9F7F0' : '#FFF9E6' }}
          >
            <span
              className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl"
              style={{ background: assinaturaPaga ? '#22A06B' : '#FFCB2D', color: assinaturaPaga ? '#fff' : '#0B1F4D' }}
            >
              <Crown size={22} weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <div className="font-sans text-[14.5px] font-extrabold text-ink">
                {assinaturaPaga ? 'Sua assinatura' : usuario?.assinatura_cortesia ? 'Acesso cortesia' : 'Assine e desbloqueie tudo'}
              </div>
              <div className="mt-0.5 font-sans text-[12px] font-semibold text-text2">
                {assinaturaPaga
                  ? `Ativa até ${new Date(usuario!.acesso_ate!).toLocaleDateString('pt-BR')}`
                  : usuario?.assinatura_cortesia
                    ? 'Todos os módulos liberados · veja os planos'
                    : 'Todos os módulos, caderno de erros e tutor com IA'}
              </div>
            </span>
            <span className="text-[18px] text-blue">›</span>
          </button>

          <button
            onClick={() => setReferralOpen(true)}
            className="mt-3.5 flex w-full items-center gap-3.5 rounded-2xl border-[1.5px] border-blue-border bg-blue-tint p-4 text-left"
          >
            <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-blue font-display text-[18px] font-extrabold text-yellow">
              $
            </span>
            <span className="min-w-0 flex-1">
              <div className="font-sans text-[14.5px] font-extrabold text-ink">Indique e ganhe</div>
              <div className="mt-0.5 font-sans text-[12px] font-semibold text-text2">Crédito na sua assinatura quando um amigo assinar</div>
            </span>
            <span className="text-[18px] text-blue">›</span>
          </button>

          <div className="mt-5.5 flex items-center justify-between">
            <div className="font-sans text-[14px] font-extrabold text-ink">Conquistas</div>
            <div className="font-sans text-[12px] font-bold text-text2">
              {earnedCount}/{badges.length}
            </div>
          </div>
          <div className="profile-achievements-grid mt-3 grid grid-cols-3 gap-2.5">
            {badges.map((b) => (
              <div
                key={b.id}
                className="flex flex-col items-center gap-2 rounded-2xl border-[1.5px] border-border2 p-[14px_8px]"
                style={{
                  background: b.earned ? '#fff' : '#F4F6FC',
                  opacity: b.earned ? 1 : 0.55,
                  boxShadow: b.earned ? '0 8px 20px -14px rgba(11,31,77,.4)' : 'none',
                }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[20px]"
                  style={{ background: b.earned ? `${b.color}22` : '#E6EAF5', color: b.earned ? b.color : '#AEB6CC' }}
                >
                  {b.glyph}
                </div>
                <div className="text-center font-sans text-[10.5px] font-bold leading-[1.25]" style={{ color: b.earned ? '#0B1F4D' : '#9aa4bd' }}>
                  {b.titulo}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={sons}
            onClick={alternarSons}
            className="mt-5.5 flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-border bg-surface p-[12px_14px] text-left"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-tint text-blue">
              {sons ? <SpeakerHigh size={20} weight="fill" /> : <SpeakerSlash size={20} weight="fill" />}
            </span>
            <span className="flex-1">
              <span className="block font-sans text-[14px] font-extrabold text-ink">Sons e vibração</span>
              <span className="block font-sans text-[12px] font-semibold text-text2">Ao acertar, errar e concluir módulos</span>
            </span>
            <span className={`chave-sons ${sons ? 'ligada' : ''}`} aria-hidden="true">
              <span />
            </span>
          </button>

          <div className="mt-4 flex justify-center gap-4 font-sans text-[12px] font-bold text-text3">
            <button onClick={() => setLegalDoc('termos')} className="border-none bg-transparent p-0 underline">
              Termos de Uso
            </button>
            <button onClick={() => setLegalDoc('privacidade')} className="border-none bg-transparent p-0 underline">
              Política de Privacidade
            </button>
          </div>

          <button
            onClick={logout}
            className="mt-3 h-[50px] w-full rounded-2xl border-[1.5px] border-border bg-surface font-sans text-[14px] font-extrabold text-error"
          >
            Sair da conta
          </button>
        </div>
      </PatternBackground>

      {referralOpen && <ReferralSheet onClose={() => setReferralOpen(false)} />}
      {legalDoc && <LegalSheet doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </>
  );
}
