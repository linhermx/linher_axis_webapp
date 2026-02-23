import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

const CreateEmployee = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    // Placeholder for multi-step form logic
    return (
        <div className="page-container">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} /> Volver
                </button>
                <h1>Nuevo Empleado - Paso {step} de 4</h1>
            </div>

            <div className="wizard-card">
                <p>Formulario multi-paso en construcción...</p>
                <button className="primary-btn" onClick={() => navigate('/employees')}>
                    <Save size={18} /> Guardar (Simulado)
                </button>
            </div>
        </div>
    );
};

export default CreateEmployee;
