import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {wireGame,wireReview,wirePage} from '../http-fixtures';
const game={...wireGame,id:13,title:'Ratatan: Digital Deluxe Edition',summary:'Uma aventura musical com ritmo, exploração e batalhas para compartilhar.',coverUrl:null};
const review={...wireReview,gameId:13,game:{id:13,title:game.title,coverUrl:null}};
for(const width of [1280,768,375])for(const entry of ['review','inicio']){
 test(`${width}px via ${entry}: aviso stale não desloca colunas e retry recupera layout`,async({page})=>{
  await page.setViewportSize({width,height:900});let reads=0;let stale=true;
  await page.route('**/api/v1/**',async route=>{
   const path=new URL(route.request().url()).pathname;let data:unknown=[];let headers:Record<string,string>={};
   if(path==='/api/v1/games/filters')data={genres:[],platforms:[]};
   else if(path==='/api/v1/games')data=wirePage([game]);
   else if(path==='/api/v1/reviews/55')data=review;
   else if(path==='/api/v1/games/13'){data=game;reads++;headers={'X-Catalog-Stale':stale?'true':'false','X-Catalog-Fetched-At':'2026-10-16T14:53:00Z'};}
   else if(path==='/api/v1/games/13/opinions')data={averageRating:2,reviews:[review]};
   await route.fulfill({status:200,contentType:'application/json',headers:{...headers,'Access-Control-Expose-Headers':'X-Catalog-Stale,X-Catalog-Fetched-At'},body:JSON.stringify(data)});
  });
  await page.goto(entry==='review'?'/reviews/55':'/');
  await page.getByRole('link',{name:game.title,exact:true}).click();
  await expect(page.getByRole('heading',{name:game.title,exact:true})).toBeVisible();
  const notice=page.getByRole('complementary',{name:'Atualização do catálogo'});await expect(notice).toBeVisible();
  const poster=await page.locator('.game-poster').boundingBox();const overview=await page.locator('.game-overview').boundingBox();const banner=await notice.boundingBox();
  expect(poster).not.toBeNull();expect(overview).not.toBeNull();expect(banner).not.toBeNull();
  expect(banner!.y+banner!.height).toBeLessThanOrEqual(poster!.y);
  expect(overview!.x).toBeGreaterThanOrEqual(poster!.x+poster!.width);
  expect(Math.abs(overview!.y-poster!.y)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await mkdir('docs/evidence',{recursive:true});if(entry==='review')await page.screenshot({path:`docs/evidence/FIX-game-stale-${width}.png`,fullPage:true});
  const initialReads=reads;stale=false;
  await notice.getByRole('button',{name:'Consultar novamente'}).click();await expect(notice).toHaveCount(0);
  const fresh=await page.locator('.game-overview').boundingBox();expect(fresh!.x).toBeCloseTo(overview!.x,0);expect(fresh!.width).toBeCloseTo(overview!.width,0);expect(reads).toBe(initialReads+1);
 });
}
