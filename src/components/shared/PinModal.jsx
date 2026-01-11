import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ShieldCheck, Delete } from 'lucide-react';

export default function PinModal({ isOpen, onClose, onConfirm, title = 'Autorización Requerida' }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = (key) => {
    if (key === 'del') {
      setPin(prev => prev.slice(0, -1));
      setError('');
    } else if (key === 'C') {
      setPin('');
      setError('');
    } else if (pin.length < 4) {
      setPin(prev => prev + key);
      setError('');
    }
  };

  const handleConfirm = () => {
    if (pin.length !== 4) {
      setError('Ingresa un PIN de 4 dígitos');
      return;
    }
    // In a real app, validate the PIN against the stored admin PIN
    // For demo purposes, we accept any 4-digit PIN
    onConfirm(pin);
    setPin('');
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'del'];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="text-indigo-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-gray-600 mb-6">
          Ingresa el PIN de administrador para continuar.
        </p>

        {/* PIN Display */}
        <div className="flex justify-center space-x-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-colors ${
                i < pin.length ? 'bg-indigo-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 text-2xl font-bold mb-6">
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="py-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex items-center justify-center"
            >
              {key === 'del' ? <Delete size={24} /> : key}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleConfirm}
            disabled={pin.length !== 4}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
