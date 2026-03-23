import { useEffect, useState } from 'react';
import { Alert, Card, PageHeader, StatusView } from '../components/ui';
import Profile360Content from '../components/Profile360Content';
import api from '../services/api';
import '../styles/profile-360.css';

const MyProfile360 = () => {
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [error, setError] = useState('');
  const [paymentsError, setPaymentsError] = useState('');
  const [linkMissing, setLinkMissing] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError('');
      setLinkMissing(false);

      try {
        const { data } = await api.get('/me/profile');
        if (!active) return;

        setProfile(data?.data || null);
      } catch (fetchError) {
        if (!active) return;

        const responseCode = fetchError?.response?.data?.code;
        if (responseCode === 'MICROSIP_LINK_NOT_FOUND') {
          setLinkMissing(true);
          setProfile(null);
          return;
        }

        setError(fetchError?.response?.data?.message || 'No fue posible cargar tu perfil 360.');
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
  }, []);

  useEffect(() => {
    let active = true;

    const loadPayments = async () => {
      if (!profile?.linked) {
        return;
      }

      setLoadingPayments(true);
      setPaymentsError('');

      try {
        const { data } = await api.get('/me/payroll-payments?limit=10');
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
  }, [profile]);

  return (
    <section className="profile360-page">
      <PageHeader
        title="Mi Perfil 360"
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
          title="Perfil sin vínculo Microsip"
          description="Tu cuenta todavía no está enlazada con una ficha administrativa en Microsip. Solicita a RRHH completar el enlace para habilitar esta vista."
        />
      ) : null}

      {!loading && !error && !linkMissing && profile ? (
        <Profile360Content
          profile={profile}
          payments={payments}
          showPayments
          loadingPayments={loadingPayments}
          paymentsError={paymentsError}
        />
      ) : null}
    </section>
  );
};

export default MyProfile360;
