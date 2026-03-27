import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, StatusView } from '../components/ui';
import Profile360Content from '../components/Profile360Content';
import ProfilePhotoActions from '../components/ProfilePhotoActions';
import { useAuth } from '../hooks/useAuth';
import { validateProfilePhotoFile } from '../lib/profilePhoto';
import api from '../services/api';

const MyProfile360 = () => {
  const { refreshSessionUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoRemoving, setPhotoRemoving] = useState(false);
  const [error, setError] = useState('');
  const [paymentsError, setPaymentsError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [linkMissing, setLinkMissing] = useState(false);

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    setError('');
    setLinkMissing(false);

    try {
      const { data } = await api.get('/me/profile');
      setProfile(data?.data || null);
    } catch (fetchError) {
      const responseCode = fetchError?.response?.data?.code;
      if (responseCode === 'MICROSIP_LINK_NOT_FOUND') {
        setLinkMissing(true);
        setProfile(null);
        return;
      }

      setError(fetchError?.response?.data?.message || 'No fue posible cargar tu perfil 360.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  const loadPayments = useCallback(async () => {
    if (!profile?.linked) {
      setPayments([]);
      return;
    }

    setLoadingPayments(true);
    setPaymentsError('');

    try {
      const { data } = await api.get('/me/payroll-payments?limit=10');
      setPayments(Array.isArray(data?.data) ? data.data : []);
    } catch (fetchError) {
      setPaymentsError(fetchError?.response?.data?.message || 'No fue posible cargar pagos recientes.');
    } finally {
      setLoadingPayments(false);
    }
  }, [profile?.linked]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const handleUploadPhoto = async (file) => {
    const validationError = validateProfilePhotoFile(file);
    if (validationError) {
      setPhotoError(validationError);
      return false;
    }

    setPhotoUploading(true);
    setPhotoError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);
      await api.post('/me/photo', formData);
      await loadProfile({ silent: true });
      if (typeof refreshSessionUser === 'function') {
        await refreshSessionUser();
      }
      return true;
    } catch (requestError) {
      setPhotoError(requestError?.response?.data?.message || 'No fue posible actualizar la foto de perfil.');
      return false;
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoRemoving(true);
    setPhotoError('');

    try {
      await api.delete('/me/photo');
      await loadProfile({ silent: true });
      if (typeof refreshSessionUser === 'function') {
        await refreshSessionUser();
      }
      return true;
    } catch (requestError) {
      setPhotoError(requestError?.response?.data?.message || 'No fue posible eliminar la foto de perfil.');
      return false;
    } finally {
      setPhotoRemoving(false);
    }
  };

  const hasProfilePhoto = Boolean(
    profile?.identity?.photo_url
    || profile?.identity?.photo_path
    || profile?.photo_url
    || profile?.photo_path
  );

  return (
    <section className="profile360-page">
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

      {!loading && !error && photoError ? (
        <Alert variant="error" title="No se pudo actualizar la foto">
          {photoError}
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
          photoActions={(
            <ProfilePhotoActions
              variant="overlay"
              disabled={photoUploading || photoRemoving}
              uploading={photoUploading}
              removing={photoRemoving}
              canRemove={hasProfilePhoto}
              onUpload={handleUploadPhoto}
              onRemove={handleRemovePhoto}
            />
          )}
        />
      ) : null}
    </section>
  );
};

export default MyProfile360;
