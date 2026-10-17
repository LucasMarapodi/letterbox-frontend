import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireGame, wirePage, wireReview, wireUser } from '../http-fixtures';

let server:Server;
let review:typeof wireReview|null=null;
const commands:{method:string;body:unknown;bearer:boolean}[]=[];
const other={...wireReview,id:56,userId:2,title:'Outra jornada',author:{...wireReview.author,id:2,displayName:'Leo'},createdAt:'2020-01-01T00:00:00Z'};
const reviews=()=>review?.title?[review,other]:[other,...(review?[review]:[])];
test.beforeAll(async()=>{
  server=createServer(async(request,response)=>{
    response.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5184');response.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');response.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,PUT,DELETE,OPTIONS');response.setHeader('Content-Type','application/json');
    if(request.method==='OPTIONS'){response.statusCode=204;response.end();return;}
    const path=new URL(request.url??'/','http://127.0.0.1:5094').pathname;let body:unknown;
    if(path.endsWith('/auth/login'))body={user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'};
    else if(path.endsWith('/auth/me'))body=wireUser;
    else if((request.method==='POST'&&path.endsWith('/games/12/reviews'))||(request.method==='PATCH'&&path.endsWith('/reviews/55'))){
      let raw='';for await(const chunk of request)raw+=chunk;
      const input=JSON.parse(raw) as {rating:number;text:string;title:string|null};commands.push({method:request.method??'',body:input,bearer:!!request.headers.authorization});
      const title=input.title?.trim()||null;const text=input.text.trim();
      if((text&&!title)||(title&&title.length>150)){response.statusCode=400;body={code:title?'review_title_too_long':'review_title_required',message:'Conteúdo inválido.'};}
      else{review={...wireReview,...input,title,text};body=review;response.statusCode=request.method==='POST'?201:200;}
    }else if(path.endsWith('/games/12'))body={...wireGame,averageRating:review?.rating??null};
    else if(path.endsWith('/games/12/reviews/me'))body={review};
    else if(path.endsWith('/games/12/opinions'))body={averageRating:review?.rating??null,reviews:reviews()};
    else if(path.endsWith('/reviews/55'))body=review;
    else if(path.endsWith('/games'))body=wirePage([wireGame]);
    else if(path.endsWith('/games/filters'))body={genres:[],platforms:[]};
    else if(path.endsWith('/recent')||path.endsWith('/feed/following'))body=reviews();
    else if(path.endsWith('/favorites'))body={games:[],reviews:[]};
    else if(path.includes('/favorites/'))body={favorite:null};
    else if(path.endsWith('/dashboard'))body={favorites:{games:[],reviews:[]},feed:[]};
    else if(path.endsWith('/like/me'))body={likedByMe:false};
    else body=[];
    response.end(JSON.stringify(body));
  });server.listen(5094,'127.0.0.1');await once(server,'listening');
});
test.afterAll(async()=>{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});
test.beforeEach(()=>{review=null;commands.length=0;});

for(const [name,width]of [['desktop',1280],['mobile',390]]as const){
  test(`${name}: nota zero, título condicional, edição, limpeza e listagens`,async({page})=>{
    await page.setViewportSize({width,height:950});await page.goto('/login');
    await page.getByLabel('E-mail',{exact:true}).fill('title@example.test');await page.getByLabel('Senha',{exact:true}).fill('test-only');await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await expect(page.getByLabel('Usuário conectado')).toHaveText('Ana');await page.getByRole('link',{name:'Jogo HTTP',exact:true}).click();
    await page.getByRole('button',{name:'Criar review',exact:true}).click();await page.getByRole('radio',{name:'0 estrelas',exact:true}).check();
    await page.getByRole('button',{name:'Publicar review',exact:true}).click();await expect(page.getByText('Review publicada.',{exact:true})).toBeVisible();
    expect(commands).toEqual([{method:'POST',body:{rating:0,title:null,text:''},bearer:true}]);
    await page.getByRole('link',{name:'Comunidade',exact:true}).click();
    const recent=page.getByRole('region',{name:'Reviews recentes',exact:true});await expect(recent.locator('.review-card-link').first()).toHaveAttribute('href','/reviews/56');
    await recent.getByRole('link',{name:'Ler review',exact:true}).nth(1).click({position:{x:8,y:8}});await expect(page).toHaveURL(/\/reviews\/55$/);
    await page.getByRole('button',{name:'Editar minha review',exact:true}).click();const form=page.getByRole('form',{name:'Salvar review',exact:true});
    await expect(form.getByLabel('Título',{exact:true})).toHaveValue('');await expect(form.getByRole('radio',{name:'0 estrelas',exact:true})).toBeChecked();
    await form.getByLabel('Descrição (opcional)',{exact:true}).fill('Uma experiência que merece ser compartilhada.');await form.getByRole('button',{name:'Salvar review',exact:true}).click();
    await expect(form.getByText('Informe um título quando houver descrição.',{exact:true})).toBeVisible();expect(commands).toHaveLength(1);
    await form.getByLabel('Título',{exact:true}).fill('x'.repeat(151));await form.getByRole('button',{name:'Salvar review',exact:true}).click();await expect(form.getByText('Título deve ter até 150 caracteres.',{exact:true})).toBeVisible();expect(commands).toHaveLength(1);
    const title='Uma aventura inesquecível '.repeat(5).trim();await form.getByLabel('Título',{exact:true}).fill(`  ${title}  `);await form.getByRole('button',{name:'Salvar review',exact:true}).click();
    await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();expect(commands[1]).toEqual({method:'PATCH',body:{rating:0,title,text:'Uma experiência que merece ser compartilhada.'},bearer:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await mkdir('docs/evidence',{recursive:true});await page.locator('.review-details').screenshot({path:`docs/evidence/S-PR-37-${name}-title.png`});
    await page.getByRole('link',{name:'Comunidade',exact:true}).click();await expect(recent.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(recent.locator('.review-card-link').first()).toHaveAttribute('href','/reviews/55');
    await recent.locator('.review-card-link').first().click({position:{x:8,y:8}});await page.getByRole('button',{name:'Editar minha review',exact:true}).click();await expect(form.getByLabel('Título',{exact:true})).toHaveValue(title);
    await form.getByLabel('Título',{exact:true}).fill('');await form.getByRole('button',{name:'Salvar review',exact:true}).click();expect(commands).toHaveLength(2);await expect(form.getByLabel('Descrição (opcional)',{exact:true})).toHaveValue('Uma experiência que merece ser compartilhada.');
    await form.getByLabel('Descrição (opcional)',{exact:true}).fill('');await form.getByRole('button',{name:'Salvar review',exact:true}).click();await expect(page.getByText('Review atualizada.',{exact:true})).toBeVisible();await expect(page.locator('.review-title')).toHaveCount(0);
    expect(commands[2]).toEqual({method:'PATCH',body:{rating:0,title:null,text:''},bearer:true});
    await page.getByRole('button',{name:'Editar minha review',exact:true}).click();await form.getByLabel('Título',{exact:true}).fill('Somente um título');await form.getByRole('button',{name:'Salvar review',exact:true}).click();await expect(page.getByRole('heading',{name:'Somente um título',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Editar minha review',exact:true}).click();await form.getByLabel('Título',{exact:true}).fill('Rascunho cancelado');await form.getByRole('button',{name:'Cancelar',exact:true}).click();expect(commands).toHaveLength(4);await expect(page.getByRole('heading',{name:'Somente um título',exact:true})).toBeVisible();
  });
}
