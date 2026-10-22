import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionProvider';
import { useServices } from '../services/ServiceProvider';
import { Modal } from '../components/Modal';
import { ForumForm } from '../components/ForumForm';

function TopicModalTrigger({ gameId }: { gameId: number }) {
  const { http } = useServices(), navigate = useNavigate();
  const [open, setOpen] = useState(false), trigger = useRef<HTMLButtonElement | null>(null), sending = useRef(false);
  const close = useCallback(() => setOpen(false), []);
  return <><button type="button" ref={trigger} onClick={() => setOpen(true)}>Criar tópico</button>
    {open && <Modal title="Criar tópico" closeLabel="Fechar criação de tópico" trigger={trigger.current} sending={sending} onClose={close}>
      <ForumForm topic sending={sending} onCancel={close} onSubmit={async (input, signal) => {
        if (!http) throw new Error('HTTP indisponível');
        const topic = await http().forum.createTopic(gameId, input, signal);
        if (!signal.aborted) navigate(`/jogos/${gameId}/forum/${topic.id}`);
      }} />
    </Modal>}
  </>;
}
export function CreateForumTopic({ gameId }: { gameId: number }) {
  const { user, version } = useSession();
  return user ? <TopicModalTrigger key={`${version}-${user.id}`} gameId={gameId} /> : <Link to="/login">Entrar para criar tópico</Link>;
}
