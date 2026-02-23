import React, { useEffect, useState } from 'react';
import { Wind, Battery, Clock, Activity, ChevronRight, Wrench, Zap, MapPin, X } from 'lucide-react';
import { dronesApi } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';

const DronesPage = () => {
  const [drones, setDrones] = useState([]);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [droneDetails, setDroneDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    loadDrones();
  }, []);

  useEffect(() => {
    if (lastMessage?.type === 'drone_position') {
      loadDrones();
    }
  }, [lastMessage]);

  useEffect(() => {
    if (selectedDrone) {
      loadDroneDetails(selectedDrone.id);
    }
  }, [selectedDrone]);

  const loadDrones = async () => {
    try {
      const response = await dronesApi.getAll();
      setDrones(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading drones:', error);
    }
  };

  const loadDroneDetails = async (id) => {
    try {
      const response = await dronesApi.getDetails(id);
      setDroneDetails(response.data);
    } catch (error) {
      console.error('Error loading drone details:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700 border-green-200',
      flying: 'bg-blue-100 text-blue-700 border-blue-200',
      maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      inactive: 'bg-gray-100 text-gray-700 border-gray-200',
      charging: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return colors[status] || colors.inactive;
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Активен',
      flying: 'В полёте',
      maintenance: 'Обслуживание',
      inactive: 'Неактивен',
      charging: 'Зарядка'
    };
    return labels[status] || status;
  };

  const filteredDrones = filter === 'all' 
    ? drones 
    : drones.filter(d => d.status === filter);

  const stats = {
    total: drones.length,
    active: drones.filter(d => d.status === 'active').length,
    flying: drones.filter(d => d.status === 'flying').length,
    maintenance: drones.filter(d => d.status === 'maintenance').length,
    inactive: drones.filter(d => d.status === 'inactive').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Управление дронами</h1>
        <p className="text-gray-500 mt-1">Мониторинг и статистика всех дронов системы</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Всего', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Активны', value: stats.active, color: 'bg-green-100 text-green-700' },
          { label: 'В полёте', value: stats.flying, color: 'bg-blue-100 text-blue-700' },
          { label: 'Обслуживание', value: stats.maintenance, color: 'bg-yellow-100 text-yellow-700' },
          { label: 'Неактивны', value: stats.inactive, color: 'bg-gray-100 text-gray-700' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} rounded-xl p-4 text-center`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm opacity-75">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Все дроны' },
          { key: 'active', label: 'Активные' },
          { key: 'flying', label: 'В полёте' },
          { key: 'maintenance', label: 'На обслуживании' },
          { key: 'inactive', label: 'Неактивные' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {filteredDrones.map(drone => (
            <div 
              key={drone.id}
              onClick={() => setSelectedDrone(drone)}
              className={`card cursor-pointer transition-all hover:shadow-md ${
                selectedDrone?.id === drone.id ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  drone.status === 'flying' ? 'bg-blue-100 animate-pulse' : 'bg-gray-100'
                }`}>
                  <Wind className={`w-7 h-7 ${
                    drone.status === 'flying' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 truncate">{drone.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(drone.status)}`}>
                      {getStatusLabel(drone.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{drone.serial_number}</p>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Battery className={`w-4 h-4 ${drone.battery_level < 20 ? 'text-red-500' : 'text-green-500'}`} />
                      <span className={drone.battery_level < 20 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {drone.battery_level}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Zap className="w-4 h-4" />
                      <span>{drone.lamp_status === 'working' ? 'Лампа OK' : 'Лампа перегорела'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Activity className="w-4 h-4" />
                      <span>{drone.total_missions} миссий</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}

          {filteredDrones.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Wind className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Нет дронов с выбранным фильтром</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          {selectedDrone && droneDetails ? (
            <div className="card sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Детали дрона</h2>
                <button 
                  onClick={() => setSelectedDrone(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                  selectedDrone.status === 'flying' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Wind className={`w-10 h-10 ${
                    selectedDrone.status === 'flying' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedDrone.name}</h3>
                <p className="text-sm text-gray-500">{selectedDrone.serial_number}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedDrone.status)}`}>
                  {getStatusLabel(selectedDrone.status)}
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Технические характеристики</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Уровень заряда:</span>
                      <span className={`font-medium ${selectedDrone.battery_level < 20 ? 'text-red-600' : 'text-gray-900'}`}>
                        {selectedDrone.battery_level}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Статус лампы:</span>
                      <span className={`font-medium ${selectedDrone.lamp_status === 'working' ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDrone.lamp_status === 'working' ? 'Работает' : 'Перегорела'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Всего миссий:</span>
                      <span className="font-medium text-gray-900">{selectedDrone.total_missions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Время полёта:</span>
                      <span className="font-medium text-gray-900">{selectedDrone.flight_time} мин</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Расположение</h4>
                  <div className="space-y-2 text-sm">
                    {selectedDrone.current_pole_id ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>Установлен на столбе #{selectedDrone.current_pole_id}</span>
                      </div>
                    ) : selectedDrone.current_base_id ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-4 h-4 rounded-full bg-green-500" />
                        <span>На базе #{selectedDrone.current_base_id}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Wind className="w-4 h-4" />
                        <span>В полёте</span>
                      </div>
                    )}
                    {selectedDrone.current_lat && (
                      <div className="text-xs text-gray-500">
                        Координаты: {selectedDrone.current_lat.toFixed(6)}, {selectedDrone.current_lon.toFixed(6)}
                      </div>
                    )}
                  </div>
                </div>

                {droneDetails.missions && droneDetails.missions.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Последние миссии</h4>
                    <div className="space-y-2">
                      {droneDetails.missions.slice(0, 3).map((mission, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className={`w-2 h-2 rounded-full ${
                            mission.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                          }`} />
                          <span className="text-gray-600">
                            {mission.type === 'replacement' ? 'Замена лампы' :
                             mission.type === 'return' ? 'Возврат на базу' :
                             mission.type === 'inspection' ? 'Инспекция' : 'Миссия'}
                          </span>
                          <span className="text-gray-400 text-xs ml-auto">
                            {new Date(mission.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400 text-center">
                  Создан: {new Date(selectedDrone.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500 sticky top-6">
              <Wind className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Выберите дрона для просмотра<br/>детальной информации</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DronesPage;
