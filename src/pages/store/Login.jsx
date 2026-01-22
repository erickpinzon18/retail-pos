import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { login } from '../../api/authService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null); // null, 'checking', 'granted', 'denied'
  const navigate = useNavigate();

  useEffect(() => {
    // Check if permission is already granted
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setLocationStatus('granted');
        } else if (result.state === 'denied') {
          setLocationStatus('denied');
        }
        
        // Listen for changes
        result.onchange = () => {
          if (result.state === 'granted') {
            setLocationStatus('granted');
          } else if (result.state === 'denied') {
            setLocationStatus('denied');
          } else {
            setLocationStatus(null);
          }
        };
      });
    }
  }, []);

  const handleLocationRequest = async () => {
    setLocationStatus('checking');
    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocalización no disponible'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      setLocationStatus('granted');
    } catch (err) {
      setLocationStatus('denied');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/store');
      }
    } catch (err) {
      // Show the actual error message (schedule or geolocation errors)
      setError(err.message || 'Credenciales inválidas. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      {/* Logo and Title */}
      <div className="text-center mb-8">
        <div className="mx-auto h-12 w-12 flex items-center justify-center text-indigo-600">
          <ShoppingBag size={48} />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
          Flea Market POS
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Inicia sesión para administrar tu tienda
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Location Permission Notice */}
          <div className={`border p-4 rounded-lg text-sm ${
            locationStatus === 'granted' ? 'bg-green-50 border-green-200 text-green-800' :
            locationStatus === 'denied' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold mb-1">
                  📍 Ubicación Requerida
                  {locationStatus === 'granted' && ' ✓'}
                  {locationStatus === 'denied' && ' ✗'}
                </p>
                <p className="text-xs mb-3">
                  {locationStatus === 'granted' 
                    ? 'Permiso de ubicación concedido. Puedes iniciar sesión.'
                    : locationStatus === 'denied'
                    ? 'Permiso de ubicación denegado. Debes permitir el acceso en la configuración de tu navegador.'
                    : 'Por seguridad, se solicitará acceso a tu ubicación al iniciar sesión. Debes permitir el acceso para continuar.'
                  }
                </p>
                {locationStatus !== 'granted' && (
                  <button
                    type="button"
                    onClick={handleLocationRequest}
                    disabled={locationStatus === 'checking'}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                  >
                    {locationStatus === 'checking' ? 'Solicitando...' : 'Habilitar Ubicación'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <Input
            id="email"
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            autoComplete="email"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loading}
          >
            Ingresar
          </Button>
        </form>
      </div>

      {/* Footer */}
      <footer className="mt-10 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Retail POS by <a href="https://uphy.mx" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-indigo-600 transition-colors">uphy.mx</a>. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
