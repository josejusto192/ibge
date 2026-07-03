import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000213' }}>
      {/* Radial glow behind card */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(35.05% 60% at 50% 30%, #001338 0%, #000213 100%)' }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(98.37deg, #FBE07A 0%, #F5C33B 45%, #EAA42A 100%)', border: '1px solid rgba(255,255,255,0.4)' }}>
            <span className="text-2xl">📊</span>
          </div>
          <h1 className="text-2xl font-bold text-white">IBGE Questões</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Prepare-se com questões reais do IBGE</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ background: '#080A1A', border: '1px solid rgba(255,255,255,0.13)', boxShadow: '-10px 8px 29px rgba(0,0,0,0.4)' }}>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#F5C33B',
                    brandAccent: '#EAA42A',
                    brandButtonText: '#000312',
                    defaultButtonBackground: 'rgba(255,255,255,0.06)',
                    defaultButtonBackgroundHover: 'rgba(255,255,255,0.1)',
                    defaultButtonBorder: 'rgba(255,255,255,0.13)',
                    defaultButtonText: '#fff',
                    dividerBackground: 'rgba(255,255,255,0.1)',
                    inputBackground: 'rgba(255,255,255,0.05)',
                    inputBorder: 'rgba(255,255,255,0.13)',
                    inputBorderHover: 'rgba(245,195,59,0.5)',
                    inputBorderFocus: '#F5C33B',
                    inputText: '#fff',
                    inputLabelText: 'rgba(255,255,255,0.6)',
                    inputPlaceholder: 'rgba(255,255,255,0.25)',
                    messageText: 'rgba(255,255,255,0.7)',
                    anchorTextColor: '#F5C33B',
                    anchorTextHoverColor: '#FBE07A',
                  },
                  borderWidths: { buttonBorderWidth: '1px', inputBorderWidth: '1px' },
                  radii: { borderRadiusButton: '12px', buttonBorderRadius: '12px', inputBorderRadius: '12px' },
                  fontSizes: { baseBodySize: '14px', baseLabelSize: '13px' },
                },
              },
            }}
            providers={['google']}
            localization={{
              variables: {
                sign_in: { email_label: 'E-mail', password_label: 'Senha', button_label: 'Entrar', link_text: 'Já tem conta? Entre', email_input_placeholder: 'seu@email.com', password_input_placeholder: 'Sua senha' },
                sign_up: { email_label: 'E-mail', password_label: 'Senha', button_label: 'Criar conta', link_text: 'Não tem conta? Cadastre-se', email_input_placeholder: 'seu@email.com', password_input_placeholder: 'Crie uma senha' },
                forgotten_password: { link_text: 'Esqueceu a senha?' },
              },
            }}
          />
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[['97+', 'Questões'], ['IBGE', 'Focado'], ['Grátis', 'Para testar']].map(([val, label]) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="font-bold text-sm" style={{ color: '#F5C33B' }}>{val}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
