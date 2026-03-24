import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from 'recharts';

const STATUS_META = {
  pending: { label: 'Pendiente', variant: 'pending' },
  approved: { label: 'Aprobado', variant: 'approved' },
  declined: { label: 'Rechazado', variant: 'declined' },
};

const CALENDAR_WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CALENDAR_EVENT_TEMPLATES = [
  {
    id: 'evt-1',
    day: 5,
    title: 'Cumpleaños de Shane Wiggins',
    time: 'Todo el día',
    badge: 'Feriado',
    badgeTone: 'warning',
    featured: true,
  },
  {
    id: 'evt-2',
    day: 12,
    title: 'Mikky Brongs - Reunión RH',
    time: '12:00 pm - 12:30 pm',
    badge: 'Reunión',
    badgeTone: 'primary',
  },
  {
    id: 'evt-3',
    day: 12,
    title: 'Stephan Wallace - Entrevista',
    time: '12:30 pm - 1:30 pm',
    badge: 'Reclutamiento',
    badgeTone: 'info',
  },
  {
    id: 'evt-4',
    day: 22,
    title: 'Reunión semanal',
    time: '2:00 pm - 3:00 pm',
    badge: 'Staff',
    badgeTone: 'primary',
  },
  {
    id: 'evt-5',
    day: 29,
    title: 'Revisión de onboarding',
    time: '3:30 pm - 4:00 pm',
    badge: 'Operacion',
    badgeTone: 'info',
  },
];

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-MX', { month: 'long' });
const TODAY = new Date();
const TODAY_KEY = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;

const toDateKey = (date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const formatMonthLabel = (date) => {
  const raw = MONTH_FORMATTER.format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const buildMonthEvents = (year, month) => (
  CALENDAR_EVENT_TEMPLATES.map((template, index) => {
    const date = new Date(year, month, template.day);
    return {
      ...template,
      id: `${year}-${month}-${index}-${template.id}`,
      date,
      dateKey: toDateKey(date),
    };
  })
);

const buildCalendarDays = (visibleMonth, eventCountMap, selectedDateKey) => {
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 35 }).map((_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(date);
    const markers = Math.min(eventCountMap[dateKey] || 0, 3);

    return {
      date,
      dateKey,
      day: date.getDate(),
      isInCurrentMonth:
        date.getMonth() === visibleMonth.getMonth() && date.getFullYear() === visibleMonth.getFullYear(),
      isSelected: dateKey === selectedDateKey,
      isToday: dateKey === TODAY_KEY,
      markers,
    };
  });
};

