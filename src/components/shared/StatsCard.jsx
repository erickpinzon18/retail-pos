export default function StatsCard({
  title,
  value,
  icon,
  iconBgColor = 'bg-green-100',
  iconColor = 'text-green-600',
  trend,
  trendUp = true,
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
      <div className={`${iconBgColor} p-3 rounded-full`}>
        <span className={`text-3xl ${iconColor}`}>{icon}</span>
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {trend && (
          <p className={`text-xs ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? '▲' : '▼'} {trend}
          </p>
        )}
      </div>
    </div>
  );
}
