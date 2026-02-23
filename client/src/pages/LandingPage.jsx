import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Wind, 
  Shield, 
  Clock, 
  MapPin, 
  Cpu, 
  ArrowRight,
  Lightbulb,
  Activity,
  Globe,
  CheckCircle2,
  BarChart3
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: Zap,
      title: 'Мгновенная замена',
      description: 'Автоматическая замена перегоревших ламп за считанные минуты без участия человека'
    },
    {
      icon: Wind,
      title: 'Бесшумная работа',
      description: 'Специально разработанные бесшумные дроны не нарушают покой горожан'
    },
    {
      icon: Shield,
      title: 'Надёжность 99.9%',
      description: 'Система резервирования и постоянный мониторинг обеспечивают бесперебойную работу'
    },
    {
      icon: Clock,
      title: 'Работа 24/7',
      description: 'Круглосуточный мониторинг и мгновенный отклик на любые неисправности'
    },
    {
      icon: Cpu,
      title: 'ИИ-оптимизация',
      description: 'Искусственный интеллект оптимизирует маршруты и расход энергии'
    },
    {
      icon: BarChart3,
      title: 'Аналитика',
      description: 'Подробная статистика и прогнозирование для эффективного управления'
    }
  ];

  const stats = [
    { value: '15', label: 'минут', description: 'среднее время замены' },
    { value: '500+', label: '', description: 'установленных дронов' },
    { value: '99.9%', label: '', description: 'время безотказной работы' },
    { value: '60%', label: '', description: 'экономия на обслуживании' }
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Мониторинг',
      description: 'Датчики постоянно отслеживают состояние каждой лампы в реальном времени'
    },
    {
      step: '02',
      title: 'Диагностика',
      description: 'Система мгновенно определяет неисправность и планирует замену'
    },
    {
      step: '03',
      title: 'Замена',
      description: 'Дрон-замена вылетает с ближайшей базы и меняет лампу за минуты'
    },
    {
      step: '04',
      title: 'Восстановление',
      description: 'Старый дрон возвращается на базу для зарядки и диагностики'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">LuminaFly</span>
                <span className="hidden sm:inline text-xs text-gray-500 ml-2">Smart City Solutions</span>
              </div>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Войти
              </Link>
              <Link 
                to="/login" 
                className="btn-primary flex items-center gap-2"
              >
                Панель управления
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary-100/50 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-secondary-100/50 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                Инновационное решение для умного города
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Будущее уличного{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-500">
                  освещения
                </span>
                {' '}уже здесь
              </h1>
              
              <p className="mt-6 text-lg text-gray-600 leading-relaxed">
                LuminaFly — это автоматизированная система управления дронами-лампами, 
                которая обеспечивает бесперебойное освещение городских улиц 
                без участия человека.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/login" className="btn-primary flex items-center gap-2 text-lg px-8">
                  Демо доступ
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a 
                  href="#how-it-works" 
                  className="btn-secondary flex items-center gap-2 text-lg"
                >
                  Как это работает
                </a>
              </div>

              <div className="mt-12 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map((i) => (
                    <div 
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Уже работает в Казани</p>
                  <p className="text-sm text-gray-500">Набережная, 15+ столбов</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl">
                <div className="relative h-80 flex items-center justify-center">
                  <div className="absolute w-64 h-64 border-2 border-primary-500/20 rounded-full animate-ping" />
                  <div className="absolute w-48 h-48 border border-primary-500/30 rounded-full animate-pulse" />

                  <div className="relative animate-float">
                    <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center shadow-lg shadow-primary-500/50">
                      <Zap className="w-16 h-16 text-white" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-primary-500/30 rounded-full blur-xl" />
                  </div>

                  {[0, 120, 240].map((deg, i) => (
                    <div 
                      key={i}
                      className="absolute w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center"
                      style={{
                        animation: `orbit 8s linear infinite`,
                        animationDelay: `${i * 2.67}s`,
                        transformOrigin: 'center',
                      }}
                    >
                      <div className="w-3 h-3 bg-primary-500 rounded-full" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  {[
                    { icon: Activity, label: 'Статус', value: 'Онлайн' },
                    { icon: Lightbulb, label: 'Ламп', value: '15/15' },
                    { icon: Globe, label: 'Зона', value: 'Казань' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/10 rounded-xl p-4 text-center">
                      <stat.icon className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary-600">
                  {stat.value}
                  <span className="text-2xl text-gray-400">{stat.label}</span>
                </div>
                <p className="mt-2 text-gray-600">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Почему выбирают LuminaFly
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Современные технологии для комфортной городской среды
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="group card hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary-100 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 lg:py-32 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Как работает система
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Полностью автоматизированный процесс от обнаружения до замены
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-gray-800 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-500/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 lg:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl p-8 lg:p-16 text-center text-white">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Готовы увидеть систему в действии?
            </h2>
            <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
              Получите демо-доступ к панели управления и наблюдайте за работой 
              дронов на интерактивной карте в реальном времени.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                to="/login" 
                className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-primary-50 transition-colors inline-flex items-center gap-2"
              >
                Демо доступ
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-primary-200">
              Логин: <span className="font-mono">admin</span> / Пароль: <span className="font-mono">admin123</span>
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">LuminaFly</span>
              </Link>
              <p className="text-sm leading-relaxed max-w-sm">
                Инновационная система автоматизированного управления 
                уличным освещением с использованием дронов.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Разделы</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white transition-colors">Главная</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Панель управления</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Контакты</h4>
              <ul className="space-y-2 text-sm">
                <li>Казань, Россия</li>
                <li>info@luminafly.ru</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-sm text-center">
            © 2026 LuminaFly. Smart City Solutions.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(100px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
