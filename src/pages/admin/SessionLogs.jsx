import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { MapPin, Smartphone, Monitor, Globe, Clock, Shield, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function SessionLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'sessionLogs'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceIcon = (platform) => {
    if (!platform) return <Globe size={16} className="text-gray-400" />;
    const p = platform.toLowerCase();
    if (p.includes('iphone') || p.includes('android') || p.includes('ipad')) {
      return <Smartphone size={16} className="text-blue-500" />;
    }
    return <Monitor size={16} className="text-purple-500" />;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Registros de Sesión</h1>
          <p className="text-gray-500">Últimos 50 inicios de sesión en el sistema</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Dispositivo</th>
                <th className="px-4 py-3">Ubicación (GPS)</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Cargando registros...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No hay registros de sesión disponibles
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${log.status === 'failed' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                          {log.userName?.charAt(0) || <User size={14} />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{log.userName || 'Desconocido'}</p>
                          <p className="text-xs text-gray-500">{log.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium w-fit ${
                          log.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {log.status === 'failed' ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                          {log.status === 'failed' ? 'Fallido' : 'Exitoso'}
                        </span>
                        {log.failureReason && (
                          <span className="text-[10px] text-red-500 max-w-[150px] leading-tight">
                            {log.failureReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                        log.userRole === 'admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.userRole === 'admin' && <Shield size={12} />}
                        {log.userRole}
                        {log.userType && ` (${log.userType})`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Clock size={14} className="text-gray-400" />
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(log.platform)}
                        <div>
                          <p className="text-xs font-medium text-gray-700">{log.platform || 'Desconocido'}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[150px]" title={log.userAgent}>
                            {log.userAgent}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.location ? (
                        <a 
                          href={`https://www.google.com/maps?q=${log.location.latitude},${log.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors border border-green-200"
                        >
                          <MapPin size={14} />
                          Ver en Mapa
                          <span className="text-[10px] opacity-70 ml-1">
                            (±{Math.round(log.location.accuracy || 0)}m)
                          </span>
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs italic">No disponible</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <p className="font-medium text-gray-700">{log.ipAddress || '-'}</p>
                        {log.ipLocation && (
                          <p className="text-gray-500">
                            {log.ipLocation.city}, {log.ipLocation.region}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
