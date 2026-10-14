import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, withAuthentication } from './http-fixtures';
test('following false/true, PUT idempotente e DELETE 204 sem body usam sessão',async()=>{
  const session=createHttpSessionStore();session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});
  const transport=vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json({following:false})).mockResolvedValueOnce(Response.json({following:true})).mockResolvedValueOnce(Response.json({following:true})).mockResolvedValueOnce(Response.json({following:true})).mockResolvedValueOnce(new Response(null,{status:204}));
  const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{session,transport}).community;
  expect(await service.isFollowing('other%2Fid',wireUser)).toBe(false);expect(await service.setFollowing('other%2Fid',true,{...wireUser,id:'forged'})).toBe(true);expect(await service.setFollowing('other%2Fid',true,wireUser)).toBe(true);expect(await service.isFollowing('other%2Fid',wireUser)).toBe(true);expect(await service.setFollowing('other%2Fid',false,wireUser)).toBe(false);
  for(const [url,init]of transport.mock.calls){expect(url).toContain('/users/other%252Fid/follow');expect(init.body).toBeUndefined();expect(init.headers).toHaveProperty('Authorization','Bearer test-only');}
});
test('visitante não envia identidade; 404 da relação é erro tipado',async()=>{
  const session=createHttpSessionStore();const transport=vi.fn<FetchTransport>().mockResolvedValue(Response.json({code:'not_found',message:'Seguro'},{status:404}));const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{session,transport}).community;
  await expect(service.setFollowing('other',true,wireUser)).rejects.toMatchObject({code:'session-required'});expect(transport).not.toHaveBeenCalled();session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});await expect(service.isFollowing('other',wireUser)).rejects.toMatchObject({code:'not-found'});
});
async function open(failure=false){let following=false;const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url,init)=>{
  if(new URL(url).pathname==='/api/v1/games')return Response.json([]);
  if(url.endsWith('/follow/me'))return Response.json({following});
  if(url.endsWith('/follow')){if(failure)throw new Error('offline');following=init.method==='PUT';return following?Response.json({following}):new Response(null,{status:204});}
  if(url.endsWith('/followers'))return Response.json(following?[wireUser]:[]);
  if(url.endsWith('/following')||url.endsWith('/reviews'))return Response.json([]);
  return Response.json({...wireUser,id:'user-1',displayName:'Outro'});
}));const interaction=userEvent.setup();render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport})}/></MemoryRouter>);
await interaction.type(screen.getByLabelText('E-mail'),'test@example.com');await interaction.type(screen.getByLabelText('Senha'),'test-only');await interaction.click(screen.getByRole('button',{name:'Entrar'}));await interaction.click(await screen.findByRole('link',{name:'Perfil de exemplo'}));return {interaction,transport};}
test('seguir/deixar segue resposta da API e refresca conexões',async()=>{
  const {interaction,transport}=await open();await interaction.click(await screen.findByRole('button',{name:'Seguir Outro'}));expect(await screen.findByRole('button',{name:'Deixar de seguir Outro'})).toHaveAttribute('aria-pressed','true');expect(await within(screen.getByRole('region',{name:'Seguidores'})).findByRole('link',{name:'Ana'})).toBeVisible();
  await interaction.click(screen.getByRole('button',{name:'Deixar de seguir Outro'}));expect(await screen.findByRole('button',{name:'Seguir Outro'})).toHaveAttribute('aria-pressed','false');expect(await screen.findByText('Nenhum seguidor.')).toBeVisible();expect(transport.mock.calls.filter(([url])=>url.endsWith('/followers'))).toHaveLength(3);
});
test('erro mantém relação false e não fabrica conexões',async()=>{const {interaction}=await open(true);await interaction.click(await screen.findByRole('button',{name:'Seguir Outro'}));expect(await screen.findByText('Não foi possível atualizar a relação. Tente novamente.')).toBeVisible();expect(screen.getByRole('button',{name:'Seguir Outro'})).toHaveAttribute('aria-pressed','false');expect(screen.getByText('Nenhum seguidor.')).toBeVisible();});
