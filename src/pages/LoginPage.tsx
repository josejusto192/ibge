import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📊</div>
          <h1 className="text-3xl font-bold text-white">IBGE Questões</h1>
          <p className="text-blue-200 mt-2">Prepare-se para o concurso com questões comentadas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#2563eb',
                    brandAccent: '#1d4ed8',
                  },
                  radii: {
                    borderRadiusButton: '12px',
                    inputBorderRadius: '12px',
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
  )
}
