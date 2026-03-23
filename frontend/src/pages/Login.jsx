import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Alert, Button, Card, InputField } from '../components/ui';
import '../styles/login.css';

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Ocurrió un error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-page__card" bodyClassName="login-page__form">
        <div className="login-page__hero">
          <span className="login-page__icon"><LogIn size={30} /></span>
          <h1 className="login-page__title">LINHER Axis</h1>
          <p className="login-page__subtitle">Accede a tu cuenta de RRHH</p>
        </div>

        <form onSubmit={handleSubmit} className="login-page__form">
          <InputField
            id="login-email"
            name="email"
            type="email"
            label="Correo electrónico"
            placeholder="correo@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            leftIcon={<Mail size={18} />}
          />

          <InputField
            id="login-password"
            name="password"
            type="password"
            label="Contraseña"
            placeholder="Tu contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            leftIcon={<Lock size={18} />}
          />

          {error ? (
            <Alert variant="error" title="No se pudo iniciar sesión">
              {error}
            </Alert>
          ) : null}

          <Button type="submit" size="lg" disabled={loading}>
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </Button>

          <p className="login-page__footer-note">
            Si olvidaste tu contraseña, solicita apoyo a RRHH o a Sistemas.
          </p>
        </form>
      </Card>
    </div>
  );
};

export default Login;
