import { expect, test } from 'vitest';
import { decodeProfileCompletion, decodeProfileUpdate } from '../src/services/http/decoders';
import { wireUser } from './http-fixtures';
const completion = { country:null,state:null,bio:'',avatarUrl:null,favoriteGameIds:[],favoriteGameCount:0,isComplete:false };
test.each(['11',-1,1.5,0])('conclusão rejeita ID inválido %s', id => { expect(()=>decodeProfileCompletion({...completion,favoriteGameIds:[id],favoriteGameCount:1})).toThrow(); });
test.each([0,2,3,6])('PATCH aceita resumo com %s favoritos sem impor conclusão', count => { const data={...completion,favoriteGameIds:Array.from({length:count},(_,i)=>i+1),favoriteGameCount:count}; expect(decodeProfileUpdate({...wireUser,completion:data}).completion).toEqual(data); });
test.each([undefined,{...completion,favoriteGameIds:[1,1],favoriteGameCount:2},{...completion,isComplete:true},{...completion,bio:'inconsistente'}])('PATCH rejeita completion ausente/inválida %j', data=>{expect(()=>decodeProfileUpdate({...wireUser,completion:data})).toThrow();});
test('legado preservado e conclusão calculada sem avatar',()=>{const data={...completion,country:'País antigo',state:'Região',bio:'Bio',favoriteGameIds:[1,2,3],favoriteGameCount:3,isComplete:true};expect(decodeProfileUpdate({...wireUser,bio:'Bio',completion:data}).completion).toEqual(data);});
