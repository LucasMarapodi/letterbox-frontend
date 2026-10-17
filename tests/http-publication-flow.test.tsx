import { withFilterOptions } from './http-fixtures';
import { wirePage } from './http-fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireGame, wireReview, withAuthentication } from './http-fixtures';
test('publicação envia rating e text, usa token e distingue wrapper null de recurso 404',async()=>{
  const session=createHttpSessionStore(); session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});
  const transport=vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json({review:null})).mockResolvedValueOnce(Response.json(wireReview,{status:201})).mockResolvedValueOnce(Response.json([wireReview])).mockResolvedValueOnce(Response.json({code:'not_found',message:'Seguro'},{status:404}));
  const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{ transport: withFilterOptions(transport),session}).community;
  expect(await service.findOwnReview(wireGame.id,wireUser)).toBeNull();
  expect(await service.publish(wireGame.id, { rating: 4.5, text: 'Review' },{...wireUser,id: 999})).toEqual(wireReview);
  expect(transport.mock.calls[1][1].body).toBe('{"rating":4.5,"text":"Review"}'); expect(transport.mock.calls[1][1].headers).toHaveProperty('Authorization','Bearer test-only');
  expect(await service.getGameReviews(wireGame.id)).toEqual([wireReview]); expect(transport.mock.calls[2][1].headers).not.toHaveProperty('Authorization');
  await expect(service.findOwnReview(99,wireUser)).rejects.toMatchObject({code:'not-found'});
});
async function open(transport:FetchTransport):Promise<ReturnType<typeof userEvent.setup>>{
  const interaction=userEvent.setup(); render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{ transport: withFilterOptions(transport)})}/></MemoryRouter>);
  await interaction.type(screen.getByLabelText('E-mail'),'test@example.com'); await interaction.type(screen.getByLabelText('Senha'),'test-only'); await interaction.click(screen.getByRole('button',{name:'Entrar'})); await interaction.click(await screen.findByRole('link',{name:wireGame.title})); const action=await screen.findByRole('button',{name:/^(Criar review|Editar minha review)$/}); if(action.textContent==='Criar review'){await interaction.click(action); await interaction.click(screen.getByRole('radio',{name:'4 estrelas'})); await interaction.type(screen.getByLabelText('Título'),'Minha aventura');} return interaction;
}
function backend(options:{conflict?:boolean;failure?:boolean;own?:boolean}={}):ReturnType<typeof vi.fn<FetchTransport>>{
  let published=Boolean(options.own);
  return vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url,init)=>{
    if(new URL(url).pathname==='/api/v1/games') return Response.json(wirePage([wireGame]));
    if(url.endsWith('/rating/me')) return Response.json({rating:null});
    if(url.endsWith('/reviews/me')) return Response.json({review:published?wireReview:null});
    if(url.endsWith('/reviews')&&init.method==='POST'){
      if(options.failure) throw new Error('offline'); published=true;
      return options.conflict?Response.json({code:'conflict',message:'Seguro'},{status:409}):Response.json(wireReview,{status:201});
    }
    if(url.endsWith('/reviews')) return Response.json([wireReview]);
    if(url.endsWith('/opinions')) return Response.json({averageRating:published?4.5:null,reviews:published?[wireReview]:[]});
    return Response.json(wireGame);
  }));
}
test('publicação revalida opiniões e média sem outra escrita',async()=>{
  const transport=backend(); const interaction=await open(transport);
  await interaction.type(await screen.findByLabelText('Descrição (opcional)'),'Review'); await interaction.click(screen.getByRole('button',{name:'Publicar review'}));
  expect(await screen.findByText('Review publicada.')).toBeVisible(); expect(await screen.findByRole('link',{name:'Review de Ana'})).toBeVisible();
  expect(screen.getByRole('button',{name:'Editar minha review'})).toBeVisible();
  expect(transport.mock.calls.filter(([url])=>url.endsWith('/opinions'))).toHaveLength(2);
  expect(transport.mock.calls.filter(([url,init])=>url.endsWith('/reviews')&&init.method==='GET')).toHaveLength(0);
  expect(screen.getByText('Nota média: 4,5 de 5')).toBeVisible();
});
test('409 consulta review própria e oferece edição, sem declarar publicação nova',async()=>{
  const transport=backend({conflict:true}); const interaction=await open(transport);
  await interaction.type(await screen.findByLabelText('Descrição (opcional)'),'Rascunho'); await interaction.click(screen.getByRole('button',{name:'Publicar review'}));
  expect(await screen.findByRole('button',{name:'Editar minha review'})).toBeVisible(); expect(screen.getByText('Você já tem uma review para este jogo.')).toBeVisible();
  expect(screen.queryByText('Review publicada.')).not.toBeInTheDocument(); expect(transport.mock.calls.filter(([url])=>url.endsWith('/reviews/me'))).toHaveLength(2);
});
test('review própria existente não mostra publicação; falha de POST preserva rascunho',async()=>{
  const transport=backend({failure:true}); const interaction=await open(transport);
  await interaction.type(await screen.findByLabelText('Descrição (opcional)'),'Rascunho'); await interaction.click(screen.getByRole('button',{name:'Publicar review'}));
  expect(await screen.findByText('Não foi possível publicar a review. Tente novamente.')).toBeVisible(); expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue('Rascunho');
});
test('review existente vem de reviews/me e bloqueia nova publicação',async()=>{
  const transport=backend({own:true}); await open(transport);
  expect(await screen.findByRole('button',{name:'Editar minha review'})).toBeVisible(); expect(screen.queryByRole('button',{name:'Publicar review'})).not.toBeInTheDocument();
});
