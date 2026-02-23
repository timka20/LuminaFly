import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  MapPin, 
  Activity, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Wind,
  Battery,
  Plane
} from 'lucide-react';
import { statisticsApi, dronesApi, polesApi } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [drones, setDrones] = useState([]);
  const [poles, setPoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const loadData = async () => {
    try {
      const [statsRes, dronesRes, polesRes] = await Promise.all([
        statisticsApi.getAll(),
        dronesApi.getAll(),
        polesApi.getAll()
      ]);
      
      setStats(statsRes.data);
      setDrones(dronesRes.data);
      setPoles(polesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleWebSocketMessage = (message) => {
    const now = new Date().toLocaleTimeString('ru-RU');
    
    switch (message.type) {
      case 'lamp_burned_out':
        setRecentActivity(prev => [
          { time: now, type: 'warning', message: `Лампа перегорела (столб #${message.data.pole_id})` },
          ...prev.slice(0, 9)
        ]);
        break;
      case 'lamp_replaced':
        setRecentActivity(prev => [
          { time: now, type: 'success', message: `Лампа заменена дроном #${message.data.drone_id}` },
          ...prev.slice(0, 9)
        ]);
        break;
      case 'drone_repaired':
        setRecentActivity(prev => [
          { time: now, type: 'info', message: `Дрон #${message.data.drone_id} отремонтирован` },
          ...prev.slice(0, 9)
        ]);
        break;
      default:
        break;
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'primary', trend }) => (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 bg-${color}-50 rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600 font-medium">{trend}</span>
          <span className="text-sm text-gray-500">vs прошлая неделя</span>
        </div>
      )}
    </div>
  );

  const StatusBadge = ({ status }) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      flying: 'bg-blue-100 text-blue-700',
      maintenance: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-gray-100 text-gray-700',
      charging: 'bg-purple-100 text-purple-700',
      working: 'bg-green-100 text-green-700',
      burned_out: 'bg-red-100 text-red-700',
    };
    
    const labels = {
      active: 'Активен',
      flying: 'В полёте',
      maintenance: 'Обслуживание',
      inactive: 'Неактивен',
      charging: 'Зарядка',
      working: 'Работает',
      burned_out: 'Перегорела',
    };
    
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const flyingDrones = drones.filter(d => d.status === 'flying');
  const burnedOutPoles = poles.filter(p => p.lamp_status === 'burned_out');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Панель управления</h1>
          <p className="text-gray-500 mt-1">Обзор системы освещения в реальном времени</p>
        </div>
        <Link 
          to="/map" 
          className="btn-primary flex items-center gap-2 self-start"
        >
          <MapPin className="w-5 h-5" />
          Открыть карту
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Zap}
          title="Всего дронов"
          value={stats?.drones?.total_drones || 0}
          subtitle={`${stats?.drones?.active_drones || 0} активных`}
        />
        <StatCard 
          icon={MapPin}
          title="Уличные столбы"
          value={stats?.poles?.total_poles || 0}
          subtitle={`${stats?.poles?.working_lamps || 0} работают`}
          color="secondary"
        />
        <StatCard 
          icon={Activity}
          title="Миссий выполнено"
          value={stats?.missions?.completed_missions || 0}
          subtitle={`${stats?.missions?.total_missions || 0} всего`}
          color="green"
        />
        <StatCard 
          icon={Clock}
          title="Время работы"
          value="99.9%"
          subtitle="За последние 30 дней"
          color="purple"
        />
      </div>

      {burnedOutPoles.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Требуется внимание</h3>
            <p className="text-red-700 mt-1">
              {burnedOutPoles.length} {burnedOutPoles.length === 1 ? 'лампа перегорела' : 'ламп перегорело'}. 
              Дроны-замены уже отправлены.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Статус дронов</h2>
            <Link to="/drones" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
              Все дроны
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Дрон</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Статус</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Батарея</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Лампа</th>
                </tr>
              </thead>
              <tbody>
                {drones.slice(0, 5).map((drone) => (
                  <tr key={drone.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                          <Wind className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{drone.name}</p>
                          <p className="text-xs text-gray-500">{drone.serial_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={drone.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Battery className={`w-4 h-4 ${drone.battery_level < 20 ? 'text-red-500' : 'text-green-500'}`} />
                        <span className="text-sm">{drone.battery_level}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={drone.lamp_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Активность</h2>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Нет недавней активности</p>
            ) : (
              recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === 'success' ? 'bg-green-500' : 
                    activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {flyingDrones.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Дроны в полёте</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {flyingDrones.map((drone) => (
              <div key={drone.id} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center animate-pulse">
                    <Wind className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{drone.name}</p>
                    <p className="text-sm text-blue-600">Выполняет миссию</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Battery className="w-4 h-4 text-gray-400" />
                    <span>{drone.battery_level}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
