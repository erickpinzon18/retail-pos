import { useState, useEffect } from 'react';
import { Key, Copy, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { generateSuperToken } from '../../api/firestoreService';
import Button from '../../components/ui/Button';

export default function GenerateToken() {
  const { user } = useAuth();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, [token]); // Refresh history when new token is generated

  const fetchHistory = async () => {
    try {
      const q = query(
        collection(db, 'tokens'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    let interval;
    if (token && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Token expired locally
    }
    return () => clearInterval(interval);
  }, [token, timeLeft]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const newToken = await generateSuperToken(user);
      setToken(newToken);
      setTimeLeft(300); // 5 minutes in seconds
    } catch (error) {
      console.error('Error generating token:', error);
      alert('Error al generar token');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token.code);
      alert('Código copiado al portapapeles');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Generar Token de Autorización</h1>
        <p className="text-gray-500">
          Crea un código temporal para autorizar devoluciones y acciones especiales en caja.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
          <ShieldCheck size={48} className="mx-auto mb-3 opacity-90" />
          <h2 className="text-xl font-bold">Super Token Seguro</h2>
          <p className="text-indigo-100 text-sm mt-1">Válido por 5 minutos</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {!token || timeLeft === 0 ? (
            <div className="text-center py-8">
              <div className="mb-6 bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto text-gray-400">
                <Key size={40} />
              </div>
              <p className="text-gray-600 mb-8">
                Genera un nuevo código para compartir con el vendedor.
                Este código autorizará una única transacción.
              </p>
              <Button 
                onClick={handleGenerate} 
                loading={loading}
                size="lg"
                className="w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                Generar Nuevo Token
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Código de Autorización</p>
                <div 
                  className="bg-gray-50 border-2 border-indigo-100 rounded-2xl py-6 px-4 cursor-pointer hover:bg-indigo-50 transition-colors group relative"
                  onClick={copyToClipboard}
                >
                  <span className="text-5xl font-mono font-bold tracking-[0.2em] text-indigo-600">
                    {token.code.slice(0, 3)} {token.code.slice(3)}
                  </span>
                  <div className="absolute top-2 right-2 text-gray-300 group-hover:text-indigo-400">
                    <Copy size={20} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-orange-600 font-medium bg-orange-50 py-2 rounded-lg">
                <Clock size={20} className="animate-pulse" />
                <span>Expira en: {formatTime(timeLeft)}</span>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-start gap-3 text-left p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
                  <p>
                    Comparte este código con el vendedor. Una vez usado, el token quedará invalidado automáticamente.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleGenerate}
                  className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
                >
                  Generar otro código
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Token History */}
      <div className="mt-12 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl mx-auto">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Historial de Tokens Recientes</h2>
          <Button size="sm" variant="gray" onClick={fetchHistory}>Actualizar</Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Generado Por</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3">Usado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No hay historial de tokens
                  </td>
                </tr>
              ) : (
                history.map((t) => {
                  const created = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
                  const isExpired = t.status !== 'used' && new Date() > (t.expiresAt?.toDate ? t.expiresAt.toDate() : new Date(t.expiresAt));
                  
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                        {t.code}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          t.status === 'used' ? 'bg-green-100 text-green-700' :
                          isExpired || t.status === 'expired' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {t.status === 'used' ? 'Usado' : 
                           isExpired || t.status === 'expired' ? 'Expirado' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {t.createdBy?.name?.charAt(0)}
                          </div>
                          <span>{t.createdBy?.name || 'Admin'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {created.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        {t.usedBy ? (
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                              {t.usedBy?.name?.charAt(0)}
                            </div>
                            <span className="text-gray-700">{t.usedBy?.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
