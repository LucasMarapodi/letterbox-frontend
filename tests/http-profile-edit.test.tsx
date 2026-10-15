import { wirePage } from './http-fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import type { PublicUserResponse } from '../src/services/http/dtos';
import { wireUser, withAuthentication } from './http-fixtures';
import { deferred } from './fixtures';
const initial = {...wireUser,avatarUrl:'https://example.test/old.png'};
async function open(status?:number,other=false){
  let profile: PublicUserResponse=initial;
  const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url,init)=>{
    if(new URL(url).pathname==='/api/v1/games')return Response.json(wirePage([]));
    if(new URL(url).pathname==='/api/v1/favorites')return Response.json({games:[],reviews:[]});
    if(url.endsWith('/follow/me'))return Response.json({following:false});
    if(url.endsWith('/profile')&&init.method==='PATCH'){
      if(status===0)throw new Error('offline');if(status)return Response.json({code:status===401?'unauthorized':'validation_failed',message:'Seguro'},{status});
      profile={...wireUser,displayName:'Ana atualizada',bio:'Nova bio',avatarUrl:null};return Response.json(profile);
    }
    if(url.endsWith('/reviews')||url.endsWith('/followers')||url.endsWith('/following'))return Response.json([]);
    return Response.json(other?{...profile,id: 2}:profile);
  }));
  const interaction=userEvent.setup();render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport})}/></MemoryRouter>);
  await interaction.type(screen.getByLabelText('E-mail'),'test@example.com');await interaction.type(screen.getByLabelText('Senha'),'test-only');await interaction.click(screen.getByRole('button',{name:'Entrar'}));await interaction.click(await screen.findByRole('link',{name:other?'Perfil de exemplo':'Meu perfil'}));await screen.findByRole('heading',{name:'Ana',level:2});return {interaction,transport};
}
test('formulário PATCH atualiza perfil/navbar e limpar avatar envia null',async()=>{
  const {interaction,transport}=await open();await interaction.clear(await screen.findByLabelText('Nome de exibição'));await interaction.type(screen.getByLabelText('Nome de exibição'),'Ana atualizada');await interaction.type(screen.getByLabelText('Biografia'),'Nova bio');await interaction.clear(screen.getByLabelText('URL do avatar'));await interaction.click(screen.getByRole('button',{name:'Salvar perfil'}));
  expect(await screen.findByText('Perfil atualizado.')).toBeVisible();expect(await screen.findByRole('heading',{name:'Ana atualizada',level:2})).toBeVisible();expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Ana atualizada');
  const call=transport.mock.calls.find(([,init])=>init.method==='PATCH');expect(call?.[1].body).toBe('{"displayName":"Ana atualizada","bio":"Nova bio","avatarUrl":null}');expect(call?.[1].headers).toHaveProperty('Authorization','Bearer test-only');
});
test('campos não modificados são omitidos',async()=>{const {interaction,transport}=await open();await interaction.type(await screen.findByLabelText('Biografia'),'Nova bio');await interaction.click(screen.getByRole('button',{name:'Salvar perfil'}));await screen.findByText('Perfil atualizado.');expect(transport.mock.calls.find(([,init])=>init.method==='PATCH')?.[1].body).toBe('{"bio":"Nova bio"}');});
test.each([400,0])('falha %s preserva valores sem sucesso',async(status)=>{const {interaction}=await open(status);await interaction.type(await screen.findByLabelText('Biografia'),'rascunho');await interaction.click(screen.getByRole('button',{name:'Salvar perfil'}));expect(await screen.findByRole('alert')).toHaveTextContent(status===400?'Verifique os dados do perfil.':'Não foi possível atualizar o perfil. Tente novamente.');expect(screen.getByLabelText('Biografia')).toHaveValue('rascunho');expect(screen.queryByText('Perfil atualizado.')).not.toBeInTheDocument();});
test('nome vazio é rejeitado antes de PATCH',async()=>{const {interaction,transport}=await open();await interaction.clear(await screen.findByLabelText('Nome de exibição'));await interaction.click(screen.getByRole('button',{name:'Salvar perfil'}));expect(await screen.findByRole('alert')).toHaveTextContent('Nome');expect(transport.mock.calls.some(([,init])=>init.method==='PATCH')).toBe(false);});
test('outro usuário não vê edição',async()=>{await open(undefined,true);expect(screen.queryByRole('button',{name:'Salvar perfil'})).not.toBeInTheDocument();});
test('401 remove editor/sessão e não declara sucesso',async()=>{const {interaction}=await open(401);await interaction.type(await screen.findByLabelText('Biografia'),'rascunho');await interaction.click(screen.getByRole('button',{name:'Salvar perfil'}));expect(await screen.findByText('Sua sessão expirou. Entre novamente.')).toBeVisible();expect(screen.queryByRole('button',{name:'Salvar perfil'})).not.toBeInTheDocument();expect(screen.queryByText('Perfil atualizado.')).not.toBeInTheDocument();});
test('PATCH tardio após logout não restaura perfil nem sessão',async()=>{
  const pending=deferred<Response>();const transport=withAuthentication(async(url,init)=>init.method==='PATCH'?pending.promise:url.endsWith('/auth/logout')?new Response(null,{status:204}):Response.json([]));
  const {auth}=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport});await auth.login({email:'test@example.com',password:'test-only'});const edit=auth.editProfile;if(!edit)throw new Error('Edição de perfil HTTP ausente.');const result=edit({bio:'rascunho'}).catch((error:unknown)=>error);await auth.logout?.();pending.resolve(Response.json({...wireUser,bio:'rascunho'}));expect(await result).toMatchObject({kind:'cancelled'});expect(auth.sessionUser?.()).toBeNull();
});
