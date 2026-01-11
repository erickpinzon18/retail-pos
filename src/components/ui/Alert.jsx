import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const variants = {
  info: {
    container: 'bg-blue-100 border-blue-500 text-blue-800',
    icon: <Info className="text-blue-600" size={20} />,
  },
  warning: {
    container: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    icon: <AlertTriangle className="text-yellow-600" size={20} />,
  },
  danger: {
    container: 'bg-red-100 border-red-500 text-red-800',
    icon: <AlertCircle className="text-red-600" size={20} />,
  },
  success: {
    container: 'bg-green-100 border-green-500 text-green-800',
    icon: <CheckCircle className="text-green-600" size={20} />,
  },
};

export default function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  action,
  className = '',
}) {
  const { container, icon } = variants[variant];

  return (
    <div
      className={`
        border-l-4 p-4 rounded-lg flex items-center justify-between shadow-md
        ${container}
        ${className}
      `}
    >
      <div className="flex items-center">
        <span className="mr-3">{icon}</span>
        <div>
          {title && <span className="font-bold">{title}: </span>}
          {children}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-current opacity-60 hover:opacity-100 text-2xl font-bold"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
