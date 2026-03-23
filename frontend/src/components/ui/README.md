# UI Primitives

This folder contains reusable primitives for the AXIS design system:

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

The visual token source is:

- `frontend/src/styles/global.css`
- `frontend/src/styles/ui-primitives.css`

## Usage

```jsx
import { Button, Card, PageHeader } from '../components/ui';

const Example = () => (
  <>
    <PageHeader title="Directorio" subtitle="Gestión de empleados" />
    <Card title="Acciones">
      <Button>Nuevo</Button>
    </Card>
  </>
);
```
