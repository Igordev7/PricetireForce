'use client';
import { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, Search, Upload, TrendingDown, Filter, Calendar, DollarSign, Target, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Visitante');

  // --- ESTADO PARA OS KIPS (INTELIGÊNCIA) ---
  const [analytics, setAnalytics] = useState({
    total: 0, 
    media: 0, 
    minimo: 0, 
    top_aro: '-', 
    top_concorrente: '-', 
    competitors_list: []
  });

  // ESTADOS DOS FILTROS (Incluindo Competitor e Busca)
  const [filters, setFilters] = useState({
    region: 'Todas',
    brand: 'Todas',
    rim: 'Todos',
    competitor: 'Todos',
    search: ''
  });

  // Função busca dados com filtro
  const fetchData = async () => {
    const params = new URLSearchParams();
    if (filters.region !== 'Todas') params.append('region', filters.region);
    if (filters.brand !== 'Todas') params.append('brand', filters.brand);
    if (filters.rim !== 'Todos') params.append('rim', filters.rim);
    if (filters.competitor !== 'Todos') params.append('competitor', filters.competitor);
    if (filters.search) params.append('search', filters.search);

    try {
      // 1. Busca Tabela
      const res = await fetch(`http://localhost:8000/dashboard-data?${params.toString()}`);
      const json = await res.json();
      setData(json);

      // 2. Busca Inteligência (KPIs)
      const resAnal = await fetch(`http://localhost:8000/analytics?${params.toString()}`);
      const jsonAnal = await resAnal.json();
      setAnalytics(jsonAnal);

    } catch (err) {
      console.error("Erro ao buscar dados", err);
    }
  };

  // Debounce para a busca não travar enquanto digita
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500); 
    return () => clearTimeout(timer);
  }, [filters]); 

  // Carrega nome da empresa ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('user_company');
    if (saved) setCompanyName(saved);
  }, []);

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
      fetchData();
    } catch (err) {
      alert("Erro no upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="Logo" className="h-10 w-auto" onError={(e) => e.currentTarget.style.display='none'} />
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

      <main className="max-w-7xl mx-auto p-6">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Painel de Monitoramento</h2>
            <p className="text-slate-500 mt-1">Comparativo de preços em tempo real.</p>
          </div>
        </div>

        {/* --- OS 3 BOTÕES GRANDES --- */}
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
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv, .xlsx"/>
          </div>

          {/* Botão Pesquisa */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 opacity-60 cursor-not-allowed">
            <div className="p-4 bg-purple-50 rounded-full text-purple-600">
              <Search size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Nova Coleta Manual</h3>
              <p className="text-xs text-slate-500">Em breve</p>
            </div>
          </div>

          {/* Botão Exportar */}
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

        {/* --- BARRA DE FILTROS --- */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
            
            {/* INPUT DE BUSCA (NOVIDADE) */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 w-full md:w-64 focus-within:border-blue-500 transition">
                <Search size={16} className="text-slate-400"/>
                <input 
                    type="text"
                    placeholder="Buscar (Ex: 14, PMZ, XBRI)..."
                    className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder:text-slate-400"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
            </div>

            <div className="hidden md:block w-px h-6 bg-slate-200 mx-2"></div>

            <div className="flex items-center gap-2 text-slate-500 text-sm font-bold mr-2">
                <Filter size={16} />
                Filtros:
            </div>
            
            {/* Filtro Empresa */}
            <select 
                className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                value={filters.competitor}
                onChange={(e) => setFilters({...filters, competitor: e.target.value})}
            >
                <option value="Todos">Empresa (Todas)</option>
                {analytics.competitors_list && analytics.competitors_list.map((comp: string, i: number) => (
                    <option key={i} value={comp}>{comp}</option>
                ))}
            </select>

            <select 
                className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                value={filters.region}
                onChange={(e) => setFilters({...filters, region: e.target.value})}
            >
                <option value="Todas">Região (Todas)</option>
                <option value="NO">Norte (NO)</option>
                <option value="NE">Nordeste (NE)</option>
                <option value="CO">Centro-Oeste (CO)</option>
                <option value="SE">Sudeste (SE)</option>
                <option value="S">Sul (S)</option>
            </select>

            <select 
                className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                value={filters.rim}
                onChange={(e) => setFilters({...filters, rim: e.target.value})}
            >
                <option value="Todos">Aro (Todos)</option>
                <option value="13">Aro 13</option>
                <option value="14">Aro 14</option>
                <option value="15">Aro 15</option>
                <option value="16">Aro 16</option>
                <option value="17">Aro 17</option>
                <option value="18">Aro 18</option>
            </select>

            <select 
                className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                value={filters.brand}
                onChange={(e) => setFilters({...filters, brand: e.target.value})}
            >
                <option value="Todas">Marca (Todas)</option>
                <option value="CONTINENTAL">Continental</option>
                <option value="GENERAL TIRE">General Tire</option>
                <option value="PIRELLI">Pirelli</option>
                <option value="MICHELIN">Michelin</option>
                <option value="BRIDGESTONE">Bridgestone</option>
                <option value="GOODYEAR">Goodyear</option>
                <option value="XBRI">XBRI</option>
            </select>
            
            {(filters.region !== 'Todas' || filters.brand !== 'Todas' || filters.rim !== 'Todos' || filters.competitor !== 'Todos' || filters.search !== '') && (
               <button onClick={() => setFilters({region: 'Todas', brand: 'Todas', rim: 'Todos', competitor: 'Todos', search: ''})} className="text-xs text-red-500 hover:underline ml-auto">
                 Limpar Filtros
               </button>
            )}
        </div>

        {/* --- SEÇÃO DE KPIs (QUE ESTAVA FALTANDO) --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                <span className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><DollarSign size={12}/> Preço Médio</span>
                <span className="text-2xl font-bold text-slate-800">R$ {analytics.media.toFixed(2)}</span>
            </div>
            <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100 flex flex-col justify-center">
                <span className="text-xs text-green-600 font-bold uppercase mb-1 flex items-center gap-1"><TrendingDown size={12}/> Melhor Preço</span>
                <span className="text-2xl font-bold text-green-700">R$ {analytics.minimo.toFixed(2)}</span>
                <span className="text-xs text-green-600 mt-1 truncate max-w-[150px]" title={analytics.top_concorrente}>na {analytics.top_concorrente}</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                <span className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Target size={12}/> Aro Destaque</span>
                <span className="text-2xl font-bold text-blue-600">Aro {analytics.top_aro}</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                <span className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><BarChart3 size={12}/> Coletas</span>
                <span className="text-2xl font-bold text-slate-800">{analytics.total}</span>
            </div>
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-5 py-4 border-b">Medida</th>
                    <th className="px-5 py-4 border-b">Modelo</th>
                    <th className="px-5 py-4 border-b">Marca</th>
                    <th className="px-5 py-4 border-b text-center">Aro</th>
                    <th className="px-5 py-4 border-b">Preço Sell Out (R$)</th>
                    <th className="px-5 py-4 border-b">Empresa</th>
                    <th className="px-5 py-4 border-b">Localidade</th>
                    <th className="px-5 py-4 border-b">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhum dado encontrado.</td></tr>
                  ) : (
                    data.map((item) => {
                      const dataObj = new Date(item.data);
                      const dataFormatada = dataObj.toLocaleDateString('pt-BR');
                      let modeloLimpo = item.produto
                        .replace(item.marca, '')
                        .replace(item.medida, '')
                        .replace(item.aro, '')
                        .trim();
                      if (modeloLimpo.length < 2) modeloLimpo = "PADRÃO";

                      return (
                        <tr key={item.id} className="hover:bg-blue-50 transition duration-150 group">
                          <td className="px-5 py-3 font-bold text-slate-700 whitespace-nowrap">{item.medida}</td>
                          <td className="px-5 py-3 text-slate-500 text-xs font-medium uppercase tracking-wide">{modeloLimpo}</td>
                          <td className="px-5 py-3"><span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">{item.marca}</span></td>
                          <td className="px-5 py-3 text-center text-slate-600 font-medium">{item.aro}</td>
                          <td className="px-5 py-3"><div className={`font-bold text-base ${item.preco < analytics.media ? 'text-green-600' : 'text-slate-800'}`}>R$ {item.preco.toFixed(2).replace('.', ',')}</div></td>
                          <td className="px-5 py-3 text-slate-600 text-xs font-medium">{item.concorrente}</td>
                          <td className="px-5 py-3 text-slate-500 text-xs">{item.city}</td>
                          <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap"><div className="flex items-center gap-1"><Calendar size={12}/> {dataFormatada}</div></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </main>
    </div>
  );
}