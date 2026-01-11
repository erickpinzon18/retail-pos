import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const defaultColors = [
  'rgb(79, 70, 229)',
  'rgb(59, 130, 246)',
  'rgb(34, 197, 94)',
  'rgb(245, 158, 11)',
  'rgb(239, 68, 68)',
];

export default function CategoryChart({ 
  data, 
  labels,
  legendPosition = 'bottom'
}) {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ventas por Categoría',
        data,
        backgroundColor: defaultColors.slice(0, data.length),
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: legendPosition,
      },
    },
  };

  return <Doughnut data={chartData} options={options} />;
}
