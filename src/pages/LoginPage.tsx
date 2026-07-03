import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { IconBarChart, IconBook, IconTarget } from '../components/Icons'

export function LoginPage() {
  return (
    <div className="min-h-screen flex" style={{ background: '#081529' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 shrink-0 p-10" style={{ background: '#0C1E3D', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F5C33B 0%, #D4A017 100%)' }}>
              <IconBarChart size={18} color="#081529" />
            </div>
            <span className="font-bold text-white text-lg">IBGE Questões</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 leading-snug">Sua preparação para o IBGE começa aqui</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Questões organizadas por disciplina e escolaridade, com progresso pessoal e gabarito comentado.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: <IconBook size={16} />, text: '97+ questões reais do IBGE' },
            { icon: <IconTarget size={16} />, text: 'Filtros por banca, ano e nível' },
            { icon: <IconBarChart size={16} />, text: 'Acompanhe seu desempenho' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(245,195,59,0.12)', color: '#F5C33B' }}>
                {icon}
              </div>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F5C33B 0%, #D4A017 100%)' }}>
              <IconBarChart size={18} color="#081529" />
            </div>
            <span className="font-bold text-white text-lg">IBGE Questões</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Entrar</h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>Acesse sua conta para continuar</p>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#F5C33B',
                    brandAccent: '#D4A017',
                    brandButtonText: '#081529',
                    defaultButtonBackground: 'rgba(255,255,255,0.06)',
                    defaultButtonBackgroundHover: 'rgba(255,255,255,0.1)',
                    defaultButtonBorder: 'rgba(255,255,255,0.12)',
                    defaultButtonText: '#fff',
                    dividerBackground: 'rgba(255,255,255,0.08)',
                    inputBackground: 'rgba(255,255,255,0.05)',
                    inputBorder: 'rgba(255,255,255,0.1)',
                    inputBorderHover: 'rgba(245,195,59,0.4)',
                    inputBorderFocus: '#F5C33B',
                    inputText: '#fff',
                    inputLabelText: 'rgba(255,255,255,0.55)',
                    inputPlaceholder: 'rgba(255,255,255,0.2)',
                    messageText: 'rgba(255,255,255,0.6)',
                    anchorTextColor: '#F5C33B',
                    anchorTextHoverColor: '#FDE68A',
                  },
                  borderWidths: { buttonBorderWidth: '1px', inputBorderWidth: '1px' },
                  radii: { borderRadiusButton: '10px', buttonBorderRadius: '10px', inputBorderRadius: '10px' },
                  fontSizes: { baseBodySize: '14px', baseLabelSize: '13px' },
                  space: { inputPadding: '12px 14px', buttonPadding: '12px 16px' },
                },
              },
            }}
            providers={['google']}
            localization={{
              variables: {
                sign_in: { email_label: 'E-mail', password_label: 'Senha', button_label: 'Entrar', link_text: 'Não tem conta? Cadastre-se', email_input_placeholder: 'seu@email.com', password_input_placeholder: 'Sua senha' },
                sign_up: { email_label: 'E-mail', password_label: 'Senha', button_label: 'Criar conta', link_text: 'Já tem conta? Entre', email_input_placeholder: 'seu@email.com', password_input_placeholder: 'Mínimo 6 caracteres' },
                forgotten_password: { link_text: 'Esqueceu a senha?' },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
