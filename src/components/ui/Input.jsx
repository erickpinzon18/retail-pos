export default function Input({
  label,
  id,
  type = 'text',
  error,
  className = '',
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`
          block w-full rounded-lg border py-2.5 px-3 text-gray-900
          shadow-sm ring-1 ring-inset transition duration-150 ease-in-out
          placeholder:text-gray-400
          focus:ring-2 focus:ring-inset focus:ring-indigo-600 focus:border-indigo-600
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 ring-red-300 focus:ring-red-500' 
            : 'border-gray-300 ring-gray-300'
          }
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
