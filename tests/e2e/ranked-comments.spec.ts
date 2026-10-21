import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireComment, wireReview, wireUser, wirePage } from '../http-fixtures';

const root={commentId:81,reviewId:55,gameId:12,parentCommentId:null,text:'Um comentário antigo que voltou à conversa.',createdAt:'2020-01-01T12:00:00Z',author:wireReview.author,likeCount:8,periodLikeCount:3,lastLikeAt:'2026-10-16T12:00:00Z'};
const reply={...root,commentId:82,parentCommentId:81,text:'Uma resposta também participa do ranking.',author:{...root.author,id:2,displayName:'Leo'},likeCount:2,periodLikeCount:2};
let server:Server;
const selected=new Set<number>();
const queries:URLSearchParams[]=[];
const commands:{method:string;body:string;bearer:boolean}[]=[];
let publicBearer=false;

test.beforeAll(async()=>{
  server=createServer(async(request,response)=>{
    response.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5181');
    response.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
    response.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
    response.setHeader('Content-Type','application/json');
    if(request.method==='OPTIONS'){response.statusCode=204;response.end();return;}
    const url=new URL(request.url??'/','http://127.0.0.1:5096');const path=url.pathname;
    let body:unknown;
    if(path.endsWith('/auth/login'))body={token:'test-only',expiresAt:'2080-01-01T00:00:00Z',user:wireUser};
    else if(path.endsWith('/auth/me'))body=wireUser;
    else if(path.endsWith('/auth/logout')){response.statusCode=204;response.end();return;}
    else if(path.endsWith('/comments/most-liked')){
      queries.push(url.searchParams);publicBearer ||= !!request.headers.authorization;
      const page=Number(url.searchParams.get('page'));const pageSize=Number(url.searchParams.get('pageSize'));
      const items=page===1?[root,reply].filter(item=>!selected.has(-item.commentId)):[{...reply,commentId:83,parentCommentId:null,text:'Comentário da segunda página.'}];
      body={items,page,pageSize,hasNextPage:page===1};
    }else if(/\/comments\/\d+\/like\/me$/.test(path))body={likedByMe:selected.has(Number(path.split('/')[4]))};
    else if(/\/comments\/\d+\/like$/.test(path)){
      let text='';for await(const chunk of request)text+=chunk;
      commands.push({method:request.method??'',body:text,bearer:!!request.headers.authorization});
      const id=Number(path.split('/')[4]);
      if(request.method==='PUT'){selected.add(id);selected.delete(-id);}else{selected.delete(id);selected.add(-id);}
      response.statusCode=204;response.end();return;
    }else if(path.endsWith('/reviews/55'))body=wireReview;
    else if(path.endsWith('/reviews/55/comments'))body=[{...wireComment,text:root.text}, {...wireComment,id:82,parentCommentId:81,userId:2,author:reply.author,text:reply.text}];
    else if(path.endsWith('/games'))body=wirePage();
    else if(path.endsWith('/games/filters'))body={genres:[],platforms:[]};
    else if(path.endsWith('/favorites'))body={games:[],reviews:[]};
    else if(path.includes('/favorites/'))body={favorite:null};
    else if(path.endsWith('/dashboard'))body={favorites:{games:[],reviews:[]},feed:[]};
    else if(path.endsWith('/like/me'))body={likedByMe:false};
    else body=[];
    response.end(JSON.stringify(body));
  });
  server.listen(5096,'127.0.0.1');await once(server,'listening');
});
test.afterAll(async()=>{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});
test.beforeEach(()=>{selected.clear();selected.add(81);queries.length=0;commands.length=0;publicBearer=false;});

for(const [name,width] of [['desktop',1280],['mobile',390]] as const){
  test(`${name}: consulta pública, navegação ao comentário e unlike revalida ranking`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/comunidade');await page.getByRole('button',{name:'Comentários curtidos',exact:true}).click();
    const section=page.getByRole('region',{name:'Comentários mais curtidos',exact:true});
    await expect(section.getByText(root.text)).toBeVisible();
    await expect(section.getByText('3 curtidas no período',{exact:true})).toBeVisible();
    await expect(section.getByText('8 curtidas no total',{exact:true})).toBeVisible();
    await expect(section.getByRole('button',{name:/curtir|curtida/i})).toHaveCount(0);
    await page.getByLabel('Comentários por página').selectOption('10');
    await page.getByLabel('Período dos rankings').selectOption('24h');
    await expect(section.getByText('Exibindo 2 comentários · até 10 por página')).toBeVisible();
    await section.getByRole('button',{name:'Próxima',exact:true}).click();
    await expect(section.getByText('Comentário da segunda página.')).toBeVisible();
    await page.getByLabel('Período dos rankings').selectOption('30d');
    await expect(section.getByText(root.text)).toBeVisible();
    expect(Object.fromEntries(queries.at(-1)!)).toEqual({period:'30d',page:'1',pageSize:'10'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await mkdir('docs/evidence',{recursive:true});
    await section.screenshot({path:`docs/evidence/S-PR-13-${name}-guest.png`});
    await section.getByRole('link',{name:'Abrir review do comentário de Leo'}).click();
    await expect(page).toHaveURL(/\/reviews\/55#comentario-82$/);
    await expect(page.locator('#comentario-82')).toBeFocused();
    await expect(page.locator('#comentario-82')).toHaveCSS('outline-style','solid');
    await page.getByRole('link',{name:'Entrar',exact:true}).click();
    await page.getByLabel('E-mail',{exact:true}).fill('ranking@example.test');
    await page.getByLabel('Senha',{exact:true}).fill('test-only');
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await expect(page.getByLabel('Usuário conectado')).toHaveText('Ana');
    await page.getByRole('link',{name:'Comunidade',exact:true}).click();
    await page.getByRole('button',{name:'Comentários curtidos',exact:true}).click();
    await section.getByRole('button',{name:'Retirar curtida do comentário de Ana'}).click();
    await expect(section.getByText(root.text)).toHaveCount(0);
    await expect(section.getByText(reply.text)).toBeVisible();
    await expect(section.getByText('Exibindo 1 comentário · até 20 por página')).toBeVisible();
    expect(commands).toEqual([{method:'DELETE',body:'',bearer:true}]);expect(publicBearer).toBe(false);
    await section.screenshot({path:`docs/evidence/S-PR-13-${name}-unlike.png`});
  });
}
