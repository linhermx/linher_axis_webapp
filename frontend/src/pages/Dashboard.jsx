import {
  Briefcase,
  CalendarDays,
  Clock3,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Umbrella,
  Users,
} from 'lucide-react';
import {
  Card,
  StatusBadge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui';

const STATUS_META = {
  pending: { status: 'pending', label: 'Pendiente' },
  approved: { status: 'approved', label: 'Aprobado' },
  declined: { status: 'declined', label: 'Rechazado' },
};

const CALENDAR_WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const CALENDAR_DAYS = [
  { key: 'prev-29', day: 29, muted: true },
  { key: 'prev-30', day: 30, muted: true },
  { key: 'current-1', day: 1 },
  { key: 'current-2', day: 2 },
  { key: 'current-3', day: 3, markers: 1 },
  { key: 'current-4', day: 4 },
  { key: 'current-5', day: 5 },
  { key: 'current-6', day: 6 },
  { key: 'current-7', day: 7 },
  { key: 'current-8', day: 8, markers: 2 },
  { key: 'current-9', day: 9 },
  { key: 'current-10', day: 10 },
  { key: 'current-11', day: 11 },
  { key: 'current-12', day: 12 },
  { key: 'current-13', day: 13 },
  { key: 'current-14', day: 14, markers: 2 },
  { key: 'current-15', day: 15 },
  { key: 'current-16', day: 16 },
  { key: 'current-17', day: 17 },
  { key: 'current-18', day: 18 },
  { key: 'current-19', day: 19 },
  { key: 'current-20', day: 20 },
  { key: 'current-21', day: 21 },
  { key: 'current-22', day: 22, current: true },
  { key: 'current-23', day: 23, markers: 1 },
  { key: 'current-24', day: 24 },
  { key: 'current-25', day: 25, accent: true },
  { key: 'current-26', day: 26 },
  { key: 'current-27', day: 27, markers: 2 },
  { key: 'current-28', day: 28 },
  { key: 'current-29', day: 29, markers: 3 },
  { key: 'current-30', day: 30 },
  { key: 'current-31', day: 31 },
  { key: 'next-1', day: 1, muted: true },
  { key: 'next-2', day: 2, muted: true },
];

const Dashboard = () => {
  const stats = [
    {
      label: 'Total empleados',
      value: '1,248',
      icon: Users,
      iconTone: 'bg-sky-100 text-sky-600',
      trendIcon: TrendingUp,
      trendText: 'vs mes anterior',
      trendTone: 'text-status-success',
    },
    {
      label: 'De licencia hoy',
      value: '12',
      icon: Umbrella,
      iconTone: 'bg-amber-100 text-amber-600',
      trendIcon: TrendingDown,
      trendText: '4% menos que ayer',
      trendTone: 'text-status-success',
    },
    {
      label: 'Vacantes abiertas',
      value: '45',
      icon: Briefcase,
      iconTone: 'bg-violet-100 text-violet-600',
      subtitle: '8 roles urgentes',
    },
  ];

  const leaveStats = [
    { label: 'En vacaciones', total: 5, avatars: ['TJ', 'SN', 'MC'] },
    { label: 'Home office', total: 12, avatars: ['AL', 'NW', 'BH'] },
    { label: 'Licencia medica', total: 9, avatars: ['JR', 'DM', 'EC'] },
    { label: 'Dia libre', total: 4, avatars: ['LP', 'AR'] },
  ];

  const highlightedCandidates = [
    { id: 1, initials: 'NS', name: 'Niclas Salmon', role: 'Full Stack Developer' },
    { id: 2, initials: 'JP', name: 'Jensen Padmore', role: 'Senior Graphic Designer' },
    { id: 3, initials: 'MF', name: 'Melania Filkins', role: 'Copywriter' },
    { id: 4, initials: 'TR', name: 'Tommie Russel', role: 'Full Stack Developer' },
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
    },
    {
      id: 2,
      name: 'Salamon Newman',
      role: 'Senior Dev',
      type: 'Home office',
      period: '31 Dic',
      dateLabel: 'Hoy',
      statusKey: 'approved',
      avatar: 'S',
    },
    {
      id: 3,
      name: 'Monica Cutcher',
      role: 'Disenadora',
      type: 'Dia libre',
      period: '29 Dic - 31 Dic',
      dateLabel: 'Hoy',
      statusKey: 'declined',
      avatar: 'M',
    },
    {
      id: 4,
      name: 'Juliette Lagache',
      role: 'Project Manager',
      type: 'Home office',
      period: '04 Ene',
      dateLabel: 'Ayer',
      statusKey: 'approved',
      avatar: 'J',
    },
  ];

  const events = [
    {
      id: 'evt-1',
      title: 'Cumpleanos de Shane Wiggins',
      time: 'Todo el dia',
      badge: 'Feriado',
      tone: 'text-status-warning',
      badgeTone: 'bg-status-warning/15 text-status-warning',
    },
    {
      id: 'evt-2',
      title: 'Mikky Brongs - Reunion RH',
      time: '12:00 pm - 12:30 pm',
      badge: 'Reunion',
      tone: 'text-brand-primary',
      badgeTone: 'bg-brand-primary/10 text-brand-primary',
    },
    {
      id: 'evt-3',
      title: 'Weekly meeting',
      time: '2:00 pm - 3:00 pm',
      badge: 'Staff',
      tone: 'text-status-info',
      badgeTone: 'bg-status-info/10 text-status-info',
    },
  ];

  const timelineDays = ['21 Dic', '22 Dic', '23 Dic', '24 Dic', '25 Dic'];

  const timelineRows = [
    {
      id: 'row-1',
      member: 'Elvina Moore',
      role: 'Junior Full Stack Developer',
      blocks: [{ day: 0, label: 'Meeting with RH', tone: 'bg-amber-100 text-amber-700' }],
    },
    {
      id: 'row-2',
      member: 'Winona Wheelock',
      role: 'Project Manager',
      blocks: [{ day: 3, label: 'Meeting with RH', tone: 'bg-orange-100 text-orange-700' }],
    },
    {
      id: 'row-3',
      member: 'Mikky Brongs',
      role: 'Junior PHP Developer',
      blocks: [{ day: 1, label: 'End of probation', tone: 'bg-indigo-100 text-indigo-700' }],
    },
    {
      id: 'row-4',
      member: 'Adelaide Colton',
      role: 'Senior Business Analyst',
      blocks: [{ day: 2, label: 'Meeting with RH', tone: 'bg-amber-100 text-amber-700' }],
    },
    {
      id: 'row-5',
      member: 'Nathan Brasher',
      role: 'Middle Graphic Designer',
      blocks: [{ day: 4, label: 'End of probation', tone: 'bg-blue-100 text-blue-700' }],
    },
  ];

  return (
    <div className="grid gap-6 2xl:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="space-y-6">
        <Card title="Diciembre" subtitle="Calendario operativo" className="rounded-2xl p-5">
          <div className="grid grid-cols-7 gap-2">
            {CALENDAR_WEEK_DAYS.map((weekDay) => (
              <span
                key={weekDay}
                className="text-center text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-ui-text-secondary"
              >
                {weekDay}
              </span>
            ))}

            {CALENDAR_DAYS.map((dayItem) => (
              <div key={dayItem.key} className="flex flex-col items-center gap-1 rounded-lg py-1.5">
                <span
                  className={[
                    'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold',
                    dayItem.current ? 'bg-brand-primary text-white shadow-sm' : '',
                    dayItem.accent ? 'text-status-error' : '',
                    dayItem.muted ? 'text-ui-text-secondary/60' : 'text-ui-dark-navy',
                    !dayItem.current && !dayItem.muted ? 'hover:bg-ui-surface-subtle' : '',
                  ].join(' ')}
                >
                  {dayItem.day}
                </span>
                {dayItem.markers ? (
                  <span className="inline-flex gap-0.5" aria-hidden="true">
                    {Array.from({ length: dayItem.markers }).map((_, markerIndex) => (
                      <span key={`${dayItem.key}-marker-${markerIndex}`} className="h-1 w-1 rounded-full bg-brand-primary/65" />
                    ))}
                  </span>
                ) : (
                  <span className="h-1" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Eventos"
          subtitle="Agenda de hoy"
          className="rounded-2xl p-5"
          bodyClassName="space-y-3"
        >
          {events.map((eventItem) => (
            <article key={eventItem.id} className="rounded-xl border border-ui-light-slate bg-ui-surface-subtle p-3.5">
              <p className="text-sm font-semibold text-ui-dark-navy">{eventItem.title}</p>
              <p className="mt-1 text-xs text-ui-text-secondary">{eventItem.time}</p>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${eventItem.badgeTone}`}>
                {eventItem.badge}
              </span>
            </article>
          ))}
        </Card>
      </aside>

      <section className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trendIcon;

            return (
              <Card key={stat.label} className="rounded-2xl p-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconTone}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-2xl font-extrabold text-ui-dark-navy">{stat.value}</p>
                </div>

                <p className="text-sm font-semibold text-ui-text-secondary">{stat.label}</p>

                <div className="mt-3 flex items-center gap-2">
                  {TrendIcon ? (
                    <span className={`inline-flex items-center text-xs font-bold ${stat.trendTone}`}>
                      <TrendIcon size={16} />
                    </span>
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <Sparkles size={14} />
                    </span>
                  )}
                  {stat.trendText ? <span className="text-xs text-ui-text-secondary opacity-90">{stat.trendText}</span> : null}
                  {stat.subtitle ? <span className="text-xs text-ui-text-secondary opacity-90">{stat.subtitle}</span> : null}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
          <Card title="Job applications" subtitle="Candidatos destacados" className="rounded-2xl p-5">
            <ul className="space-y-3.5">
              {highlightedCandidates.map((candidate) => (
                <li key={candidate.id} className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ui-surface-subtle text-xs font-bold text-brand-primary">
                    {candidate.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ui-dark-navy">{candidate.name}</p>
                    <p className="truncate text-xs text-ui-text-secondary">Applied for {candidate.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Ausencias hoy" subtitle="Distribucion diaria" className="rounded-2xl p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {leaveStats.map((item) => (
                <article key={item.label} className="rounded-xl border border-ui-light-slate bg-ui-surface-subtle p-3.5">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.04em] text-ui-text-secondary">{item.label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-ui-dark-navy">{item.total}</p>
                  <div className="mt-2 flex -space-x-2">
                    {item.avatars.map((avatarCode) => (
                      <span
                        key={`${item.label}-${avatarCode}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-ui-surface bg-brand-primary/10 text-[0.625rem] font-bold text-brand-primary"
                      >
                        {avatarCode}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card title="Solicitudes" subtitle="Ultimos movimientos" className="rounded-2xl p-5">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableCaption>Solicitudes recientes de empleados</TableCaption>
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TableHeaderCell scope="col" className="bg-transparent px-0 py-3 text-ui-text-secondary opacity-80">
                      Nombre
                    </TableHeaderCell>
                    <TableHeaderCell scope="col" className="bg-transparent px-0 py-3 text-ui-text-secondary opacity-80">
                      Periodo
                    </TableHeaderCell>
                    <TableHeaderCell scope="col" className="bg-transparent px-0 py-3 text-ui-text-secondary opacity-80">
                      Tipo
                    </TableHeaderCell>
                    <TableHeaderCell scope="col" className="bg-transparent px-0 py-3 text-ui-text-secondary opacity-80">
                      Estado
                    </TableHeaderCell>
                    <TableHeaderCell scope="col" className="bg-transparent px-0 py-3 text-ui-text-secondary opacity-80">
                      Fecha
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {requests.map((requestItem) => {
                    const statusMeta = STATUS_META[requestItem.statusKey] || STATUS_META.pending;
                    return (
                      <TableRow key={requestItem.id} className="hover:bg-ui-background">
                        <TableCell className="px-0 py-4">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ui-surface-subtle text-xs font-bold text-brand-primary">
                              {requestItem.avatar}
                            </span>
                            <div>
                              <p className="font-semibold text-ui-dark-navy">{requestItem.name}</p>
                              <p className="text-[0.6875rem] text-ui-text-secondary">{requestItem.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-0 py-4">{requestItem.period}</TableCell>
                        <TableCell className="px-0 py-4">{requestItem.type}</TableCell>
                        <TableCell className="px-0 py-4">
                          <StatusBadge status={statusMeta.status} label={statusMeta.label} showDot />
                        </TableCell>
                        <TableCell className="px-0 py-4">{requestItem.dateLabel}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card title="Staff mood" subtitle="Pulso del equipo" className="rounded-2xl p-5">
            <div className="flex justify-center py-2">
              <div className="relative h-44 w-44">
                <svg viewBox="0 0 36 36" className="block h-full w-full">
                  <path
                    className="fill-none stroke-current text-ui-light-slate"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="fill-none stroke-current text-brand-action"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeDasharray="53, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="fill-none stroke-current text-status-success"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeDasharray="23, 100"
                    strokeDashoffset="-53"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="fill-none stroke-current text-status-warning"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeDasharray="14, 100"
                    strokeDashoffset="-76"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="fill-none stroke-current text-violet-500"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeDasharray="6, 100"
                    strokeDashoffset="-90"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-ui-dark-navy">58%</span>
                  <span className="text-xs font-semibold text-ui-text-secondary">Neutral</span>
                </div>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-xs font-semibold text-ui-text-secondary">
              <li className="flex items-center justify-between rounded-lg bg-ui-surface-subtle px-3 py-2">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-action" /> Neutral</span>
                <span>58%</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-ui-surface-subtle px-3 py-2">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-status-success" /> Happy</span>
                <span>23%</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-ui-surface-subtle px-3 py-2">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-status-warning" /> Excited</span>
                <span>14%</span>
              </li>
            </ul>
          </Card>
        </div>

        <Card
          title="Probation timeline"
          subtitle="Seguimiento semanal de reuniones y fin de periodo"
          className="rounded-2xl p-5"
        >
          <div className="overflow-x-auto">
            <div className="min-w-[860px] space-y-3">
              <div className="grid grid-cols-[240px_repeat(5,minmax(0,1fr))] gap-2 px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-ui-text-secondary">
                <span>Colaborador</span>
                {timelineDays.map((dayLabel) => (
                  <span key={dayLabel} className="text-center">{dayLabel}</span>
                ))}
              </div>

              {timelineRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[240px_repeat(5,minmax(0,1fr))] gap-2 rounded-xl border border-ui-light-slate bg-ui-surface-subtle px-2 py-2.5">
                  <div className="px-2">
                    <p className="text-sm font-semibold text-ui-dark-navy">{row.member}</p>
                    <p className="text-xs text-ui-text-secondary">{row.role}</p>
                  </div>

                  {timelineDays.map((_, dayIndex) => {
                    const block = row.blocks.find((item) => item.day === dayIndex);
                    return (
                      <div key={`${row.id}-day-${dayIndex}`} className="flex min-h-[38px] items-center justify-center rounded-lg border border-dashed border-ui-light-slate bg-ui-surface">
                        {block ? (
                          <span className={`rounded-md px-2 py-1 text-[0.6875rem] font-semibold ${block.tone}`}>
                            {block.label}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;
