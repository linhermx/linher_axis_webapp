import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Lock, Mail } from 'lucide-react';
import { Button, Card, InputField } from '../components/ui';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Ocurrió un error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-background p-5">
      <Card className="w-full max-w-[440px] rounded-[20px] p-12 shadow-lg">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary text-white">
            <LogIn size={32} className="text-white" />
          </div>
          <h1 className="mb-2 text-[1.625rem] font-extrabold text-ui-dark-navy">LINHER Axis</h1>
          <p className="text-[0.9375rem] text-ui-text-secondary">Accede a tu cuenta de RRHH</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <InputField
            id="login-email"
            name="email"
            type="email"
            label="Correo electrónico"
            placeholder="correo@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
            required
            leftIcon={<Lock size={18} />}
          />

          {error && (
            <div
              role="alert"
              className="rounded-md border border-status-error bg-red-50 px-3 py-3 text-center text-sm text-status-error"
            >
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </Button>

          <a
            href="#"
            className="block pt-2 text-center text-sm font-semibold text-brand-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </form>
      </Card>
    </div>
  );
};

export default Login;
