import { useState, useEffect, useMemo } from 'react';
import { Tag, Calendar, Percent, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/formatCurrency';
import { useStore } from '../../context/StoreContext';
import { getAll } from '../../api/firestoreService';

const statusFilters = ['Activas', 'Programadas', 'Expiradas'];

export default function ViewPromotions() {
  const { storeId } = useStore();
  
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Activas');

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const data = await getAll('promotions');
        
        // Filter promotions for this store or global
        const storePromotions = data.filter(promo => 
          !promo.storeIds || 
          promo.storeIds.length === 0 || 
          promo.storeIds.includes('global') ||
          promo.storeIds.includes(storeId)
        );
        
        setPromotions(storePromotions);
      } catch (error) {
        console.error('Error fetching promotions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPromotions();
  }, [storeId]);

  // Categorize promotions
  const categorizedPromotions = useMemo(() => {
    const now = new Date();
    
    const active = [];
    const scheduled = [];
    const expired = [];
    
    promotions.forEach(promo => {
      const startDate = promo.createdAt?.toDate ? promo.createdAt.toDate() : new Date(promo.createdAt);
      const finishDate = promo.finishAt?.toDate ? promo.finishAt.toDate() : new Date(promo.finishAt);
      
      if (!promo.status) {
        expired.push({ ...promo, promoStatus: 'inactive' });
      } else if (finishDate < now) {
        expired.push({ ...promo, promoStatus: 'expired' });
      } else if (startDate > now) {
        scheduled.push({ ...promo, promoStatus: 'scheduled' });
      } else {
        active.push({ ...promo, promoStatus: 'active' });
      }
    });
    
    return { active, scheduled, expired };
  }, [promotions]);

  // Get current filter's promotions
  const displayedPromotions = useMemo(() => {
    switch (activeFilter) {
      case 'Activas':
        return categorizedPromotions.active;
      case 'Programadas':
        return categorizedPromotions.scheduled;
      case 'Expiradas':
        return categorizedPromotions.expired;
      default:
        return [];
    }
  }, [activeFilter, categorizedPromotions]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return { 
          border: 'border-green-500', 
          bg: 'bg-green-50',
          badge: 'success', 
          label: 'Activa',
          icon: CheckCircle,
          iconColor: 'text-green-500'
        };
      case 'scheduled':
        return { 
          border: 'border-blue-500', 
          bg: 'bg-blue-50',
          badge: 'info', 
          label: 'Programada',
          icon: Clock,
          iconColor: 'text-blue-500'
        };
      case 'expired':
      case 'inactive':
        return { 
          border: 'border-gray-300', 
          bg: 'bg-gray-50',
          badge: 'gray', 
          label: status === 'inactive' ? 'Inactiva' : 'Expirada',
          icon: XCircle,
          iconColor: 'text-gray-400',
          opacity: 'opacity-75'
        };
      default:
        return { 
          border: 'border-gray-300', 
          bg: 'bg-gray-50',
          badge: 'gray', 
          label: 'Desconocido',
          icon: AlertCircle,
          iconColor: 'text-gray-400'
        };
    }
  };

  const getCounts = () => ({
    active: categorizedPromotions.active.length,
    scheduled: categorizedPromotions.scheduled.length,
    expired: categorizedPromotions.expired.length
  });

  const counts = getCounts();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Promociones</h1>
        <p className="text-gray-500 mt-1">Vista de las promociones activas en la tienda.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activas</p>
              <p className="text-2xl font-bold text-gray-800">{counts.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Clock size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Programadas</p>
              <p className="text-2xl font-bold text-gray-800">{counts.scheduled}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-gray-400">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-xl">
              <XCircle size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Expiradas</p>
              <p className="text-2xl font-bold text-gray-800">{counts.expired}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 p-1 bg-gray-200 rounded-xl w-fit">
        {statusFilters.map((filter) => {
          const count = filter === 'Activas' ? counts.active : 
                        filter === 'Programadas' ? counts.scheduled : counts.expired;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 ${
                activeFilter === filter
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeFilter === filter ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-300 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Promotions Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando promociones...</div>
      ) : displayedPromotions.length === 0 ? (
        <div className="text-center py-12">
          <Tag size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No hay promociones {activeFilter.toLowerCase()}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPromotions.map((promo) => {
            const statusConfig = getStatusConfig(promo.promoStatus);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div
                key={promo.id}
                className={`bg-white rounded-xl shadow-md overflow-hidden border-t-4 ${statusConfig.border} ${statusConfig.opacity || ''}`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={statusConfig.badge}>{statusConfig.label}</Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Percent size={14} />
                      <span className="font-semibold">{promo.value}%</span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-800 text-lg mb-2">{promo.title}</h3>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Tag size={14} />
                    <span>Categoría: <strong>{promo.category || 'Todas'}</strong></span>
                  </div>
                  
                  {promo.storeIds && promo.storeIds.length > 0 && !promo.storeIds.includes('global') && (
                    <div className="text-xs text-gray-500 mb-2">
                      Aplica en {promo.storeIds.length} tienda(s)
                    </div>
                  )}
                </div>
                
                <div className={`px-5 py-3 ${statusConfig.bg} border-t border-gray-100`}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} />
                      <span>
                        {promo.promoStatus === 'scheduled' 
                          ? `Inicia: ${formatDate(promo.createdAt)}`
                          : promo.promoStatus === 'expired' || promo.promoStatus === 'inactive'
                          ? `Expiró: ${formatDate(promo.finishAt)}`
                          : `Termina: ${formatDate(promo.finishAt)}`
                        }
                      </span>
                    </div>
                    <StatusIcon size={18} className={statusConfig.iconColor} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
