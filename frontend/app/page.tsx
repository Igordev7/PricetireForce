'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Activity } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // AGORA SIM: Envia o email e a password que você digitou nos inputs
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), 
      });
      
      const data = await response.json();
      
      if (data.status === 'sucesso') {
        localStorage.setItem('user_company', data.company);
        localStorage.setItem('user_email', data.user);
        router.push('/dashboard');
      } else {
        alert('Login falhou: ' + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-slate-700">
        
        {/* Logo e Título */}
        <div className="text-center mb-8">
          
          <img
              src="/logo.jpeg" // O caminho para a sua imagem na pasta public
              alt="Logo IntelligenceTyre PriceTyreForce"
              className="h-25 w-100" // Ajuste a altura conforme necessário
            />
          <p className="text-slate-400 text-sm mt-2">Inteligência de Mercado para Pneus</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                placeholder="seunome@empresa.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-slate-900 bg-yellow-500 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
          >
            {loading ? 'Entrando...' : 'Acessar Plataforma'}
          </button>
        </form>
      </div>
    </div>
  );
}