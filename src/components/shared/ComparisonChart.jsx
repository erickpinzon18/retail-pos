import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ComparisonChart({ 
  weekdayValue, 
  weekendValue,
  labels = ['Último Mes'],
  height = '256px'
}) {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ventas entre Semana',
        data: [weekdayValue],
        backgroundColor: 'rgb(79, 70, 229)',
        borderRadius: 5,
      },
      {
        label: 'Ventas en Fin de Semana',
        data: [weekendValue],
        backgroundColor: 'rgb(59, 130, 246)',
        borderRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => '$' + new Intl.NumberFormat().format(value),
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
