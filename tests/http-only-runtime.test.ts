import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import type { FetchTransport } from '../src/services/http/client';
function sourceFiles(directory:string):string[]{return readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>entry.isDirectory()?sourceFiles(resolve(directory,entry.name)):[resolve(directory,entry.name)]);}
test('produção não contém mocks, demo ou dependência indireta de doubles',()=>{
 const files=sourceFiles(resolve('src'));expect(files.some((path)=>path.includes('mocks')||path.endsWith('FoundationPreview.tsx'))).toBe(false);
 const source=files.filter((path)=>/\.tsx?$/.test(path)).map((path)=>readFileSync(path,'utf8')).join('\n');expect(source).not.toMatch(/from\s+['"][^'"]*(?:mocks|tests)[^'"]*['"]/);expect(source).not.toContain('createMock');expect(source).not.toContain('gameFixtures');
});
test('runtime não expõe modo mock e nenhum contrato retorna fixture quando API falha',async()=>{
 const runtime=await vi.importActual<typeof import('../src/services/runtime')>('../src/services/runtime');expect(runtime).not.toHaveProperty('createApplicationServices');expect(runtime).not.toHaveProperty('readServiceConfig');const transport=vi.fn<FetchTransport>().mockRejectedValue(new Error('offline'));const services=runtime.createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport});await expect(services.games.list()).rejects.toMatchObject({kind:'network'});await expect(services.community.getOpinions('game-1')).rejects.toMatchObject({kind:'network'});
});
test('opiniões do contrato legado também usam HTTP sem fallback',async()=>{const runtime=await vi.importActual<typeof import('../src/services/runtime')>('../src/services/runtime');const services=runtime.createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport:async()=>{throw new Error('offline');}});await expect(services.community.getOpinions('game-1')).rejects.toMatchObject({kind:'network'});});
