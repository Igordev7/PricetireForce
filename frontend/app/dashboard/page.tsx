'use client';
import { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, Search, Upload, TrendingDown, Filter, Calendar, DollarSign, Target, BarChart3, Globe, ChevronDown, Check } from 'lucide-react';

// --- COMPONENTE VISUAL: DROPDOWN COM MULTI-SELEÇÃO ---
const DropdownMultiSelect = ({ label, options, selected, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-700 cursor-pointer flex justify-between items-center w-40 hover:border-blue-400 transition h-[38px]"
      >
        <span className="truncate font-medium">
           {selected.length === 0 ? "Todos" : `${selected.length} selecionados`}
        </span>
        <ChevronDown size={14} className="text-slate-400"/>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-64 bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-60 overflow-y-auto z-50 p-1 animate-in fade-in zoom-in-95 duration-100">
           <div 
             className={`px-3 py-2 rounded-md hover:bg-slate-50 cursor-pointer text-xs font-bold flex items-center gap-2 ${selected.length === 0 ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
             onClick={() => { onChange('Todos'); setIsOpen(false); }}
           >
             {selected.length === 0 && <Check size={12}/>} Todos
           </div>
           
           <div className="h-px bg-slate-100 my-1"></div>

           {options && options.map((opt: string) => (
             <div 
               key={opt} 
               className={`px-3 py-2 rounded-md hover:bg-slate-50 cursor-pointer text-xs flex items-center gap-2 ${selected.includes(opt) ? 'text-blue-700 bg-blue-50 font-medium' : 'text-slate-600'}`}
               onClick={() => onChange(opt)}
             >
               <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                  {selected.includes(opt) && <Check size={10} className="text-white"/>}
               </div>
               {opt}
             </div>
           ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Visitante');

  const [analytics, setAnalytics] = useState({
    total: 0, media: 0, minimo: 0, top_aro: '-', top_concorrente: '-', competitors_list: [], brands_list: [] 
  });

  const [filters, setFilters] = useState<any>({
    region: 'Todas', brand: [], rim: [], competitor: [], search: '', origin: 'Todos'
  });

  const handleFilterChange = (key: string, value: string) => {
    let newSelected = [...filters[key]];
    if (value === 'Todos') {
        newSelected = [];
    } else {
        if (newSelected.includes(value)) {
            newSelected = newSelected.filter(item => item !== value);
        } else {
            newSelected.push(value);
        }
    }
    setFilters({ ...filters, [key]: newSelected });
  };

  const fetchData = async () => {
    const params = new URLSearchParams();
    if (filters.region !== 'Todas') params.append('region', filters.region);
    
    // Converte Array para string separada por virgula
    if (filters.brand.length > 0) params.append('brand', filters.brand.join(','));
    if (filters.rim.length > 0) params.append('rim', filters.rim.join(','));
    if (filters.competitor.length > 0) params.append('competitor', filters.competitor.join(','));
    
    if (filters.origin !== 'Todos') params.append('origin', filters.origin);
    if (filters.search) params.append('search', filters.search);

    try {
      // ADICIONEI { cache: 'no-store' } AQUI EMBAIXO
      // Lembre-se de trocar o link para http://localhost:8000 se estiver testando local
      // ou manter o do render se for o caso. Vou deixar localhost pq vc disse q ta no localhost.
      const res = await fetch(`https://pricetireforce.onrender.com/dashboard-data?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      setData(json);

      // E AQUI TAMBÉM
      const resAnal = await fetch(`https://pricetireforce.onrender.com/analytics?${params.toString()}`, { cache: 'no-store' });
      const jsonAnal = await resAnal.json();
      setAnalytics(jsonAnal);
    } catch (err) { console.error("Erro ao buscar dados", err); }
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchData(); }, 500); 
    return () => clearTimeout(timer);
  }, [filters]); 

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
      // AJUSTE SEU LINK AQUI
      const res = await fetch('https://pricetireforce.onrender.com/upload', { method: 'POST', body: formData });
      const result = await res.json();
      alert(result.mensagem);
      fetchData();
    } catch { alert("Erro no upload."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="Logo" className="h-10 w-auto" onError={(e) => e.currentTarget.style.display='none'} />
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right"><p className="text-xs text-slate-400">Logado como</p><p className="font-semibold text-yellow-500">{companyName}</p></div>
             <button onClick={() => { localStorage.clear(); window.location.href = '/' }} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded text-slate-300 transition">Sair</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-end mb-8">
          <div><h2 className="text-3xl font-bold text-slate-800">Painel de Monitoramento</h2><p className="text-slate-500 mt-1">Comparativo de preços em tempo real.</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div onClick={() => fileInputRef.current?.click()} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition cursor-pointer flex items-center gap-4 group">
            <div className="p-4 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition duration-300"><Upload size={24} /></div>
            <div><h3 className="font-bold text-slate-800">{loading ? 'Processando...' : 'Importar Dados'}</h3><p className="text-xs text-slate-500">Via Excel ou CSV</p></div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv, .xlsx"/>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 opacity-60"><div className="p-4 bg-purple-50 rounded-full text-purple-600"><Search size={24} /></div><div><h3 className="font-bold text-slate-800">Nova Coleta Manual</h3><p className="text-xs text-slate-500">Em breve</p></div></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition opacity-60"><div className="p-4 bg-green-50 rounded-full text-green-600"><FileSpreadsheet size={24} /></div><div><h3 className="font-bold text-slate-800">Baixar Relatório</h3><p className="text-xs text-slate-500">Exportar para PDF/Excel</p></div></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
            <div className="w-full md:w-64">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Busca Global</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-2 focus-within:border-blue-500 transition h-[38px]">
                    <Search size={16} className="text-slate-400"/>
                    <input type="text" placeholder="Ex: 14, PMZ, XBRI..." className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder:text-slate-400" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})}/>
                </div>
            </div>

            <div className="hidden md:block w-px h-8 bg-slate-200 mx-2 self-center"></div>

            <DropdownMultiSelect label="Empresas" options={analytics.competitors_list || []} selected={filters.competitor} onChange={(val: string) => handleFilterChange('competitor', val)}/>
            <DropdownMultiSelect label="Marcas" options={analytics.brands_list || []} selected={filters.brand} onChange={(val: string) => handleFilterChange('brand', val)}/>
            <DropdownMultiSelect label="Aros" options={['13','14','15','16','17','18','19','20','21','22']} selected={filters.rim} onChange={(val: string) => handleFilterChange('rim', val)}/>

            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origem</label>
                <select className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-blue-500 cursor-pointer h-[38px] w-32" value={filters.origin} onChange={(e) => setFilters({...filters, origin: e.target.value})}>
                    <option value="Todos">Todas</option><option value="NACIONAL">Nacional</option><option value="IMPORTADO">Importado</option>
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Região</label>
                <select className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-blue-500 cursor-pointer h-[38px] w-32" value={filters.region} onChange={(e) => setFilters({...filters, region: e.target.value})}>
                    <option value="Todas">Todas</option><option value="NO">Norte</option><option value="NE">Nordeste</option><option value="CO">Centro-Oeste</option><option value="SE">Sudeste</option><option value="S">Sul</option>
                </select>
            </div>

            {(filters.region !== 'Todas' || filters.brand.length > 0 || filters.rim.length > 0 || filters.competitor.length > 0 || filters.origin !== 'Todos' || filters.search !== '') && (
               <button onClick={() => window.location.reload()} className="text-xs text-red-500 hover:underline ml-auto mb-2 font-medium">Limpar Filtros</button>
            )}
        </div>

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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                  {/* ORDEM DAS COLUNAS ATUALIZADA */}
                  <tr>
                    <th className="px-5 py-4 border-b">Descrição da Medida</th>
                    <th className="px-5 py-4 border-b">Empresa</th>
                    <th className="px-5 py-4 border-b text-slate-500">Sell In</th>
                    <th className="px-5 py-4 border-b">Medida</th>
                    <th className="px-5 py-4 border-b">Marca</th>
                    <th className="px-5 py-4 border-b">Modelo</th>
                    <th className="px-5 py-4 border-b">Origem</th>
                    <th className="px-5 py-4 border-b text-center">Aro</th>
                    <th className="px-5 py-4 border-b">Sell Out</th>
                    <th className="px-5 py-4 border-b">MKP (%)</th>
                    <th className="px-5 py-4 border-b">Localidade</th>
                    <th className="px-5 py-4 border-b">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length === 0 ? (
                      <tr><td colSpan={12} className="text-center py-10 text-slate-400">Nenhum dado encontrado.</td></tr>
                  ) : (
                    data.map((item) => {
                      const dataObj = new Date(item.data);
                      const dataFormatada = dataObj.toLocaleDateString('pt-BR');
                      // Lógica do modelo limpo mantida
                      let modeloLimpo = item.produto.replace(item.marca, '').replace(item.medida, '').replace(item.aro, '').trim();
                      if (modeloLimpo.length < 2) modeloLimpo = "PADRÃO";

                      return (
                        <tr key={item.id} className="hover:bg-blue-50 transition duration-150 group">
                          {/* 1. Descrição (Produto Completo) */}
                          <td className="px-5 py-3 font-bold text-slate-700 whitespace-nowrap">{item.produto}</td>

                          {/* 2. Empresa */}
                          <td className="px-5 py-3 text-slate-600 text-xs font-medium">{item.concorrente}</td>

                          {/* 3. Sell In (Custo) */}
                          <td className="px-5 py-3">
                              {item.sell_in && item.sell_in > 0 ? (
                                  <span className="text-slate-500 font-bold ">R$ {item.sell_in.toFixed(2).replace('.', ',')}</span>
                              ) : (
                                  <span className="text-slate-300">-</span>
                              )}
                          </td>

                          {/* 4. Medida */}
                          <td className="px-5 py-3 text-slate-600 text-xs">{item.medida}</td>
                          
                          {/* 5. Marca */}
                          <td className="px-5 py-3"><span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">{item.marca}</span></td>
                          
                          {/* 6. Modelo */}
                          <td className="px-5 py-3 text-slate-500 text-xs font-medium uppercase tracking-wide">{modeloLimpo}</td>
                          
                          {/* 7. Origem */}
                          <td className="px-5 py-3">
                              {item.origin === 'NACIONAL' ? 
                                <span className="text-blue-600 text-xs font-bold flex items-center gap-1"><Globe size={10}/> NAC</span> : 
                                (item.origin === 'IMPORTADO' ? <span className="text-purple-600 text-xs font-bold">IMP</span> : <span className="text-slate-300">-</span>)
                              }
                          </td>

                          {/* 8. Aro */}
                          <td className="px-5 py-3 text-center text-slate-600 font-medium">{item.aro}</td>
                          
                          {/* 9. Sell Out (Venda) */}
                          <td className="px-5 py-3">
                            <div className={`font-bold text-base ${item.preco < analytics.media ? 'text-green-600' : 'text-slate-800'}`}>
                              R$ {item.preco.toFixed(2).replace('.', ',')}
                            </div>
                          </td>

                          {/* 10. MKP */}
                          <td className="px-5 py-3">
                             {item.mkp ? <span className="font-mono text-xs text-blue-600 font-bold">{(item.mkp * 100).toFixed(1)}%</span> : '-'}
                          </td>

                          {/* 11. Localidade */}
                          <td className="px-5 py-3 text-slate-500 text-xs">{item.city}</td>

                          {/* 12. Data */}
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