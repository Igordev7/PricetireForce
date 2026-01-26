'use client';
import { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, Search, Upload, TrendingDown, Calendar, DollarSign, BarChart3, Globe, ChevronDown, Check, Tag, Package } from 'lucide-react';

// --- INTERFACES DE TIPAGEM ---
interface AnalyticsData {
  total: number;
  media: number;
  minimo: number;
  maximo: number;
  top_aro: string;
  top_concorrente: string;
  top_marca_concorrente: string;
  margem_media: number;
  competitors_list: string[];
  brands_list: string[];
  concorrentes_brands_list: string[];
}

interface TableData {
  id: number;
  produto: string;
  medida: string;
  marca_interna: string;
  modelo_interno: string;
  marca_concorrente: string;
  modelo_concorrente: string;
  aro: string;
  origin: string;
  concorrente: string;
  city: string;
  preco: number;
  sell_in: number;
  mkp: number;
  data: string;
}

interface Filters {
  region: string;
  marca_interna: string[];
  rim: string[];
  marca_concorrente: string[];
  competitor: string[];
  search: string;
  origin: string;
}

// --- COMPONENTE VISUAL: DROPDOWN COM MULTI-SELEÇÃO ---
const DropdownMultiSelect = ({ label, options, selected, onChange }: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
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
  const [data, setData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Visitante');

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    total: 0, 
    media: 0, 
    minimo: 0, 
    maximo: 0,
    top_aro: '-', 
    top_concorrente: '-',
    top_marca_concorrente: '-',
    margem_media: 0,
    competitors_list: [], 
    brands_list: [],
    concorrentes_brands_list: []
  });

  const [filters, setFilters] = useState<Filters>({
    region: 'Todas', 
    marca_interna: [],
    rim: [], 
    marca_concorrente: [],
    competitor: [],
    search: '', 
    origin: 'Todos'
  });

  const handleFilterChange = (key: keyof Filters, value: string) => {
    let newSelected = [...filters[key] as string[]];
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
    
    if (filters.marca_interna.length > 0) params.append('brand', filters.marca_interna.join(','));
    if (filters.rim.length > 0) params.append('rim', filters.rim.join(','));
    if (filters.competitor.length > 0) params.append('competitor', filters.competitor.join(','));
    
    if (filters.marca_concorrente.length > 0) params.append('competitor_brand', filters.marca_concorrente.join(','));
    
    if (filters.origin !== 'Todos') params.append('origin', filters.origin);
    if (filters.search) params.append('search', filters.search);

    try {
      const res = await fetch(`https://pricetireforce.onrender.com/dashboard-data?${params.toString()}`, { cache: 'no-store' });
      const json: TableData[] = await res.json();
      setData(json);

      // Calcula valores adicionais
      if (json.length > 0) {
        const precos = json.map((item: TableData) => item.preco);
        const minimo = Math.min(...precos);
        const maximo = Math.max(...precos);
        const media = precos.reduce((a: number, b: number) => a + b, 0) / precos.length;
        
        // Calcula margem média (MKP)
        const margens = json.filter((item: TableData) => item.mkp).map((item: TableData) => item.mkp);
        const margemMedia = margens.length > 0 
          ? (margens.reduce((a: number, b: number) => a + b, 0) / margens.length) * 100 
          : 0;
        
        // Encontra marca concorrente mais frequente
        const marcasCount: {[key: string]: number} = {};
        json.forEach((item: TableData) => {
          const marca = item.marca_concorrente;
          if (marca) {
            marcasCount[marca] = (marcasCount[marca] || 0) + 1;
          }
        });
        
        const topMarcaConcorrente = Object.entries(marcasCount)
          .sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || '-';
        
        // Extrai lista única de marcas concorrentes
        const marcasConcorrentes = [...new Set(json.map((item: TableData) => item.marca_concorrente).filter(Boolean))].sort() as string[];
        
        // Atualiza analytics com novos dados
        setAnalytics(prev => ({
          ...prev,
          total: json.length,
          media: media || 0,
          minimo: minimo || 0,
          maximo: maximo || 0,
          margem_media: margemMedia || 0,
          top_marca_concorrente: topMarcaConcorrente,
          concorrentes_brands_list: marcasConcorrentes
        }));
      }
      
      // Pega dados do endpoint /analytics para outras informações
      const resAnal = await fetch(`https://pricetireforce.onrender.com/analytics?${params.toString()}`, { cache: 'no-store' });
      const jsonAnal: Partial<AnalyticsData> = await resAnal.json();
      setAnalytics(prev => ({
        ...prev,
        top_aro: jsonAnal.top_aro || '-',
        top_concorrente: jsonAnal.top_concorrente || '-',
        competitors_list: jsonAnal.competitors_list || [],
        brands_list: jsonAnal.brands_list || []
      }));
      
    } catch (err) { 
      console.error("Erro ao buscar dados", err); 
    }
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
      const res = await fetch('https://pricetireforce.onrender.com:8000/upload', { method: 'POST', body: formData });
      const result = await res.json();
      alert(result.mensagem);
      fetchData();
    } catch { alert("Erro no upload."); } finally { setLoading(false); }
  };

  // Calcula preço mais competitivo (baseado no menor preço por medida)
  const getPrecoCompetitivo = () => {
    if (data.length === 0) return { preco: 0, medida: '', marca: '', concorrente: '' };
    
    // Agrupa por medida e encontra o menor preço
    const porMedida: {[key: string]: {preco: number, medida: string, marca: string, concorrente: string}} = {};
    
    data.forEach((item: TableData) => {
      const medida = item.medida;
      if (!porMedida[medida] || item.preco < porMedida[medida].preco) {
        porMedida[medida] = {
          preco: item.preco,
          medida: item.medida,
          marca: item.marca_concorrente,
          concorrente: item.concorrente
        };
      }
    });
    
    // Encontra o menor preço entre todas as medidas
    let maisCompetitivo = Object.values(porMedida)[0];
    Object.values(porMedida).forEach((item) => {
      if (item.preco < maisCompetitivo.preco) {
        maisCompetitivo = item;
      }
    });
    
    return maisCompetitivo || { preco: 0, medida: '', marca: '', concorrente: '' };
  };

  const precoCompetitivo = getPrecoCompetitivo();

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="Logo" className="h-10 w-auto" onError={(e) => (e.currentTarget as HTMLImageElement).style.display='none'} />
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
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Painel de Monitoramento</h2>
            <p className="text-slate-500 mt-1">Comparativo de preços em tempo real.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition cursor-pointer flex items-center gap-4 group"
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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 opacity-60">
            <div className="p-4 bg-purple-50 rounded-full text-purple-600">
              <Search size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Nova Coleta Manual</h3>
              <p className="text-xs text-slate-500">Em breve</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition opacity-60">
            <div className="p-4 bg-green-50 rounded-full text-green-600">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Baixar Relatório</h3>
              <p className="text-xs text-slate-500">Exportar para PDF/Excel</p>
            </div>
          </div>
        </div>

        {/* FILTROS ATUALIZADOS */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Busca Global</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-2 focus-within:border-blue-500 transition h-[38px]">
              <Search size={16} className="text-slate-400"/>
              <input 
                type="text" 
                placeholder="Ex: 185/70R14, Firestone, PMZ..." 
                className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder:text-slate-400" 
                value={filters.search} 
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-slate-200 mx-2 self-center"></div>

          
          {/* FILTRO POR MARCA INTERNA (Barum/Continental) */}
          <DropdownMultiSelect 
            label="Marcas Internas" 
            options={analytics.brands_list} 
            selected={filters.marca_interna} 
            onChange={(val: string) => handleFilterChange('marca_interna', val)}
          />
          
          {/* NOVO FILTRO: MARCA CONCORRENTE */}
          <DropdownMultiSelect 
            label="Marcas Concorrentes" 
            options={analytics.concorrentes_brands_list} 
            selected={filters.marca_concorrente} 
            onChange={(val: string) => handleFilterChange('marca_concorrente', val)}
          />
          
          {/* FILTRO POR ARO */}
          <DropdownMultiSelect 
            label="Aros" 
            options={['13','14','15','16','17','18','19','20','21','22']} 
            selected={filters.rim} 
            onChange={(val: string) => handleFilterChange('rim', val)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origem</label>
            <select 
              className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-blue-500 cursor-pointer h-[38px] w-32" 
              value={filters.origin} 
              onChange={(e) => setFilters({...filters, origin: e.target.value})}
            >
              <option value="Todos">Todas</option>
              <option value="NACIONAL">Nacional</option>
              <option value="IMPORTADO">Importado</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Região</label>
            <select 
              className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-blue-500 cursor-pointer h-[38px] w-32" 
              value={filters.region} 
              onChange={(e) => setFilters({...filters, region: e.target.value})}
            >
              <option value="Todas">Todas</option>
              <option value="NO">Norte</option>
              <option value="NE">Nordeste</option>
              <option value="CO">Centro-Oeste</option>
              <option value="SE">Sudeste</option>
              <option value="S">Sul</option>
            </select>
          </div>

          {(filters.region !== 'Todas' || 
            filters.marca_interna.length > 0 || 
            filters.marca_concorrente.length > 0 || 
            filters.rim.length > 0 || 
            filters.competitor.length > 0 || 
            filters.origin !== 'Todos' || 
            filters.search !== '') && (
            <button 
              onClick={() => {
                setFilters({
                  region: 'Todas',
                  marca_interna: [],
                  rim: [],
                  marca_concorrente: [],
                  competitor: [],
                  search: '',
                  origin: 'Todos'
                });
              }} 
              className="text-xs text-red-500 hover:underline ml-auto mb-2 font-medium"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* CARDS DE ANALYTICS ATUALIZADOS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
              <DollarSign size={12}/> Preço Médio
            </span>
            <span className="text-2xl font-bold text-slate-800">
              R$ {analytics.media.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Baseado em {analytics.total} coletas
            </span>
          </div>
          
          <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100 flex flex-col justify-center">
            <span className="text-xs text-green-600 font-bold uppercase mb-1 flex items-center gap-1">
              <TrendingDown size={12}/> Preço Competitivo
            </span>
            <span className="text-2xl font-bold text-green-700">
              R$ {precoCompetitivo.preco?.toFixed(2).replace('.', ',') || '0,00'}
            </span>
            <div className="text-xs text-green-600 mt-1 truncate" title={`${precoCompetitivo.marca} - ${precoCompetitivo.medida}`}>
              {precoCompetitivo.marca && precoCompetitivo.medida ? (
                <>em {precoCompetitivo.medida} ({precoCompetitivo.marca})</>
              ) : 'N/A'}
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col justify-center">
            <span className="text-xs text-blue-600 font-bold uppercase mb-1 flex items-center gap-1">
              <Package size={12}/> Margem Média
            </span>
            <span className="text-2xl font-bold text-blue-700">
              {analytics.margem_media.toFixed(1)}%
            </span>
            <span className="text-xs text-blue-600 mt-1">
              Markup sobre custo
            </span>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col justify-center">
            <span className="text-xs text-purple-600 font-bold uppercase mb-1 flex items-center gap-1">
              <Tag size={12}/> Marca Top
            </span>
            <span className="text-2xl font-bold text-purple-700 truncate" title={analytics.top_marca_concorrente}>
              {analytics.top_marca_concorrente || '-'}
            </span>
            <span className="text-xs text-purple-600 mt-1">
              Mais frequente no mercado
            </span>
          </div>
        </div>

        {/* TABELA DE DADOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="px-5 py-4 border-b">Medida</th>
                  <th className="px-5 py-4 border-b text-blue-700">MARCA (Int)</th>
                  <th className="px-5 py-4 border-b text-blue-700">MODELO (Int)</th>
                  <th className="px-5 py-4 border-b text-slate-500">Sell In</th>
                  <th className="px-5 py-4 border-b text-purple-700">Marca (Conc)</th>
                  <th className="px-5 py-4 border-b text-purple-700">Modelo (Conc)</th>
                
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
                  <tr>
                    <td colSpan={13} className="text-center py-10 text-slate-400">
                      Nenhum dado encontrado. Faça upload de uma planilha ou ajuste os filtros.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => {
                    const dataObj = new Date(item.data);
                    const dataFormatada = dataObj.toLocaleDateString('pt-BR');
                    const mkpPercent = item.mkp ? (item.mkp * 100).toFixed(1) : '-';
                    const isCompetitivo = item.preco === precoCompetitivo.preco && item.medida === precoCompetitivo.medida;

                    return (
                      <tr key={item.id} className={`hover:bg-blue-50 transition duration-150 group ${isCompetitivo ? 'bg-green-50' : ''}`}>
                        {/* 1. Medida */}
                        <td className="px-5 py-3 font-bold text-slate-700 whitespace-nowrap">
                          {item.medida}
                        </td>

                        {/* 2. MARCA INTERNA (Barum/Continental) */}
                        <td className="px-5 py-3 text-blue-700 text-xs font-bold uppercase bg-blue-50 border border-blue-100 rounded">
                          {item.marca_interna || "BARUM"}
                        </td>

                        {/* 3. MODELO INTERNO */}
                        <td className="px-5 py-3 text-blue-600 text-xs font-medium">
                          {item.modelo_interno || "5HM"}
                        </td>

                        {/* 4. Sell In (Custo) */}
                        <td className="px-5 py-3">
                          {item.sell_in && item.sell_in > 0 ? (
                            <span className="text-slate-500 font-bold">R$ {item.sell_in.toFixed(2).replace('.', ',')}</span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>

                        {/* 5. Marca Concorrente (Firestone/Goodyear) */}
                        <td className="px-5 py-3">
                          <span className="px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                            {item.marca_concorrente || item.marca_interna}
                          </span>
                        </td>
                        
                        {/* 6. Modelo Concorrente */}
                        <td className="px-5 py-3 text-purple-600 text-xs font-medium uppercase tracking-wide">
                          {item.modelo_concorrente || item.modelo_interno}
                        </td>
                        
                       

                        {/* 8. Origem */}
                        <td className="px-5 py-3">
                          {item.origin === 'NACIONAL' ? (
                            <span className="text-blue-600 text-xs font-bold flex items-center gap-1">
                              <Globe size={10}/> NAC
                            </span>
                          ) : item.origin === 'IMPORTADO' ? (
                            <span className="text-purple-600 text-xs font-bold">IMP</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* 9. Aro */}
                        <td className="px-5 py-3 text-center text-slate-600 font-medium">
                          {item.aro}
                        </td>
                        
                        {/* 10. Sell Out (Venda) - Destaca se for preço competitivo */}
                        <td className="px-5 py-3">
                          <div className={`font-bold text-base ${isCompetitivo ? 'text-green-600 animate-pulse' : item.preco < analytics.media ? 'text-green-500' : 'text-slate-800'}`}>
                            R$ {item.preco.toFixed(2).replace('.', ',')}
                            {isCompetitivo && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Melhor
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 11. MKP */}
                        <td className="px-5 py-3">
                          {mkpPercent !== '-' ? (
                            <span className={`font-mono text-xs font-bold ${item.mkp > 0.3 ? 'text-green-600' : item.mkp > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {mkpPercent}%
                            </span>
                          ) : '-'}
                        </td>

                        {/* 12. Localidade */}
                        <td className="px-5 py-3 text-slate-500 text-xs">
                          {item.city}
                        </td>

                        {/* 13. Data */}
                        <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar size={12}/> {dataFormatada}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RESUMO ESTATÍSTICO */}
        {data.length > 0 && (
          <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Resumo Estatístico</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Preço Mínimo</p>
                <p className="font-bold text-slate-800">R$ {analytics.minimo.toFixed(2).replace('.', ',')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Preço Máximo</p>
                <p className="font-bold text-slate-800">R$ {analytics.maximo.toFixed(2).replace('.', ',')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Aro Mais Comum</p>
                <p className="font-bold text-slate-800">{analytics.top_aro}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total de Coletas</p>
                <p className="font-bold text-slate-800">{analytics.total}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}