import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { RatedReviewForm } from '../src/components/RatedReviewForm';
import { createMockCommunityService } from './doubles/communityService';
import type { User } from '../src/models';
const ana: User = { id: 1, displayName: 'Ana', username: 'ana', bio: '', avatarUrl: null };
// Cobertura do adaptador legado, que não é mais chamado pelos controles da UI.
test.each([0, 5, 2.5])('compatibilidade do serviço aceita nota %s', async value => {
  expect(await createMockCommunityService().rate(1, value, ana)).toMatchObject({ gameId: 1, userId: ana.id, value });
});
test.each([-1, 6, NaN, Infinity])('serviço rejeita nota %s', async value => {
  await expect(createMockCommunityService().rate(1, value, ana)).rejects.toMatchObject({ code: 'invalid-rating' });
});
test('serviço exige sessão', async () => {
  await expect(createMockCommunityService().rate(1, 3, null)).rejects.toMatchObject({ code: 'session-required' });
});
test('serviço recupera nota por usuário/jogo sem expor referência mutável', async () => {
  const service = createMockCommunityService(); await service.rate(1, 5, ana);
  const saved = await service.getRating(1, ana); if(saved) saved.value=0;
  expect((await service.getRating(1,ana))?.value).toBe(5);
  expect((await service.getRating(2,ana))?.value).toBe(0);
  await expect(service.getRating(1,null)).rejects.toMatchObject({code:'session-required'});
});
function open(initialRating: number | null = null, save = vi.fn(async () => {})) {
  render(<RatedReviewForm initialRating={initialRating} submitLabel="Publicar review" pendingLabel="Publicando…" failureMessage="Falha ao publicar." onSubmit={save} onCancel={vi.fn()} />);
  return save;
}
test('nota começa sem seleção e zero precisa ser escolhido', async () => {
  const save=open(); fireEvent.submit(screen.getByRole('form'));
  expect(save).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('radio',{name:'0 estrelas'})); fireEvent.submit(screen.getByRole('form'));
  expect(save).toHaveBeenCalledWith({rating:0,title:null,text:''});
});
test('estrelas permitem seleção por teclado no formulário único', async () => {
  const save=open(); const interaction=userEvent.setup();
  await interaction.click(screen.getByRole('radio',{name:'2 estrelas'})); await interaction.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio',{name:'3 estrelas'})).toBeChecked();
  fireEvent.submit(screen.getByRole('form')); expect(save).toHaveBeenCalledWith({rating:3,title:null,text:''});
});
test('falha preserva escolha e descrição', async () => {
  open(null,vi.fn(async()=>{throw new Error('offline')}));
  await userEvent.click(screen.getByRole('radio',{name:'5 estrelas'})); fireEvent.change(screen.getByLabelText('Descrição (opcional)'),{target:{value:'Rascunho'}});
  fireEvent.change(screen.getByLabelText('Título'),{target:{value:'Título do rascunho'}});
  fireEvent.submit(screen.getByRole('form')); expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao publicar.');
  expect(screen.getByRole('radio',{name:'5 estrelas'})).toBeChecked(); expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue('Rascunho');
});
test.each([0,4.25,5])('reabrir com nota %s mantém a seleção ao reenviar', initialRating => {
  const save=open(initialRating); fireEvent.submit(screen.getByRole('form')); expect(save).toHaveBeenCalledWith({rating:initialRating,title:null,text:''});
});
