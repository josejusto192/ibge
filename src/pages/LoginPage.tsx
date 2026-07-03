import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — branding */}
      <div className="bg-navy-900 flex flex-col items-center justify-center px-8 py-12 md:w-1/2 md:min-h-screen">
        <div className="max-w-sm text-center">
          <div className="w-20 h-20 bg-gold-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-4xl">📊</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">IBGE Questões</h1>
          <p className="text-navy-200 text-lg leading-relaxed">
            Prepare-se para o concurso com questões comentadas e trilhas de estudo personalizadas.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            <div className="bg-navy-800 rounded-xl p-4">
              <div className="text-gold-400 text-2xl font-bold">97+</div>
              <div className="text-navy-300 text-xs mt-1">Questões</div>
            </div>
            <div className="bg-navy-800 rounded-xl p-4">
              <div className="text-gold-400 text-2xl font-bold">5</div>
              <div className="text-navy-300 text-xs mt-1">Disciplinas</div>
            </div>
            <div className="bg-navy-800 rounded-xl p-4">
              <div className="text-gold-400 text-2xl font-bold">🔥</div>
              <div className="text-navy-300 text-xs mt-1">Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-navy-900 mb-2">Entrar na plataforma</h2>
          <p className="text-gray-500 mb-8">Acesse sua conta ou crie uma nova</p>

          <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-8">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#0f2040',
                      brandAccent: '#162e5c',
                      inputBorder: '#d5dff0',
                      inputBorderFocus: '#0f2040',
                    },
                    radii: {
                      borderRadiusButton: '12px',
                      inputBorderRadius: '12px',
                    },
                    fontSizes: {
                      baseBodySize: '14px',
                    },
                  },
                },
              }}
              providers={['google']}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'E-mail',
                    password_label: 'Senha',
                    button_label: 'Entrar',
                    link_text: 'Já tem conta? Entre aqui',
                    email_input_placeholder: 'seu@email.com',
                    password_input_placeholder: 'Sua senha',
                  },
                  sign_up: {
                    email_label: 'E-mail',
                    password_label: 'Senha',
                    button_label: 'Criar conta',
                    link_text: 'Não tem conta? Cadastre-se',
                    email_input_placeholder: 'seu@email.com',
                    password_input_placeholder: 'Mínimo 6 caracteres',
                    confirmation_text: 'Verifique seu e-mail para confirmar o cadastro',
                  },
                  forgotten_password: {
                    link_text: 'Esqueci minha senha',
                    button_label: 'Enviar e-mail de recuperação',
                    email_label: 'E-mail',
                    email_input_placeholder: 'seu@email.com',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
