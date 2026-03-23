import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, PageHeader, StatusView } from '../components/ui';
import Profile360Content from '../components/Profile360Content';
import { useAuth } from '../hooks/useAuth';
import { hasAnyPermission } from '../lib/permissions';
import api from '../services/api';
import '../styles/profile-360.css';

const EmployeeProfile360 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [visibilityScope, setVisibilityScope] = useState('full');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [error, setError] = useState('');
  const [paymentsError, setPaymentsError] = useState('');
  const [linkMissing, setLinkMissing] = useState(false);

  const canViewPayroll = hasAnyPermission(user, ['view_payroll_employee']);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError('');
      setLinkMissing(false);

      try {
        const { data } = await api.get(`/employees/${id}/profile-360`);
        if (!active) return;

        setProfile(data?.data || null);
        setVisibilityScope(data?.visibility_scope || 'full');
      } catch (fetchError) {
        if (!active) return;

        const responseCode = fetchError?.response?.data?.code;
        if (responseCode === 'MICROSIP_LINK_NOT_FOUND') {
          setLinkMissing(true);
          setProfile(null);
          return;
        }

        setError(fetchError?.response?.data?.message || 'No fue posible cargar el perfil del colaborador.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    const loadPayments = async () => {
      if (!profile?.linked || visibilityScope !== 'full' || !canViewPayroll) {
        setPayments([]);
        return;
      }

      setLoadingPayments(true);
      setPaymentsError('');

      try {
        const { data } = await api.get(`/employees/${id}/payroll-payments?limit=10`);
        if (!active) return;

        setPayments(Array.isArray(data?.data) ? data.data : []);
      } catch (fetchError) {
        if (!active) return;

        setPaymentsError(fetchError?.response?.data?.message || 'No fue posible cargar pagos recientes.');
      } finally {
        if (active) {
          setLoadingPayments(false);
        }
      }
    };

    loadPayments();

    return () => {
      active = false;
    };
  }, [id, profile, visibilityScope, canViewPayroll]);

  return (
    <section className="profile360-page">
      <PageHeader
        title="Perfil de Colaborador"
        subtitle="Vista 360 de información administrativa sincronizada desde Microsip."
        actions={(
          <Button type="button" variant="secondary" onClick={() => navigate('/employees')}>
            <ArrowLeft size={16} />
            <span>Volver al directorio</span>
          </Button>
        )}
      />

      {loading ? (
        <Card>
          <p className="profile360-page__loading">Cargando perfil del colaborador...</p>
        </Card>
      ) : null}

      {!loading && error ? (
        <Alert variant="error" title="No se pudo cargar el perfil">
          {error}
        </Alert>
      ) : null}

      {!loading && !error && linkMissing ? (
        <StatusView
          title="Colaborador sin vínculo Microsip"
          description="Este colaborador todavía no tiene una ficha enlazada en Microsip."
        />
      ) : null}

      {!loading && !error && !linkMissing && profile ? (
        <Profile360Content
          profile={profile}
          payments={payments}
          showPayments={visibilityScope === 'full' && canViewPayroll}
          loadingPayments={loadingPayments}
          paymentsError={paymentsError}
        />
      ) : null}
    </section>
  );
};

export default EmployeeProfile360;
