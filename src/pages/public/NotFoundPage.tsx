import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-semibold text-zinc-500">Erreur 404</p>
      <h1 className="mt-2 text-2xl font-bold">Page introuvable</h1>
      <Link to="/" className="mt-6 inline-block">
        <Button>Retour à l'accueil</Button>
      </Link>
    </div>
  );
}
