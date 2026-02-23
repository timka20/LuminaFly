import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, X } from 'lucide-react';
import { dronesApi, polesApi, basesApi } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';

const MapPage = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const ymapsRef = useRef(null);
  const [drones, setDrones] = useState([]);
  const [poles, setPoles] = useState([]);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPole, setSelectedPole] = useState(null);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [showLayers, setShowLayers] = useState({
    drones: true,
    poles: true,
    bases: true
  });
  const [mapReady, setMapReady] = useState(false);
  const { lastMessage, connected } = useWebSocket();
  
  const markersRef = useRef({ drones: {}, poles: {}, bases: {} });
  const dronesRef = useRef(drones);
  const polesRef = useRef(poles);
  const basesRef = useRef(bases);
  const DroneLayoutRef = useRef(null);
  const animationFrameId = useRef(null);
  const isAnimatingRef = useRef(false);

  const currentPositionsRef = useRef({});

  useEffect(() => { dronesRef.current = drones; }, [drones]);
  useEffect(() => { polesRef.current = poles; }, [poles]);
  useEffect(() => { basesRef.current = bases; }, [bases]);

  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        isAnimatingRef.current = false;
      }
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [dronesRes, polesRes, basesRes] = await Promise.all([
        dronesApi.getAll(),
        polesApi.getAll(),
        basesApi.getAll()
      ]);
      const initialDrones = dronesRes.data;
      initialDrones.forEach(drone => {
        if (drone.current_lat && drone.current_lon) {
          currentPositionsRef.current[drone.id] = {
            lat: parseFloat(drone.current_lat),
            lon: parseFloat(drone.current_lon),
            targetLat: parseFloat(drone.current_lat),
            targetLon: parseFloat(drone.current_lon)
          };
        }
      });
      setDrones(initialDrones);
      setPoles(polesRes.data);
      setBases(basesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  }, []);

  const getDroneConfig = (drone) => {
    const status = (drone.status || '').toLowerCase().trim();
    const isBroken = ['broken', 'maintenance', 'error', 'damaged', 'critical', 'fail', 'failure'].includes(status);
    const hasReplacedLamp = drone.current_pole_id && !['active', 'ready', 'idle', 'standby'].includes(status);
    
    if (isBroken || hasReplacedLamp) {
      return { 
        color: '#ef4444', 
        isFlying: true,
        isBroken: true,
        pulseColor: 'rgba(239, 68, 68, 0.4)',
        statusText: isBroken ? status : 'maintenance'
      };
    }
    
    if (status === 'flying' || status === 'in_transit' || status === 'moving') {
      return { 
        color: '#3b82f6', 
        isFlying: true,
        isBroken: false,
        pulseColor: 'rgba(59, 130, 246, 0.3)',
        statusText: status
      };
    }
    
    return { 
      color: '#10b981', 
      isFlying: false,
      isBroken: false,
      pulseColor: 'rgba(16, 185, 129, 0.3)',
      statusText: status || 'active'
    };
  };

  const createMarkers = useCallback(() => {
    if (!ymapsRef.current || !mapInstanceRef.current || !DroneLayoutRef.current) return;
    
    const ymaps = ymapsRef.current;
    if (Object.keys(markersRef.current.drones).length > 0) return;

    markersRef.current = { drones: {}, poles: {}, bases: {} };

    if (showLayers.bases) {
      basesRef.current.forEach(base => {
        const placemark = new ymaps.Placemark(
          [base.lat, base.lon],
          {
            hintContent: base.name,
            balloonContent: `
              <div style="padding: 12px; font-family: system-ui;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #111;">${base.name}</h3>
                <p style="margin: 0; color: #666; font-size: 13px;">Вместимость: ${base.capacity} дронов</p>
              </div>
            `
          },
          { 
            preset: 'islands#greenDotIcon', 
            iconColor: '#10b981',
            iconImageSize: [30, 30],
            zIndex: 100
          }
        );
        markersRef.current.bases[base.id] = placemark;
        mapInstanceRef.current.geoObjects.add(placemark);
      });
    }

    if (showLayers.poles) {
      polesRef.current.forEach(pole => {
        const isWorking = pole.lamp_status === 'working';
        const placemark = new ymaps.Placemark(
          [pole.lat, pole.lon],
          {
            hintContent: pole.name,
            balloonContent: `
              <div style="padding: 12px; font-family: system-ui;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #111;">${pole.name}</h3>
                <p style="margin: 0; color: ${isWorking ? '#16a34a' : '#dc2626'}; font-size: 13px;">
                  ${isWorking ? '✅ Работает' : '❌ Перегорела'}
                </p>
              </div>
            `
          },
          {
            preset: isWorking ? 'islands#yellowDotIcon' : 'islands#redDotIcon',
            iconColor: isWorking ? '#fbbf24' : '#ef4444',
            zIndex: 50
          }
        );
        placemark.events.add('click', () => { 
          setSelectedPole(pole); 
          setSelectedDrone(null); 
        });
        markersRef.current.poles[pole.id] = placemark;
        mapInstanceRef.current.geoObjects.add(placemark);
      });
    }

    if (showLayers.drones) {
      dronesRef.current.forEach(drone => {
        if (!drone.current_lat || !drone.current_lon) return;

        const config = getDroneConfig(drone);
        const pos = currentPositionsRef.current[drone.id] || {
          lat: parseFloat(drone.current_lat),
          lon: parseFloat(drone.current_lon)
        };

        const placemark = new ymaps.Placemark(
          [pos.lat, pos.lon],
          {
            hintContent: `${drone.name} (${config.statusText})`,
            color: config.color,
            isFlying: config.isFlying,
            isBroken: config.isBroken,
            pulseColor: config.pulseColor,
            statusText: config.statusText,
            batteryLevel: drone.battery_level,
            balloonContent: `
              <div style="padding: 12px; font-family: system-ui; min-width: 180px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #111;">${drone.name}</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #666; font-size: 13px;">Статус:</span>
                  <span style="font-weight: 500; color: ${config.color}; font-size: 13px; text-transform: capitalize;">${config.statusText}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #666; font-size: 13px;">Батарея:</span>
                  <span style="font-weight: 500; font-size: 13px;">${drone.battery_level}%</span>
                </div>
                ${drone.current_pole_id ? `<div style="display: flex; justify-content: space-between;"><span style="color: #666; font-size: 13px;">Столб:</span><span style="font-weight: 500; font-size: 13px;">#${drone.current_pole_id}</span></div>` : ''}
              </div>
            `
          },
          { 
            iconLayout: DroneLayoutRef.current, 
            iconShape: { type: 'Circle', coordinates: [0, 0], radius: 25 },
            zIndex: 200
          }
        );
        
        placemark.events.add('click', () => { 
          setSelectedDrone(drone); 
          setSelectedPole(null); 
        });
        markersRef.current.drones[drone.id] = placemark;
        mapInstanceRef.current.geoObjects.add(placemark);
      });
    }
  }, [showLayers]);

  const animateDrones = useCallback(() => {
    if (!isAnimatingRef.current) return;
    
    let needsNextFrame = false;
    const lerpSpeed = 0.02;

    dronesRef.current.forEach(drone => {
      const marker = markersRef.current.drones[drone.id];
      if (!marker || !drone.current_lat || !drone.current_lon) return;

      let pos = currentPositionsRef.current[drone.id];
      if (!pos) {
        pos = {
          lat: parseFloat(drone.current_lat),
          lon: parseFloat(drone.current_lon),
          targetLat: parseFloat(drone.current_lat),
          targetLon: parseFloat(drone.current_lon)
        };
        currentPositionsRef.current[drone.id] = pos;
      }

      pos.targetLat = parseFloat(drone.current_lat);
      pos.targetLon = parseFloat(drone.current_lon);

      const diffLat = pos.targetLat - pos.lat;
      const diffLon = pos.targetLon - pos.lon;
      const distance = Math.sqrt(diffLat * diffLat + diffLon * diffLon);

      const minDistance = 0.000001;

      if (distance > minDistance) {
        needsNextFrame = true;
        
        pos.lat += diffLat * lerpSpeed;
        pos.lon += diffLon * lerpSpeed;
        
        marker.geometry.setCoordinates([pos.lat, pos.lon]);
      } else {
        pos.lat = pos.targetLat;
        pos.lon = pos.targetLon;
      }
    });

    if (needsNextFrame) {
      animationFrameId.current = requestAnimationFrame(animateDrones);
    } else {
      isAnimatingRef.current = false;
      animationFrameId.current = null;
    }
  }, []);

  const updateDronesVisuals = useCallback(() => {
    if (!mapInstanceRef.current) return;

    dronesRef.current.forEach(drone => {
      const marker = markersRef.current.drones[drone.id];
      if (marker) {
        const config = getDroneConfig(drone);
        
        marker.properties.set({
          color: config.color,
          isFlying: config.isFlying,
          isBroken: config.isBroken,
          pulseColor: config.pulseColor,
          statusText: config.statusText,
          batteryLevel: drone.battery_level,
          hintContent: `${drone.name} (${config.statusText})`
        });
      }
    });

    if (!isAnimatingRef.current) {
      isAnimatingRef.current = true;
      animationFrameId.current = requestAnimationFrame(animateDrones);
    }
  }, [animateDrones]);

  const updatePoleColors = useCallback(() => {
    if (!mapInstanceRef.current) return;
    polesRef.current.forEach(pole => {
      const marker = markersRef.current.poles[pole.id];
      if (marker) {
        const isWorking = pole.lamp_status === 'working';
        marker.options.set({
          iconColor: isWorking ? '#fbbf24' : '#ef4444',
          preset: isWorking ? 'islands#yellowDotIcon' : 'islands#redDotIcon'
        });
      }
    });
  }, []);

  const handleWebSocketMessage = useCallback((message) => {
    if (!message || !message.type) return;
    
    switch (message.type) {
      case 'drone_position':
        setDrones(prev => prev.map(d => 
          d.id === message.data.drone_id 
            ? { ...d, current_lat: message.data.lat, current_lon: message.data.lon }
            : d
        ));
        break;
      case 'lamp_burned_out':
        setPoles(prev => prev.map(p => 
          p.id === message.data.pole_id ? { ...p, lamp_status: 'burned_out' } : p
        ));
        break;
      case 'lamp_fixed':
        setPoles(prev => prev.map(p => 
          p.id === message.data.pole_id ? { ...p, lamp_status: 'working', drone_id: message.data.drone_id } : p
        ));
        break;
      case 'drone_flying':
        setDrones(prev => prev.map(d => 
          d.id === message.data.drone_id ? { ...d, status: 'flying' } : d
        ));
        break;
      case 'drone_ready':
        setDrones(prev => prev.map(d => 
          d.id === message.data.drone_id ? { ...d, status: 'active', current_base_id: 1, current_pole_id: null } : d
        ));
        break;
      case 'drone_broken':
        setDrones(prev => prev.map(d => 
          d.id === message.data.drone_id ? { ...d, status: 'broken' } : d
        ));
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin { 
        from { transform: rotate(0deg); } 
        to { transform: rotate(360deg); } 
      }
      @keyframes pulse { 
        0%, 100% { transform: scale(1); opacity: 0.6; } 
        50% { transform: scale(1.2); opacity: 0.2; } 
      }
      @keyframes broken-pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        50% { transform: scale(1.1); opacity: 0.5; box-shadow: 0 0 20px 10px rgba(239, 68, 68, 0); }
      }
      @keyframes alert-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .drone-marker {
        will-change: transform, opacity;
        backface-visibility: hidden;
        transform: translateZ(0);
      }
      .broken-indicator {
        animation: alert-blink 1s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 100;
    
    const tryCreateMap = () => {
      attempts++;
      if (!mapRef.current || typeof window.ymaps === 'undefined') {
        if (attempts < maxAttempts) setTimeout(tryCreateMap, 100);
        return;
      }
      if (mapInstanceRef.current) return;

      window.ymaps.ready(() => {
        try {
          ymapsRef.current = window.ymaps;
          
          DroneLayoutRef.current = window.ymaps.templateLayoutFactory.createClass(`
            <div class="drone-marker" style="
              position: relative; 
              width: 44px; 
              height: 44px; 
              transform: translate(-50%, -50%);
            ">
              {% if properties.isFlying %}
                <div style="
                  position: absolute; 
                  inset: -15px; 
                  background: radial-gradient(circle, {{ properties.pulseColor }} 0%, transparent 70%); 
                  border-radius: 50%; 
                  animation: pulse 2s ease-in-out infinite;
                  pointer-events: none;
                "></div>
              {% endif %}
              
              {% if properties.isBroken %}
                <div style="
                  position: absolute; 
                  inset: -22px; 
                  border: 3px dashed #ef4444; 
                  border-radius: 50%; 
                  animation: spin 1.5s linear infinite;
                  opacity: 0.8;
                "></div>
                <div style="
                  position: absolute; 
                  inset: -28px; 
                  border: 2px solid rgba(239, 68, 68, 0.3); 
                  border-radius: 50%;
                  animation: pulse 1s ease-in-out infinite;
                "></div>
              {% endif %}
              
              <div class="{% if properties.isBroken %}broken-indicator{% endif %}" style="
                position: absolute; 
                inset: 0; 
                background: {{ properties.color }}; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.3); 
                border: 3px solid white; 
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
              ">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              
              {% if properties.isFlying && !properties.isBroken %}
                <div style="
                  position: absolute; 
                  inset: -8px; 
                  border: 2px dashed {{ properties.color }}; 
                  border-radius: 50%; 
                  animation: spin 3s linear infinite;
                  opacity: 0.7;
                "></div>
              {% endif %}
            </div>
          `);

          mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
            center: [55.8030, 49.1150],
            zoom: 16,
            controls: ['zoomControl', 'fullscreenControl'],
            behaviors: ['default', 'scrollZoom']
          });

          const layerButton = new window.ymaps.control.Button({
            data: { content: 'Спутник' },
            options: { selectOnClick: true, maxWidth: 120 }
          });
          layerButton.events.add('select', () => mapInstanceRef.current.setType('yandex#satellite'));
          layerButton.events.add('deselect', () => mapInstanceRef.current.setType('yandex#map'));
          mapInstanceRef.current.controls.add(layerButton, { float: 'right' });

          setMapReady(true);
        } catch (error) {
          console.error('Error creating map:', error);
        }
      });
    };

    setTimeout(tryCreateMap, 100);
  }, []);

  useEffect(() => {
    if (mapReady && drones.length > 0 && Object.keys(markersRef.current.drones).length === 0) {
      createMarkers();
    }
  }, [mapReady, drones.length, createMarkers]);

  useEffect(() => {
    if (mapReady) updateDronesVisuals();
  }, [drones, mapReady, updateDronesVisuals]);

  useEffect(() => {
    if (mapReady) updatePoleColors();
  }, [poles, mapReady, updatePoleColors]);

  useEffect(() => {
    if (lastMessage) handleWebSocketMessage(lastMessage);
  }, [lastMessage, handleWebSocketMessage]);

  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) mapInstanceRef.current.container.fitToViewport();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] -m-4 lg:-m-8">
      <div className="h-full flex">
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-10 shadow-lg">
          <div className="p-5 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Карта освещения</h1>
            <p className="text-sm text-gray-500 mt-1">Набережная Казани</p>
            
            <div className="mt-4 flex items-center gap-2 text-xs font-medium">
              <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={connected ? 'text-green-600' : 'text-red-600'}>
                {connected ? 'Real-time обновления' : 'Нет соединения'}
              </span>
            </div>
          </div>

          <div className="p-5 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Слои</h3>
            <div className="space-y-3">
              {[
                { key: 'drones', label: 'Дроны', color: 'bg-blue-500' },
                { key: 'poles', label: 'Столбы', color: 'bg-yellow-500' },
                { key: 'bases', label: 'Базы', color: 'bg-green-500' }
              ].map(layer => (
                <label key={layer.key} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showLayers[layer.key]}
                    onChange={(e) => setShowLayers(prev => ({ ...prev, [layer.key]: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition"
                  />
                  <span className={`w-3 h-3 rounded-full ${layer.color} shadow-sm group-hover:scale-110 transition-transform`} />
                  <span className="text-sm text-gray-700 font-medium">{layer.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-5 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Легенда</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500 shadow-md border-2 border-white" />
                <span className="text-gray-600 font-medium">Установлен/Активен</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-md border-2 border-white" />
                <span className="text-gray-600 font-medium">Летит на задание</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500 shadow-md border-2 border-white relative animate-pulse">
                  <div className="absolute inset-0 border-2 border-dashed border-red-300 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                </div>
                <span className="text-gray-600 font-medium">Требует обслуживания</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-md border-2 border-white" />
                <span className="text-gray-600 font-medium">Лампа работает</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500 shadow-md border-2 border-white" />
                <span className="text-gray-600 font-medium">Лампа перегорела</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5">
            {selectedDrone && (
              <div className={`rounded-xl p-5 shadow-sm border-l-4 transition-all duration-300 ${
                getDroneConfig(selectedDrone).isBroken
                  ? 'bg-red-50 border-red-500' 
                  : selectedDrone.status?.toLowerCase() === 'flying' 
                    ? 'bg-blue-50 border-blue-500' 
                    : 'bg-green-50 border-green-500'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">{selectedDrone.name}</h3>
                  <button 
                    onClick={() => setSelectedDrone(null)} 
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full p-1 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Статус:</span>
                    <span className={`font-semibold px-2 py-1 rounded-full text-xs ${
                      getDroneConfig(selectedDrone).isBroken
                        ? 'bg-red-100 text-red-700'
                        : selectedDrone.status?.toLowerCase() === 'flying'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {getDroneConfig(selectedDrone).statusText}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Батарея:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            selectedDrone.battery_level > 50 ? 'bg-green-500' : 
                            selectedDrone.battery_level > 20 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${selectedDrone.battery_level}%` }}
                        />
                      </div>
                      <span className="font-semibold">{selectedDrone.battery_level}%</span>
                    </div>
                  </div>
                  {selectedDrone.current_pole_id && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Обслуживает:</span>
                      <span className="font-medium">Столб #{selectedDrone.current_pole_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedPole && (
              <div className="bg-yellow-50 rounded-xl p-5 shadow-sm border-l-4 border-yellow-400">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">{selectedPole.name}</h3>
                  <button 
                    onClick={() => setSelectedPole(null)} 
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full p-1 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Статус лампы:</span>
                    <span className={`font-semibold px-2 py-1 rounded-full text-xs ${
                      selectedPole.lamp_status === 'working' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedPole.lamp_status === 'working' ? '✅ Работает' : '❌ Перегорела'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Координаты:</span>
                    <span className="font-mono text-xs text-gray-600">
                      {selectedPole.lat.toFixed(4)}, {selectedPole.lon.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!selectedDrone && !selectedPole && (
              <div className="text-center py-12 text-gray-400">
                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Нажмите на объект на карте<br/>для просмотра деталей</p>
              </div>
            )}
          </div>

          <div className="p-5 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-2xl font-bold text-gray-900">
                  {drones.filter(d => getDroneConfig(d).isFlying).length}
                </p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">в полёте</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-2xl font-bold text-red-600">
                  {drones.filter(d => getDroneConfig(d).isBroken).length}
                </p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">требуют ремонта</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 relative bg-gray-100" style={{ minHeight: '500px' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          
          {!mapReady && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500 font-medium">Загрузка карты...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;