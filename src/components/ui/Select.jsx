export default function Select({
  label,
  id,
  options = [],
  error,
  className = '',
  placeholder = 'Seleccionar...',
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`
          block w-full rounded-lg border py-2 px-3 text-gray-900
          shadow-sm ring-1 ring-inset transition duration-150 ease-in-out
          focus:ring-2 focus:ring-inset focus:ring-indigo-600 focus:border-indigo-600
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 ring-red-300 focus:ring-red-500' 
            : 'border-gray-300 ring-gray-300'
          }
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
