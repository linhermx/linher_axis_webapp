import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button, Card, PageHeader } from '../components/ui';
import '../styles/create-employee.css';

const CreateEmployee = () => {
  const navigate = useNavigate();
  const [step] = useState(1);

  return (
    <section className="create-employee">
      <PageHeader
        title={`Nuevo Empleado - Paso ${step} de 4`}
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            <span>Volver</span>
          </Button>
        }
      />

      <Card title="Formulario en construcción">
        <p className="create-employee__description">
          En la siguiente fase se integrarán secciones del formulario, validaciones y guardado real.
        </p>

        <div className="create-employee__actions">
          <Button type="button" onClick={() => navigate('/employees')}>
            <Save size={18} />
            <span>Guardar (Simulado)</span>
          </Button>

          <Button type="button" variant="ghost" onClick={() => navigate('/employees')}>
            Cancelar
          </Button>
        </div>
      </Card>
    </section>
  );
};

export default CreateEmployee;
