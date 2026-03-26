import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import { Alert, Button, Card, InputField } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

const ForcePasswordChange = () => {
  const { user, changeRequiredPassword, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !user.must_change_password) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Completa todos los campos para continuar.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La confirmación de contraseña no coincide.');
      return;
    }

    setLoading(true);
    try {
      await changeRequiredPassword(currentPassword, newPassword);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-required-page">
      <Card className="password-required-page__card" bodyClassName="password-required-page__body">
        <div className="password-required-page__hero">
          <span className="password-required-page__icon"><KeyRound size={30} /></span>
          <h1 className="password-required-page__title">Actualiza tu contraseña</h1>
          <p className="password-required-page__subtitle">
            Por seguridad, debes cambiar la contraseña temporal antes de usar AXIS.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="password-required-page__form">
          <InputField
            id="required-password-current"
            name="current_password"
            type="password"
            label="Contraseña temporal"
            placeholder="Ingresa tu contraseña actual"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            leftIcon={<Lock size={18} />}
          />

          <InputField
            id="required-password-new"
            name="new_password"
            type="password"
            label="Nueva contraseña"
            placeholder="Mínimo 10 caracteres con letra y número"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            leftIcon={<Lock size={18} />}
          />

          <InputField
            id="required-password-confirm"
            name="confirm_password"
            type="password"
            label="Confirmar nueva contraseña"
            placeholder="Repite la nueva contraseña"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            leftIcon={<Lock size={18} />}
          />

          {error ? (
            <Alert variant="error" title="No se pudo actualizar la contraseña">
              {error}
            </Alert>
          ) : null}

          <Button type="submit" size="lg" disabled={loading}>
            {loading ? 'Actualizando...' : 'Guardar y continuar'}
          </Button>

          <Button type="button" variant="ghost" onClick={logout} disabled={loading}>
            Cerrar sesión
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ForcePasswordChange;