const Dashboard = () => {
  const currentYear = new Date().getFullYear();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(currentYear, 11, 1));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date(currentYear, 11, 22)));

  const calendarEvents = useMemo(() => {
    const current = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const prev = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);

    return [
      ...buildMonthEvents(prev.getFullYear(), prev.getMonth()),
      ...buildMonthEvents(current.getFullYear(), current.getMonth()),
      ...buildMonthEvents(next.getFullYear(), next.getMonth()),
    ];
  }, [visibleMonth]);

  const monthLabel = useMemo(() => formatMonthLabel(visibleMonth), [visibleMonth]);

  const eventCountMap = useMemo(
    () => calendarEvents.reduce((acc, eventItem) => {
      acc[eventItem.dateKey] = (acc[eventItem.dateKey] || 0) + 1;
      return acc;
    }, {}),
    [calendarEvents],
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth, eventCountMap, selectedDateKey),
    [eventCountMap, selectedDateKey, visibleMonth],
  );

  const events = useMemo(
    () => calendarEvents.filter((eventItem) => eventItem.dateKey === selectedDateKey),
    [calendarEvents, selectedDateKey],
  );

  const handleMonthChange = (offset) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDateKey(toDateKey(nextMonth));
  };

  const moodData = [
    { key: 'neutral', label: 'Neutral', value: 58, color: 'var(--mood-neutral)' },
    { key: 'happy', label: 'Feliz', value: 23, color: 'var(--mood-happy)' },
    { key: 'excited', label: 'Entusiasmado', value: 14, color: 'var(--mood-excited)' },
    { key: 'other', label: 'Otros', value: 5, color: 'var(--mood-other)' },
  ];

  const absences = [
    { label: 'En vacaciones', total: 5, avatars: ['TJ', 'SN', 'MC'] },
    { label: 'Trabajo remoto', total: 12, avatars: ['AL', 'NW', 'BH'] },
    { label: 'Licencia médica', total: 9, avatars: ['JR', 'DM', 'EC'] },
    { label: 'Día libre', total: 4, avatars: ['LP', 'AR'] },
    { label: 'Viaje de negocio', total: 2, avatars: ['VH'] },
  ];

  const highlightedCandidates = [
    { id: 1, initials: 'NS', name: 'Niclas Salmon', role: 'Desarrollador Full Stack' },
    { id: 2, initials: 'JP', name: 'Jensen Padmore', role: 'Diseñador gráfico senior' },
    { id: 3, initials: 'MF', name: 'Melania Filkins', role: 'Redactora' },
    { id: 4, initials: 'TR', name: 'Tommie Russel', role: 'Desarrollador Full Stack' },
    { id: 5, initials: 'AM', name: 'Anabelle Marshall', role: 'Diseñadora senior' },
    { id: 6, initials: 'AH', name: 'Allison Hooker', role: 'Desarrolladora Frontend' },
  ];

  const requests = [
    {
      id: 1,
      name: 'Teresa Jenkins',
      role: 'Especialista de Ventas',
      type: 'Vacaciones',
      period: '01 Ene - 10 Ene',
      dateLabel: 'Hoy',
      statusKey: 'pending',
      avatar: 'T',
      notes: 'Vacación anual',
    },
    {
      id: 2,
      name: 'Salamon Newman',
      role: 'Desarrollador senior',
      type: 'Trabajo remoto',
      period: '31 Dic',
      dateLabel: 'Hoy',
      statusKey: 'approved',
      avatar: 'S',
      notes: 'Trabajo remoto aprobado',
    },
    {
      id: 3,
      name: 'Monica Cutcher',
      role: 'Diseñadora',
      type: 'Día libre',
      period: '29 Dic - 31 Dic',
      dateLabel: 'Hoy',
      statusKey: 'declined',
      avatar: 'M',
      notes: 'Sin cobertura',
    },
    {
      id: 4,
      name: 'Juliette Lagache',
      role: 'Líder de proyectos',
      type: 'Trabajo remoto',
      period: '04 Ene',
      dateLabel: 'Ayer',
      statusKey: 'approved',
      avatar: 'J',
      notes: 'Aprobado por supervisor',
    },
  ];

  const timelineDays = ['21 Dic', '22 Dic', '23 Dic', '24 Dic', '25 Dic'];

  const timelineRows = [
    {
      id: 'row-1',
      member: 'Elvina Moore',
      role: 'Desarrolladora Full Stack junior',
      blocks: [{ day: 0, label: 'Reunión con RH', tone: 'warning' }],
    },
    {
      id: 'row-2',
      member: 'Winona Wheelock',
      role: 'Líder de proyectos',
      blocks: [{ day: 3, label: 'Reunión con RH', tone: 'warning' }],
    },
    {
      id: 'row-3',
      member: 'Mikky Brongs',
      role: 'Desarrollador PHP junior',
      blocks: [{ day: 1, label: 'Fin de período de prueba', tone: 'violet' }],
    },
    {
      id: 'row-4',
      member: 'Adelaide Colton',
      role: 'Analista de negocio senior',
      blocks: [{ day: 2, label: 'Reunión con RH', tone: 'warning' }],
    },
    {
      id: 'row-5',
      member: 'Nathan Brasher',
      role: 'Diseñador gráfico semi senior',
      blocks: [{ day: 4, label: 'Fin de período de prueba', tone: 'info' }],
    },
  ];

  return (
    <div className="axis-dashboard" role="region" aria-label="Dashboard operativo de RRHH">
      <aside className="axis-dashboard__aside">
        <section className="axis-panel axis-panel--agenda">
          <header className="axis-panel__header axis-panel__header--calendar">
            <button
              type="button"
              className="axis-calendar-nav__button"
              onClick={() => handleMonthChange(-1)}
              aria-label="Mes anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <h2 className="axis-panel__title">{monthLabel}</h2>
            <button
              type="button"
              className="axis-calendar-nav__button"
              onClick={() => handleMonthChange(1)}
              aria-label="Mes siguiente"
            >
              <ChevronRight size={15} />
            </button>
          </header>

          <div className="axis-calendar-grid">
            {CALENDAR_WEEK_DAYS.map((weekDay) => (
              <span key={weekDay} className="axis-calendar-weekday">
                {weekDay}
              </span>
            ))}

            {calendarDays.map((dayItem) => (
              <div key={dayItem.dateKey} className="axis-calendar-cell">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(dayItem.dateKey);
                    if (!dayItem.isInCurrentMonth) {
                      setVisibleMonth(new Date(dayItem.date.getFullYear(), dayItem.date.getMonth(), 1));
                    }
                  }}
                  aria-pressed={dayItem.isSelected}
                  className={[
                    'axis-calendar-day',
                    dayItem.isSelected ? 'is-current' : '',
                    dayItem.isToday ? 'is-accent' : '',
                    !dayItem.isInCurrentMonth ? 'is-muted' : '',
                  ].join(' ').trim()}
                >
                  {dayItem.day}
                </button>
                {dayItem.markers ? (
                  <span className="axis-calendar-markers" aria-hidden="true">
                    {Array.from({ length: dayItem.markers }).map((_, markerIndex) => (
                      <span key={`${dayItem.dateKey}-marker-${markerIndex}`} className="axis-calendar-marker" />
                    ))}
                  </span>
                ) : (
                  <span className="axis-calendar-markers axis-calendar-markers--empty" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          <div className="axis-agenda-divider" />

          <div className="axis-agenda-events-head">
            <h3>Eventos</h3>
            <button type="button" className="axis-panel__link">Todos</button>
          </div>

          <div className="axis-event-list">
            {events.length ? (
              events.map((eventItem) => (
                <article
                  key={eventItem.id}
                  className={[
                    `axis-event-item axis-event-item--${eventItem.badgeTone}`,
                    eventItem.featured ? 'is-featured' : '',
                  ].join(' ').trim()}
                >
                  <div className="axis-event-item__row">
                    <p className="axis-event-item__title">{eventItem.title}</p>
                    <span className="axis-event-item__time">{eventItem.time}</span>
                  </div>
                  <div className="axis-event-item__meta">
                    <span className={`axis-chip axis-chip--${eventItem.badgeTone}`}>{eventItem.badge}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="axis-event-empty">No hay eventos para este día.</p>
            )}
          </div>
        </section>
      </aside>

      <section className="axis-dashboard__main">
        <div className="axis-top-grid">
          <section className="axis-panel axis-panel--applications">
            <header className="axis-panel__header">
              <h2 className="axis-panel__title">Postulaciones</h2>
              <button type="button" className="axis-panel__link">Ver todo</button>
            </header>

            <ul className="axis-candidate-list axis-candidate-list--scroll">
              {highlightedCandidates.map((candidate) => (
                <li key={candidate.id} className="axis-candidate-item">
                  <span className="axis-avatar axis-avatar--candidate">{candidate.initials}</span>
                  <div className="axis-candidate-item__content">
                    <p className="axis-candidate-item__name">{candidate.name}</p>
                    <p className="axis-candidate-item__role">Postulado para {candidate.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="axis-top-right">
            <section className="axis-absence-strip" aria-label="Ausencias de hoy">
              {absences.map((item) => (
                <article key={item.label} className="axis-absence-item">
                  <p className="axis-absence-item__label">{item.label}</p>
                  <div className="axis-absence-item__row">
                    <div className="axis-avatar-stack">
                      {item.avatars.map((avatarCode) => (
                        <span key={`${item.label}-${avatarCode}`} className="axis-avatar axis-avatar--stacked">
                          {avatarCode}
                        </span>
                      ))}
                    </div>
                    <p className="axis-absence-item__value">{item.total}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="axis-panel axis-panel--requests">
              <header className="axis-panel__header">
                <h2 className="axis-panel__title">Solicitudes</h2>
                <button type="button" className="axis-panel__link">Ver todo</button>
              </header>

              <div className="axis-table-shell">
                <div className="axis-table-scroll" role="region" aria-label="Solicitudes recientes">
                  <table className="axis-table">
                    <caption className="axis-sr-only">Solicitudes recientes de empleados</caption>
                    <thead>
                      <tr>
                        <th scope="col">Nombre</th>
                        <th scope="col">Periodo</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Estado</th>
                        <th scope="col">Fecha</th>
                        <th scope="col">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((requestItem) => {
                        const statusMeta = STATUS_META[requestItem.statusKey] || STATUS_META.pending;

                        return (
                          <tr key={requestItem.id}>
                            <td>
                              <div className="axis-table-user">
                                <span className="axis-avatar axis-avatar--table">{requestItem.avatar}</span>
                                <div>
                                  <p className="axis-table-user__name">{requestItem.name}</p>
                                  <p className="axis-table-user__role">{requestItem.role}</p>
                                </div>
                              </div>
                            </td>
                            <td>{requestItem.period}</td>
                            <td>{requestItem.type}</td>
                            <td>
                              <span className={`axis-status axis-status--${statusMeta.variant}`}>
                                <span className="axis-status__dot" aria-hidden="true" />
                                {statusMeta.label}
                              </span>
                            </td>
                            <td>{requestItem.dateLabel}</td>
                            <td>{requestItem.notes}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="axis-bottom-grid">
          <section className="axis-panel axis-panel--timeline">
            <header className="axis-panel__header">
              <h2 className="axis-panel__title">Timeline de períodos de prueba</h2>
              <button type="button" className="axis-panel__link">Ver todo</button>
            </header>

            <div className="axis-timeline-grid axis-timeline-grid--header">
              <span>Colaborador</span>
              {timelineDays.map((dayLabel) => (
                <span key={dayLabel}>{dayLabel}</span>
              ))}
            </div>

            <div className="axis-timeline-scroll" role="region" aria-label="Timeline de período de prueba">
              {timelineRows.map((row) => (
                <div key={row.id} className="axis-timeline-grid axis-timeline-row">
                  <div className="axis-timeline-member">
                    <p>{row.member}</p>
                    <small>{row.role}</small>
                  </div>

                  {timelineDays.map((_, dayIndex) => {
                    const block = row.blocks.find((item) => item.day === dayIndex);

                    return (
                      <div key={`${row.id}-day-${dayIndex}`} className="axis-timeline-slot">
                        {block ? (
                          <span className={`axis-block-chip axis-block-chip--${block.tone}`}>{block.label}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          <section className="axis-panel axis-panel--mood">
            <header className="axis-panel__header">
              <h2 className="axis-panel__title">Clima del equipo</h2>
              <button type="button" className="axis-panel__link">Detalles</button>
            </header>

            <div className="axis-mood-center">
              <div className="axis-mood-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moodData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={76}
                      outerRadius={120}
                      paddingAngle={0.9}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {moodData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="axis-mood-value">
                  <span>58%</span>
                  <small>Neutral</small>
                </div>
              </div>
            </div>

            <ul className="axis-mood-list">
              {moodData.map((item) => (
                <li key={item.key}>
                  <span className="axis-mood-list__label">
                    <span className={`axis-dot axis-dot--${item.key}`} />
                    {item.label}
                  </span>
                  <span>{item.value}%</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
