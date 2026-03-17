# UI Primitives (Phase 1)

This folder contains the initial UI primitives for the design system:

- `Button`
- `InputField`
- `PageHeader`
- `Card`
- `Badge`
- `Alert`
- `StatusView`
- `ThemeToggle`
- `Table` primitives (`TableShell`, `Table`, `TableHead`, `TableRow`, etc.)

## Token source

Tailwind theme tokens are defined in:

- `frontend/tailwind.config.js`
- `frontend/src/styles/global.css`

## Usage

```jsx
import { Button, Card, PageHeader } from '../components/ui';

const Example = () => (
  <>
    <PageHeader title="Directorio" subtitle="Gestion de empleados" />
    <Card title="Acciones">
      <Button>Nuevo</Button>
    </Card>
  </>
);
```
