'use client';
import { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, Search, Upload, TrendingDown, TrendingUp, Calendar, Clock } from 'lucide-react';

export default function Dashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Visitante');

  // --- BUSCAR DADOS DO BACKEND ---
  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:8000/dashboard-data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Erro ao buscar dados", err);
    }
  };

  useEffect(() => {
    // 1. Carregar nome da empresa
    const savedCompany = localStorage.getItem('user_company');
    if (savedCompany) setCompanyName(savedCompany);

    // 2. Carregar dados iniciais
    fetchData();
  }, []);

  // --- UPLOAD DE ARQUIVO ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      alert(result.mensagem);
      fetchData(); // Atualiza a tabela na hora
    } catch (err) {
      alert("Erro no upload. Verifique se o servidor está rodando.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* BARRA SUPERIOR */}
      <nav className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-8 bg-yellow-500 rounded-sm"></div>
            <span className="font-bold text-xl tracking-wider">PRICE TIRE FORCE</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-xs text-slate-400">Logado como</p>
                <p className="font-semibold text-yellow-500">{companyName}</p>
             </div>
             <button 
               onClick={() => { localStorage.clear(); window.location.href = '/' }}
               className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded text-slate-300 transition"
             >
               Sair
             </button>
          </div>
        </div>
      </nav>

      {/* CONTEÚDO */}
      <main className="max-w-7xl mx-auto p-6">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Painel de Monitoramento</h2>
            <p className="text-slate-500 mt-1">Comparativo de preços em tempo real.</p>
          </div>
          <div className="text-sm text-slate-400">
            Última atualização: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Botão Upload */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition cursor-pointer flex items-center gap-4 group"
          >
            <div className="p-4 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition duration-300">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{loading ? 'Processando...' : 'Importar Dados'}</h3>
              <p className="text-xs text-slate-500">Via Excel ou CSV</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".csv, .xlsx"
            />
          </div>

          {/* Botão Pesquisa (Visual) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 opacity-60 cursor-not-allowed">
            <div className="p-4 bg-purple-50 rounded-full text-purple-600">
              <Search size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Nova Coleta Manual</h3>
              <p className="text-xs text-slate-500">Em breve</p>
            </div>
          </div>

          {/* Botão Exportar (Visual) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition">
            <div className="p-4 bg-green-50 rounded-full text-green-600">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Baixar Relatório</h3>
              <p className="text-xs text-slate-500">Exportar para PDF/Excel</p>
            </div>
          </div>
        </div>

        {/* TABELA DE DADOS (COM DATA E HORA) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Resultados Coletados
            </h3>
            <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded text-slate-600">
              {data.length} registros
            </span>
          </div>
          
          {data.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
              <FileSpreadsheet size={48} className="mb-4 opacity-20" />
              <p>Sua base de dados está vazia.</p>
              <button onClick={() => fileInputRef.current?.click()} className="mt-4 text-blue-600 hover:underline text-sm">
                Faça o primeiro upload agora
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Hora</th>
                    <th className="px-6 py-4">Medida / Produto</th>
                    <th className="px-6 py-4">Concorrente</th>
                    <th className="px-6 py-4">Preço Encontrado</th>
                    <th className="px-6 py-4 text-center">Análise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item) => {
                    // FORMATAÇÃO DE DATA E HORA
                    const dataObj = new Date(item.data);
                    const diaFormatado = dataObj.toLocaleDateString('pt-BR');
                    const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition duration-150">
                        {/* DATA */}
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            {diaFormatado}
                          </div>
                        </td>

                        {/* HORA */}
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <Clock size={14} />
                            {horaFormatada}
                          </div>
                        </td>

                        {/* PRODUTO */}
                        <td className="px-6 py-4">
                           <div className="font-bold text-slate-800">{item.medida}</div>
                           <div className="text-xs text-slate-500">{item.marca} - {item.produto}</div>
                        </td>

                        {/* CONCORRENTE */}
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                            {item.concorrente}
                          </span>
                        </td>

                        {/* PREÇO */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 text-base">
                            R$ {item.preco.toFixed(2).replace('.', ',')}
                          </div>
                        </td>

                        {/* ANÁLISE */}
                        <td className="px-6 py-4 text-center">
                          {item.preco < 250 ? (
                              <div className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                                  <TrendingDown size={14} className="mr-1"/> Oportunidade
                              </div>
                          ) : (
                              <div className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                                  <TrendingUp size={14} className="mr-1"/> Atenção
                              </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}