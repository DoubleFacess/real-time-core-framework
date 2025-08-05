import AuthForm from '../../components/AuthForm';

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 32 }}>
      <h2>Login / Registrazione</h2>
      <AuthForm />
    </div>
  );
}
