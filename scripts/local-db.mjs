import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function localDB(path){
 const sql=new DatabaseSync(path);
 if(!sql.prepare("SELECT name FROM sqlite_master WHERE name='orders'").get())sql.exec(readFileSync('drizzle/0000_orders.sql','utf8'));
 return {
  prepare(query){
   const statement=sql.prepare(query);
   return {async first(){return statement.get()||null;},async all(){return {results:statement.all()};},async run(){const r=statement.run();return {meta:{changes:Number(r.changes)}};},bind(...values){
    return {
     async first(){return statement.get(...values)||null;},
     async all(){return {results:statement.all(...values)};},
     async run(){const r=statement.run(...values);return {meta:{changes:Number(r.changes)}};}
    };
   }};
  },
  close(){sql.close();}
 };
}
