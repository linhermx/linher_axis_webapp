import {
  Users,
  TrendingDown,
  TrendingUp,
  Briefcase,
  Umbrella,
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

const Dashboard = () => {
  const stats = [
    {
      label: 'Total Empleados',
      value: '1,248',
      icon: Users,
      iconTone: 'bg-sky-100 text-sky-600',
      trendIcon: TrendingUp,
      trendText: 'vs mes anterior',
      trendTone: 'text-status-success',
    },
    {
      label: 'De Licencia Hoy',
      value: '12',
      icon: Umbrella,
      iconTone: 'bg-amber-100 text-amber-600',
      trendIcon: TrendingDown,
      trendText: '4% menos que ayer',
      trendTone: 'text-status-success',
    },
    {
      label: 'Vacantes Abiertas',
      value: '45',
      icon: Briefcase,
      iconTone: 'bg-violet-100 text-violet-600',
      subtitle: '8 roles urgentes',
    },
  ];

  const requests = [
    {
      id: 1,
      name: 'Teresa Jenkins',
      role: 'Especialista de Ventas',
      type: 'Vacaciones',
      period: '01 Ene - 10 Ene',
      statusKey: 'pending',
      avatar: 'T',
    },
    {
      id: 2,
      name: 'Salamon Newman',
      role: 'Senior Dev',
      type: 'Licencia médica',
      period: 'Hoy',
      statusKey: 'approved',
      avatar: 'S',
    },
    {
      id: 3,
      name: 'Monica Cutcher',
      role: 'Diseñadora',
      type: 'Día libre',
      period: '29 Dic - 31 Dic',
      statusKey: 'declined',
      avatar: 'M',
    },
  ];

  const moodSegments = [
    {
      key: 'happy',
      label: 'Feliz (53%)',
      dashArray: '53, 100',
      dashOffset: '0',
      strokeClass: 'text-brand-action',
      dotClass: 'bg-brand-action',
    },
    {
      key: 'neutral',
      label: 'Neutral (23%)',
      dashArray: '23, 100',
      dashOffset: '-53',
      strokeClass: 'text-status-success',
      dotClass: 'bg-status-success',
    },
    {
      key: 'excited',
      label: 'Entusiasmado (14%)',
      dashArray: '14, 100',
      dashOffset: '-76',
      strokeClass: 'text-status-warning',
      dotClass: 'bg-status-warning',
    },
    {
      key: 'upset',
      label: 'Molesto (6%)',
      dashArray: '6, 100',
      dashOffset: '-90',
      strokeClass: 'text-violet-500',
      dotClass: 'bg-violet-500',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trendIcon;

          return (
            <Card key={stat.label} className="rounded-[20px] p-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${stat.iconTone}`}>
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
                ) : null}
                {stat.trendText ? (
                  <span className="text-xs text-ui-text-secondary opacity-80">{stat.trendText}</span>
                ) : null}
                {stat.subtitle ? (
                  <span className="text-xs text-ui-text-secondary opacity-80">{stat.subtitle}</span>
                ) : null}
              </div>
            </Card>
          );
        })}

        <Card className="rounded-[20px] border-none bg-[var(--gradient-primary)] p-6 text-white">
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] opacity-80">Expediente digital</p>
              <h3 className="my-1 text-lg font-bold">Validaciones pendientes</h3>
              <p className="text-xs opacity-80">15 documentos en revisión por RRHH</p>
            </div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em] opacity-80">
              Indicador operativo
            </p>
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-6">
          <Card title="Solicitudes" className="rounded-[20px]">
            <div className="overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableCaption>Solicitudes recientes de empleados</TableCaption>
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TableHeaderCell scope="col" className="bg-transparent px-0 py-3 text-ui-text-secondary opacity-70">
                      Empleado
                    </TableHeaderCell>
                    <TableHeaderCell scope="col" className="bg-transparent px-0 py-3 text-ui-text-secondary opacity-70">
                      Tipo
                    </TableHeaderCell>
                    <TableHeaderCell scope="col" className="bg-transparent px-0 py-3 text-ui-text-secondary opacity-70">
                      Periodo
                    </TableHeaderCell>
                    <TableHeaderCell scope="col" className="bg-transparent px-0 py-3 text-ui-text-secondary opacity-70">
                      Estado
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
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-background text-xs font-bold text-brand-primary">
                              {requestItem.avatar}
                            </div>
                            <div>
                              <p className="font-bold text-ui-dark-navy">{requestItem.name}</p>
                              <p className="text-[0.6875rem] text-ui-text-secondary">{requestItem.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-0 py-4">{requestItem.type}</TableCell>
                        <TableCell className="px-0 py-4">{requestItem.period}</TableCell>
                        <TableCell className="px-0 py-4">
                          <StatusBadge status={statusMeta.status} label={statusMeta.label} showDot />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card
            title="Reclutamiento"
            subtitle="Vista previa operativa del módulo de vacantes y candidatos."
            actions={<StatusBadge status="info" label="Próximamente" showDot />}
            className="rounded-[20px]"
          >
            <div className="space-y-2 text-sm text-ui-text-secondary">
              <p>
                Nuevos candidatos hoy:
                {' '}
                <span className="font-semibold text-ui-dark-navy">4</span>
              </p>
              <p>
                Vacantes con prioridad alta:
                {' '}
                <span className="font-semibold text-ui-dark-navy">8</span>
              </p>
              <p className="text-xs">
                El flujo completo de reclutamiento se habilitará al cerrar la fase correspondiente del MVP.
              </p>
            </div>
          </Card>
        </section>

        <section className="flex flex-col gap-6">
          <Card title="Clima laboral" className="rounded-[20px]">
            <div className="flex justify-center py-5">
              <div className="relative h-40 w-40">
                <svg viewBox="0 0 36 36" className="block h-full w-full">
                  <path
                    className="fill-none stroke-current text-ui-light-slate"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {moodSegments.map((segment) => (
                    <path
                      key={segment.key}
                      className={`fill-none stroke-current ${segment.strokeClass}`}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      strokeDasharray={segment.dashArray}
                      strokeDashoffset={segment.dashOffset}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  ))}
                </svg>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-ui-dark-navy">Bueno</span>
                  <span className="text-xs font-medium text-ui-text-secondary">Promedio</span>
                </div>
              </div>
            </div>

            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {moodSegments.map((segment) => (
                <li key={segment.key} className="flex items-center gap-2 text-xs font-semibold text-ui-slate">
                  <span className={`h-2 w-2 rounded-full ${segment.dotClass}`} />
                  <span>{segment.label}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Próximos eventos" className="rounded-[20px]">
            <div className="flex items-center justify-between rounded-xl border-l-4 border-brand-primary bg-sky-100 p-4">
              <div>
                <p className="text-sm font-bold text-ui-dark-navy">¡Cumpleaños de Shane Wiggins!</p>
                <p className="mt-0.5 text-[0.6875rem] font-semibold text-brand-primary">Feriado</p>
              </div>
              <p className="text-[0.6875rem] font-bold text-ui-text-secondary opacity-70">Todo el día</p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
