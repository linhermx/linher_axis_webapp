export const mockDepartments = [
    {
        microsip_department_id: 'DEP-ADM',
        name: 'Administracion',
        is_active: true,
    },
    {
        microsip_department_id: 'DEP-RH',
        name: 'Recursos Humanos',
        is_active: true,
    },
    {
        microsip_department_id: 'DEP-OPS',
        name: 'Operaciones',
        is_active: true,
    },
];

export const mockJobTitles = [
    {
        microsip_job_title_id: 'JOB-HR-MANAGER',
        name: 'Gerente RH',
        is_active: true,
    },
    {
        microsip_job_title_id: 'JOB-HR-ANALYST',
        name: 'Analista RH',
        is_active: true,
    },
    {
        microsip_job_title_id: 'JOB-OPS-LEAD',
        name: 'Lider de Operaciones',
        is_active: true,
    },
];

export const mockEmployees = [
    {
        microsip_employee_id: 'EMP-0001',
        employee_number: '0001',
        first_name: 'Joel',
        last_name: 'Rosas',
        department_id: 'DEP-RH',
        job_title_id: 'JOB-HR-MANAGER',
        employment_status: 'active',
        hired_at: '2022-06-14',
        terminated_at: null,
    },
    {
        microsip_employee_id: 'EMP-0002',
        employee_number: '0002',
        first_name: 'Laura',
        last_name: 'Jimenez',
        department_id: 'DEP-RH',
        job_title_id: 'JOB-HR-ANALYST',
        employment_status: 'active',
        hired_at: '2023-02-10',
        terminated_at: null,
    },
    {
        microsip_employee_id: 'EMP-0003',
        employee_number: '0003',
        first_name: 'Carlos',
        last_name: 'Garcia',
        department_id: 'DEP-OPS',
        job_title_id: 'JOB-OPS-LEAD',
        employment_status: 'active',
        hired_at: '2021-11-01',
        terminated_at: null,
    },
];
