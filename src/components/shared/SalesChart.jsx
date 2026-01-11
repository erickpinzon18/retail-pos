import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const defaultColors = [
  { border: 'rgb(79, 70, 229)', background: 'rgba(79, 70, 229, 0.1)' },
  { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' },
  { border: 'rgb(34, 197, 94)', background: 'rgba(34, 197, 94, 0.1)' },
  { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' },
];

export default function SalesChart({ 
  data, 
  labels, 
  height = '450px',
  showLegend = true
}) {
  const chartData = {
    labels,
    datasets: data.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.values,
      borderColor: defaultColors[index % defaultColors.length].border,
      backgroundColor: defaultColors[index % defaultColors.length].background,
      fill: true,
      tension: 0.4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
